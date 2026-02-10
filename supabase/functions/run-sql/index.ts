import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes('run-fix-2026')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));

  if (body.action === 'update') {
    const { table, data, match } = body;
    const { data: result, error } = await supabase.from(table).update(data).match(match);
    return new Response(JSON.stringify({ result, error: error?.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (body.action === 'sql') {
    const { query } = body;
    if (!query) return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
    const { data: result, error } = await supabase.rpc('exec_sql', { query });
    // Fallback: use raw postgres if rpc not available
    if (error?.message?.includes('exec_sql')) {
      // Use supabase-js to run via REST - not available for DDL
      return new Response(JSON.stringify({ error: 'exec_sql function not available. Use Supabase SQL Editor.' }), { status: 400 });
    }
    return new Response(JSON.stringify({ result, error: error?.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
});
