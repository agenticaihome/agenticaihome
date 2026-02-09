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
    const body = await req.json()
    const { action, payload, signature, address, nonce } = body

    if (!action || !payload || !address || !nonce) {
      return res(400, { error: 'Missing required fields: action, payload, address, nonce' })
    }

    // Reject internal-only actions
    if (action === 'update-ego') {
      return res(403, { error: 'This action is not available from public API' })
    }

    // Validate Ergo address
    if (!isValidErgoAddress(address)) {
      return res(400, { error: 'Invalid Ergo address format' })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    )

    // Verify challenge nonce
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('nonce', nonce)
      .eq('address', address)
      .eq('used', false)
      .single()

    if (challengeError || !challenge) {
      return res(401, { error: 'Invalid or expired challenge nonce' })
    }

    // Check expiry
    if (new Date(challenge.expires_at) < new Date()) {
      return res(401, { error: 'Challenge nonce has expired' })
    }

    // Mark nonce as used (prevent replay)
    await supabase.from('challenges').update({ used: true }).eq('id', challenge.id)

    // Store signature for audit trail (we validate address format + nonce for now;
    // full cryptographic verification can be added when a Deno-compatible Ergo
    // signature verification library becomes available)
    const auditInfo = { address, signature: signature || null, nonce }

    // Dispatch action
    let result
    switch (action) {
      case 'create-agent':
        result = await handleCreateAgent(supabase, payload, address)
        break
      case 'update-agent':
        result = await handleUpdateAgent(supabase, payload, address)
        break
      case 'create-task':
        result = await handleCreateTask(supabase, payload, address)
        break
      case 'update-task':
        result = await handleUpdateTask(supabase, payload, address)
        break
      case 'create-bid':
        result = await handleCreateBid(supabase, payload)
        break
      case 'create-deliverable':
        result = await handleCreateDeliverable(supabase, payload)
        break
      default:
        return res(400, { error: `Unknown action: ${action}` })
    }

    return res(200, { success: true, data: result })
  } catch (err) {
    return res(500, { error: err.message })
  }
})

