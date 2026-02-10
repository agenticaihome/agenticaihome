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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    )

    // SECURITY FIX: Generate a more secure nonce and implement rate limiting
    const nonce = crypto.randomUUID() + '-' + Date.now() + '-' + Math.random().toString(36)

    // Rate limiting: Check for recent challenges from same address (prevent spam)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('address', address)
      .gte('created_at', oneMinuteAgo)

    if (count && count >= 10) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Too many challenge requests from this address. Please wait before requesting a new challenge.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase.from('challenges').insert({
      address,
      nonce,
      used: false,  // Track nonce usage
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()  // 10 minutes
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
