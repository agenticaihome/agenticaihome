import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// SECURITY FIX: This function has been disabled due to critical security vulnerabilities
// It allowed direct database updates bypassing all business logic and authorization checks
// All updates must now go through the secure verify-and-write endpoint

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://agenticaihome.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ 
    error: 'This endpoint has been disabled for security reasons. Use /verify-and-write for all updates.' 
  }), {
    status: 410, // Gone
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});