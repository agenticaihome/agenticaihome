import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Reduce an unsigned transaction server-side using ergo-lib-wasm-nodejs.
 * This runs in Deno edge function — we import from npm.
 */
async function reduceTransactionServerSide(
  unsignedTx: any,
  inputBoxes: any[]
): Promise<string> {
  // Import ergo-lib-wasm for Deno
  const ergo = await import('npm:ergo-lib-wasm-nodejs@0.28.0')

  // Convert unsigned tx from EIP-12 JSON
  const tx = ergo.UnsignedTransaction.from_json(JSON.stringify(unsignedTx))

  // Convert input boxes — ensure values are strings
  const normalizedBoxes = inputBoxes.map((box: any) => ({
    boxId: box.boxId,
    transactionId: box.transactionId,
    index: box.index,
    ergoTree: box.ergoTree,
    creationHeight: box.creationHeight,
    value: String(box.value),
    assets: (box.assets || []).map((a: any) => ({
      tokenId: a.tokenId,
      amount: String(a.amount),
    })),
    additionalRegisters: box.additionalRegisters || {},
  }))
  
  const boxes = ergo.ErgoBoxes.from_boxes_json(normalizedBoxes)
  const dataInputBoxes = ergo.ErgoBoxes.from_boxes_json([])

  // Fetch last 10 block headers for state context
  const headersRes = await fetch('https://node.ergo.watch/blocks/lastHeaders/10')
  if (!headersRes.ok) {
    throw new Error('Failed to fetch block headers from Ergo node')
  }
  const headers = await headersRes.json()

  const blockHeaders = ergo.BlockHeaders.from_json(headers)
  const preHeader = ergo.PreHeader.from_block_header(blockHeaders.get(0))
  const parameters = new ergo.Parameters()
  const stateContext = new ergo.ErgoStateContext(preHeader, blockHeaders, parameters)

  // Reduce the transaction
  const reduced = ergo.ReducedTransaction.from_unsigned_tx(
    tx,
    boxes,
    dataInputBoxes,
    stateContext
  )

  // Sigma-serialize to bytes
  const bytes = reduced.sigma_serialize_bytes()

  // Convert to Base64 URL-safe encoding
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const url = new URL(req.url)

  try {
    // POST: Create a new ErgoPay request
    // Client sends { unsignedTx, inputBoxes, address, message }
    // Server reduces the tx and stores it
    if (req.method === 'POST') {
      const { unsignedTx, inputBoxes, reducedTx: clientReducedTx, address, message } = await req.json()

      if (!address) {
        return new Response(
          JSON.stringify({ error: 'address is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let reducedTx = clientReducedTx || null

      // If client didn't provide reduced tx, do it server-side
      if (!reducedTx && unsignedTx && inputBoxes?.length > 0) {
        try {
          reducedTx = await reduceTransactionServerSide(unsignedTx, inputBoxes)
        } catch (err) {
          console.error('Server-side tx reduction failed:', err)
          return new Response(
            JSON.stringify({ error: `Transaction reduction failed: ${err instanceof Error ? err.message : 'Unknown error'}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      if (!reducedTx) {
        return new Response(
          JSON.stringify({ error: 'Could not reduce transaction. Provide unsignedTx + inputBoxes or reducedTx.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('ergopay_requests')
        .insert({
          reduced_tx: reducedTx,
          unsigned_tx: unsignedTx || null,
          address,
          message: message || 'Sign transaction for AgenticAiHome',
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const requestId = data.id
      const ergoPayUrl = `ergopay://thjialaevqwyiyyhbdxk.supabase.co/functions/v1/ergopay?id=${requestId}`

      return new Response(
        JSON.stringify({ requestId, ergoPayUrl }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET: Serve ErgoPay signing request to wallet (Terminus fetches this)
    if (req.method === 'GET') {
      const requestId = url.searchParams.get('id')

      if (!requestId) {
        return new Response(
          JSON.stringify({ error: 'id parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('ergopay_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (data.status === 'signed') {
        return new Response(
          JSON.stringify({ status: 'signed', txId: data.tx_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check expiry (1 hour)
      const createdAt = new Date(data.created_at).getTime()
      if (Date.now() - createdAt > 3600000) {
        return new Response(
          JSON.stringify({ error: 'Request expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // EIP-20 ErgoPaySigningRequest format
      return new Response(
        JSON.stringify({
          reducedTx: data.reduced_tx,
          address: data.address,
          message: data.message || 'Sign transaction for AgenticAiHome',
          messageSeverity: 'INFORMATION',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Update status (wallet signed)
    if (req.method === 'PATCH') {
      const { requestId, status, txId } = await req.json()

      if (!requestId) {
        return new Response(
          JSON.stringify({ error: 'requestId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: Record<string, string> = { status: status || 'signed' }
      if (txId) updateData.tx_id = txId

      const { error } = await supabase
        .from('ergopay_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
