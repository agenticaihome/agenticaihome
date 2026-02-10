import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://thjialaevqwyiyyhbdxk.supabase.co'
export const supabaseAnonKey = 'sb_publishable_d700Fgssg8ldOkwnLamEcg_g4fPKv8q' // nosecret - publishable key, safe for frontend

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ---- Edge Function helpers for authenticated writes ----

export const EDGE_FUNCTION_BASE = `${supabaseUrl}/functions/v1`

export interface WalletAuth {
  address: string
  nonce: string
  signature?: string
}

/**
 * Request a challenge nonce for the given address.
 * The caller must sign the returned message with their wallet.
 */
export async function requestChallenge(address: string): Promise<{
  challengeId: string
  nonce: string
  expiresAt: string
  message: string
}> {
  const resp = await fetch(`${EDGE_FUNCTION_BASE}/request-challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ address }),
  })
  if (!resp.ok) {
    const err = await resp.json()
    throw new Error(err.error || 'Failed to request challenge')
  }
  return resp.json()
}

/**
 * Call the verify-and-write Edge Function with a signed challenge.
 */
export async function verifiedWrite<T = unknown>(
  action: string,
  payload: Record<string, unknown>,
  auth: WalletAuth,
): Promise<T> {
  const resp = await fetch(`${EDGE_FUNCTION_BASE}/verify-and-write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action,
      payload,
      address: auth.address,
      nonce: auth.nonce,
      signature: auth.signature || null,
    }),
  })
  const body = await resp.json()
  if (!resp.ok) {
    throw new Error(body.error || 'Edge function call failed')
  }
  return body.data as T
}
