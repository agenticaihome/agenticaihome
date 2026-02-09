import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address } = await req.json()

    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate Ergo P2PK address format
    if (!isValidErgoAddress(address)) {
      return new Response(JSON.stringify({ error: 'Invalid Ergo address format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Generate a random nonce
    const nonce = crypto.randomUUID() + '-' + Date.now()

    const { data, error } = await supabase.from('challenges').insert({
      address,
      nonce,
    }).select('id, nonce, expires_at').single()

    if (error) throw error

    return new Response(JSON.stringify({
      challengeId: data.id,
      nonce: data.nonce,
      expiresAt: data.expires_at,
      message: `Sign this message to prove ownership of ${address}: ${data.nonce}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function isValidErgoAddress(address: string): boolean {
  if (!address || address.length < 30 || address.length > 120) return false
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
}