function res(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidErgoAddress(address: string): boolean {
  if (!address || address.length < 30 || address.length > 120) return false
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
}

function sanitize(text: string, maxLen: number): string {
  return (text || '').slice(0, maxLen).replace(/<[^>]*>/g, '')
}

// ---- Action Handlers ----

async function handleCreateAgent(supabase: any, payload: any, ownerAddress: string) {
  // Check duplicate ergo_address
  if (payload.ergoAddress) {
    const { count } = await supabase.from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('ergo_address', payload.ergoAddress)
    if (count && count > 0) throw new Error('An agent with this Ergo address already exists.')
  }

  const id = crypto.randomUUID()
  const agent = {
    id,
    name: sanitize(payload.name, 100),
    description: sanitize(payload.description, 2000),
    skills: (payload.skills || []).map((s: string) => sanitize(s, 50)).filter((s: string) => s).slice(0, 20),
    hourly_rate_erg: Math.max(0.1, Math.min(10000, Number(payload.hourlyRateErg) || 1)),
    ergo_address: payload.ergoAddress || '',
    owner_address: ownerAddress,
    ego_score: 50,
    tasks_completed: 0,
    rating: 0,
    status: 'available',
    created_at: new Date().toISOString(),
    probation_completed: false,
    probation_tasks_remaining: 5,
    suspended_until: null,
    anomaly_score: 0,
    max_task_value: 10,
    velocity_window: { count: 0, windowStart: new Date().toISOString() },
    tier: 'newcomer',
    disputes_won: 0,
    disputes_lost: 0,
    consecutive_disputes_lost: 0,
    completion_rate: 0,
    last_activity_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('agents').insert(agent).select().single()
  if (error) throw error
  return data
}

async function handleUpdateAgent(supabase: any, payload: any, address: string) {
  const { id, ...updates } = payload
  if (!id) throw new Error('Agent id is required')

  // Verify ownership
  const { data: existing } = await supabase.from('agents').select('owner_address').eq('id', id).single()
  if (!existing) throw new Error('Agent not found')
  if (existing.owner_address !== address) throw new Error('Only the owner can update this agent')

  // Map camelCase to snake_case for allowed fields
  const allowed: Record<string, string> = {
    name: 'name', description: 'description', skills: 'skills',
    hourlyRateErg: 'hourly_rate_erg', status: 'status', avatar: 'avatar',
  }
  const dbUpdates: Record<string, unknown> = {}
  for (const [key, col] of Object.entries(allowed)) {
    if (updates[key] !== undefined) dbUpdates[col] = updates[key]
  }

  const { data, error } = await supabase.from('agents').update(dbUpdates).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function handleCreateTask(supabase: any, payload: any, creatorAddress: string) {
  const id = crypto.randomUUID()
  const task = {
    id,
    title: sanitize(payload.title, 200),
    description: sanitize(payload.description, 5000),
    skills_required: (payload.skillsRequired || []).map((s: string) => sanitize(s, 50)).filter((s: string) => s).slice(0, 10),
    budget_erg: Math.max(0.1, Math.min(100000, Number(payload.budgetErg) || 1)),
    creator_address: creatorAddress,
    creator_name: payload.creatorName ? sanitize(payload.creatorName, 100) : null,
    status: 'open',
    bids_count: 0,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) throw error
  return data
}

async function handleUpdateTask(supabase: any, payload: any, address: string) {
  const { id, ...updates } = payload
  if (!id) throw new Error('Task id is required')

  // Verify ownership
  const { data: existing } = await supabase.from('tasks').select('creator_address').eq('id', id).single()
  if (!existing) throw new Error('Task not found')
  if (existing.creator_address !== address) throw new Error('Only the creator can update this task')

  const allowed: Record<string, string> = {
    title: 'title', description: 'description', skillsRequired: 'skills_required',
    budgetErg: 'budget_erg', status: 'status', assignedAgentId: 'assigned_agent_id',
    assignedAgentName: 'assigned_agent_name', escrowTxId: 'escrow_tx_id', metadata: 'metadata',
  }
  const dbUpdates: Record<string, unknown> = {}
  for (const [key, col] of Object.entries(allowed)) {
    if (updates[key] !== undefined) dbUpdates[col] = updates[key]
  }

  const { data, error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function handleCreateBid(supabase: any, payload: any) {
  const id = crypto.randomUUID()
  const bid = {
    id,
    task_id: payload.taskId,
    agent_id: payload.agentId,
    agent_name: sanitize(payload.agentName, 100),
    agent_ego_score: Math.max(0, Math.min(100, Number(payload.agentEgoScore) || 0)),
    proposed_rate: Math.max(0.1, Math.min(10000, Number(payload.proposedRate) || 1)),
    message: sanitize(payload.message, 1000),
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('bids').insert(bid).select().single()
  if (error) throw error

  // Increment bid count
  const { data: task } = await supabase.from('tasks').select('bids_count').eq('id', payload.taskId).single()
  if (task) {
    await supabase.from('tasks').update({ bids_count: (task.bids_count || 0) + 1 }).eq('id', payload.taskId)
  }

  return data
}

async function handleCreateDeliverable(supabase: any, payload: any) {
  if (payload.deliverableUrl && !payload.deliverableUrl.startsWith('https://')) {
    throw new Error('Deliverable URL must start with https://')
  }

  const id = crypto.randomUUID()
  const deliverable = {
    id,
    task_id: payload.taskId,
    agent_id: payload.agentId,
    content: sanitize(payload.content, 5000),
    deliverable_url: payload.deliverableUrl || null,
    status: 'pending',
    revision_number: payload.revisionNumber || 1,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('deliverables').insert(deliverable).select().single()
  if (error) throw error
  return data
}
