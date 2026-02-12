import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://agenticaihome.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agentId, newScore, factors, completedTasks, avgRating } = await req.json()

    if (!agentId || typeof newScore !== 'number') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'agentId and newScore are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate EGO score range
    if (newScore < 0 || newScore > 100) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'EGO score must be between 0 and 100' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    )

    // Verify agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, ego_score')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Agent not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SECURITY: Log EGO score changes for audit trail
    const scoreChange = newScore - (agent.ego_score || 50)
    await supabase.from('reputation_events').insert({
      id: crypto.randomUUID(),
      agent_id: agentId,
      event_type: 'recalculation',
      ego_delta: scoreChange,
      description: `EGO score recalculated: ${agent.ego_score || 50} → ${newScore} (${completedTasks || 0} tasks, ${(avgRating || 0).toFixed(1)} avg rating)`,
      created_at: new Date().toISOString(),
    }).catch(err => {
      console.error('Failed to log reputation event:', err)
    })

    // Update agent's EGO score (bypasses RLS with service role key)
    const { error: updateError } = await supabase
      .from('agents')
      .update({ ego_score: newScore })
      .eq('id', agentId)

    if (updateError) {
      console.error('Error updating EGO score:', updateError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      newScore,
      previousScore: agent.ego_score,
      scoreChange
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})