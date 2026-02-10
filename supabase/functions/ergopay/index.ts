import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const url = new URL(req.url)

  try {
    // POST: Store a new ErgoPay request
    // Client sends { reducedTx (base64url string), address, message }
    // The client performs tx reduction using ergo-lib-wasm-browser
    if (req.method === 'POST') {
      const { reducedTx, address, message, unsignedTx } = await req.json()

      if (!address) {
        return new Response(
          JSON.stringify({ error: 'address is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!reducedTx && !unsignedTx) {
        return new Response(
          JSON.stringify({ error: 'reducedTx or unsignedTx is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('ergopay_requests')
        .insert({
          reduced_tx: reducedTx || null,
          unsigned_tx: unsignedTx || null,
          address,
          message: message || 'Sign transaction with Terminus',
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

      // If already signed, return status
      if (data.status === 'signed') {
        return new Response(
          JSON.stringify({ status: 'signed', txId: data.tx_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if expired (older than 1 hour)
      const createdAt = new Date(data.created_at).getTime()
      if (Date.now() - createdAt > 3600000) {
        return new Response(
          JSON.stringify({ error: 'Request expired' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // EIP-20 ErgoPay response format
      // Terminus expects: { reducedTx (base64url sigma-serialized bytes), address, message, messageSeverity }
      const response: Record<string, unknown> = {
        reducedTx: data.reduced_tx,
        address: data.address,
        message: data.message || 'Sign transaction for AgenticAiHome',
        messageSeverity: 'INFORMATION',
      }

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Update status (e.g., mark as signed) - for polling
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
