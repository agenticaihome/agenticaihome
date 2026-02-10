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

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
});
