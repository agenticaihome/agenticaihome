import { supabase, requestChallenge, verifiedWrite, type WalletAuth, supabaseUrl, supabaseAnonKey, EDGE_FUNCTION_BASE } from './supabase';
import { createClient } from '@supabase/supabase-js';

// SECURITY FIX: Service client removed from client-side code to prevent key exposure
// EGO score updates now handled via secure edge functions only
// This prevents direct service role key access from browser environment
import { Agent, Task, Bid, Transaction, Completion, ReputationEvent, WalletProfile, User } from './types';
import { sanitizeText, sanitizeSkill, sanitizeNumber, sanitizeErgoAddress } from './sanitize';
import { computeEgoScore, type EgoFactors } from './ego';
import { getTotalEgoScore } from './ergo/ego-token';

export { requestChallenge } from './supabase';
export type { WalletAuth } from './supabase';

export type { User, WalletProfile } from './types';

// ---- Helpers: camelCase <-> snake_case mapping ----

function agentToDb(a: Partial<Agent>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (a.id !== undefined) m.id = a.id;
  if (a.name !== undefined) m.name = a.name;
  if (a.description !== undefined) m.description = a.description;
  if (a.skills !== undefined) m.skills = a.skills;
  if (a.hourlyRateErg !== undefined) m.hourly_rate_erg = a.hourlyRateErg;
  if (a.ergoAddress !== undefined) m.ergo_address = a.ergoAddress;
  if (a.ownerAddress !== undefined) m.owner_address = a.ownerAddress;
  if (a.egoScore !== undefined) m.ego_score = a.egoScore;
  if (a.tasksCompleted !== undefined) m.tasks_completed = a.tasksCompleted;
  if (a.rating !== undefined) m.rating = a.rating;
  if (a.status !== undefined) m.status = a.status;
  if (a.avatar !== undefined) m.avatar = a.avatar;
  if (a.createdAt !== undefined) m.created_at = a.createdAt;
  if (a.probationCompleted !== undefined) m.probation_completed = a.probationCompleted;
  if (a.probationTasksRemaining !== undefined) m.probation_tasks_remaining = a.probationTasksRemaining;
  if (a.suspendedUntil !== undefined) m.suspended_until = a.suspendedUntil;
  if (a.anomalyScore !== undefined) m.anomaly_score = a.anomalyScore;
  if (a.maxTaskValue !== undefined) m.max_task_value = a.maxTaskValue;
  if (a.velocityWindow !== undefined) m.velocity_window = a.velocityWindow;
  if (a.tier !== undefined) m.tier = a.tier;
  if (a.disputesWon !== undefined) m.disputes_won = a.disputesWon;
  if (a.disputesLost !== undefined) m.disputes_lost = a.disputesLost;
  if (a.consecutiveDisputesLost !== undefined) m.consecutive_disputes_lost = a.consecutiveDisputesLost;
  if (a.completionRate !== undefined) m.completion_rate = a.completionRate;
  if (a.lastActivityAt !== undefined) m.last_activity_at = a.lastActivityAt;
  if (a.identityTokenId !== undefined) m.identity_token_id = a.identityTokenId;
  return m;
}

function dbToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    skills: (row.skills as string[]) || [],
    hourlyRateErg: Number(row.hourly_rate_erg) || 0,
    ergoAddress: (row.ergo_address as string) || '',
    ownerAddress: (row.owner_address as string) || '',
    egoScore: Number(row.ego_score) || 0,
    tasksCompleted: Number(row.tasks_completed) || 0,
    rating: Number(row.rating) || 0,
    status: (row.status as Agent['status']) || 'available',
    avatar: row.avatar as string | undefined,
    createdAt: (row.created_at as string) || '',
    probationCompleted: row.probation_completed as boolean | undefined,
    probationTasksRemaining: row.probation_tasks_remaining as number | undefined,
    suspendedUntil: row.suspended_until as string | null | undefined,
    anomalyScore: row.anomaly_score as number | undefined,
    maxTaskValue: row.max_task_value as number | undefined,
    velocityWindow: row.velocity_window as { count: number; windowStart: string } | undefined,
    tier: row.tier as Agent['tier'] | undefined,
    disputesWon: row.disputes_won as number | undefined,
    disputesLost: row.disputes_lost as number | undefined,
    consecutiveDisputesLost: row.consecutive_disputes_lost as number | undefined,
    completionRate: row.completion_rate as number | undefined,
    lastActivityAt: row.last_activity_at as string | undefined,
    identityTokenId: row.identity_token_id as string | undefined,
  };
}

function taskToDb(t: Partial<Task>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (t.id !== undefined) m.id = t.id;
  if (t.title !== undefined) m.title = t.title;
  if (t.description !== undefined) m.description = t.description;
  if (t.skillsRequired !== undefined) m.skills_required = t.skillsRequired;
  if (t.budgetErg !== undefined) m.budget_erg = t.budgetErg;
  if (t.status !== undefined) m.status = t.status;
  if (t.creatorAddress !== undefined) m.creator_address = t.creatorAddress;
  if (t.creatorName !== undefined) m.creator_name = t.creatorName;
  if (t.assignedAgentId !== undefined) m.assigned_agent_id = t.assignedAgentId;
  if (t.assignedAgentName !== undefined) m.assigned_agent_name = t.assignedAgentName;
  if (t.acceptedBidId !== undefined) m.accepted_bid_id = t.acceptedBidId;
  if (t.acceptedAgentAddress !== undefined) m.accepted_agent_address = t.acceptedAgentAddress;
  if (t.escrowTxId !== undefined) m.escrow_tx_id = t.escrowTxId;
  if (t.bidsCount !== undefined) m.bids_count = t.bidsCount;
  if (t.createdAt !== undefined) m.created_at = t.createdAt;
  if (t.completedAt !== undefined) m.completed_at = t.completedAt;
  return m;
}

function dbToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    skillsRequired: (row.skills_required as string[]) || [],
    budgetErg: Number(row.budget_erg) || 0,
    status: (row.status as Task['status']) || 'open',
    creatorAddress: (row.creator_address as string) || '',
    creatorName: row.creator_name as string | undefined,
    assignedAgentId: row.assigned_agent_id as string | undefined,
    assignedAgentName: row.assigned_agent_name as string | undefined,
    acceptedBidId: row.accepted_bid_id as string | undefined,
    acceptedAgentAddress: row.accepted_agent_address as string | undefined,
    escrowTxId: row.escrow_tx_id as string | undefined,
    bidsCount: Number(row.bids_count) || 0,
    createdAt: (row.created_at as string) || '',
    completedAt: row.completed_at as string | undefined,
    metadata: (row.metadata as Record<string, string>) || undefined,
  };
}

function bidToDb(b: Partial<Bid>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (b.id !== undefined) m.id = b.id;
  if (b.taskId !== undefined) m.task_id = b.taskId;
  if (b.agentId !== undefined) m.agent_id = b.agentId;
  if (b.agentName !== undefined) m.agent_name = b.agentName;
  if (b.agentEgoScore !== undefined) m.agent_ego_score = b.agentEgoScore;
  if (b.proposedRate !== undefined) m.proposed_rate = b.proposedRate;
  if (b.message !== undefined) m.message = b.message;
  if (b.status !== undefined) m.status = b.status;
  if (b.createdAt !== undefined) m.created_at = b.createdAt;
  return m;
}

function dbToBid(row: Record<string, unknown>): Bid {
  return {
    id: row.id as string,
    taskId: (row.task_id as string) || '',
    agentId: (row.agent_id as string) || '',
    agentName: (row.agent_name as string) || '',
    agentEgoScore: Number(row.agent_ego_score) || 0,
    proposedRate: Number(row.proposed_rate) || 0,
    message: (row.message as string) || '',
    status: (row.status as Bid['status']) || 'pending',
    createdAt: (row.created_at as string) || '',
  };
}

function dbToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    taskId: (row.task_id as string) || '',
    taskTitle: (row.task_title as string) || '',
    amountErg: Number(row.amount_erg) || 0,
    type: (row.type as Transaction['type']) || 'earned',
    date: (row.date as string) || '',
    txId: (row.tx_id as string) || '',
  };
}

function dbToCompletion(row: Record<string, unknown>): Completion {
  return {
    id: row.id as string,
    taskId: (row.task_id as string) || '',
    taskTitle: (row.task_title as string) || '',
    agentId: (row.agent_id as string) || '',
    rating: Number(row.rating) || 0,
    review: (row.review as string) || '',
    reviewerName: (row.reviewer_name as string) || '',
    reviewerId: row.reviewer_id as string | undefined,
    egoEarned: Number(row.ego_earned) || 0,
    ergPaid: Number(row.erg_paid) || 0,
    completedAt: (row.completed_at as string) || '',
  };
}

function dbToReputationEvent(row: Record<string, unknown>): ReputationEvent {
  return {
    id: row.id as string,
    agentId: (row.agent_id as string) || '',
    eventType: (row.event_type as ReputationEvent['eventType']) || 'completion',
    egoDelta: Number(row.ego_delta) || 0,
    description: (row.description as string) || '',
    createdAt: (row.created_at as string) || '',
  };
}

function dbToWalletProfile(row: Record<string, unknown>): WalletProfile {
  return {
    address: row.address as string,
    displayName: row.display_name as string | undefined,
    joinedAt: (row.joined_at as string) || '',
  };
}

// ---- ID generation (cryptographically random UUIDs) ----
function generateId(): string {
  return crypto.randomUUID();
}

// ---- Ergo address validation ----
function validateErgoAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  if (address.length < 30 || address.length > 120) return false;
  const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Pattern.test(address);
}

// ---- Data initialization (no-op, database starts empty) ----
async function initializeData(): Promise<void> {
  // No mock data seeding — database should contain only real user data
  return;
}

// ---- Wallet Profile Management ----

export async function getWalletProfiles(): Promise<WalletProfile[]> {
  await initializeData();
  const { data } = await supabase.from('wallet_profiles').select('*');
  return (data || []).map(dbToWalletProfile);
}

export async function getWalletProfile(address: string): Promise<WalletProfile | null> {
  await initializeData();
  const { data } = await supabase.from('wallet_profiles').select('*').eq('address', address).single();
  return data ? dbToWalletProfile(data) : null;
}

export async function createOrUpdateWalletProfile(address: string, displayName?: string): Promise<WalletProfile> {
  if (!validateErgoAddress(address)) {
    throw new Error('Invalid Ergo address format. Must be a valid P2PK address starting with 9.');
  }
  await initializeData();

  const existing = await getWalletProfile(address);
  if (existing) {
    if (displayName) {
      const { data } = await supabase.from('wallet_profiles')
        .update({ display_name: sanitizeText(displayName, 100) })
        .eq('address', address)
        .select()
        .single();
      return data ? dbToWalletProfile(data) : existing;
    }
    return existing;
  }

  const profile: WalletProfile = {
    address,
    displayName: displayName ? sanitizeText(displayName, 100) : undefined,
    joinedAt: new Date().toISOString(),
  };
  await supabase.from('wallet_profiles').insert({
    address: profile.address,
    display_name: profile.displayName,
    joined_at: profile.joinedAt,
  });
  return profile;
}

// ---- Agent Management ----

export async function getAgents(): Promise<Agent[]> {
  await initializeData();
  const { data } = await supabase.from('agents').select('*');
  return (data || []).map(dbToAgent);
}

export async function getAgentById(id: string): Promise<Agent | null> {
  await initializeData();
  const { data } = await supabase.from('agents').select('*').eq('id', id).single();
  return data ? dbToAgent(data) : null;
}

export async function createAgent(
  agentData: Omit<Agent, 'id' | 'ownerAddress' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>,
  ownerAddress: string
): Promise<Agent> {
  if (!validateErgoAddress(ownerAddress)) {
    throw new Error('Invalid owner address format. Must be a valid P2PK address starting with 9.');
  }
  if (agentData.ergoAddress && !validateErgoAddress(agentData.ergoAddress)) {
    throw new Error('Invalid Ergo address format. Must be a valid P2PK address starting with 9.');
  }
  await initializeData();

  const sanitizedData = {
    ...agentData,
    name: sanitizeText(agentData.name, 100),
    description: sanitizeText(agentData.description, 2000),
    skills: agentData.skills.map(sanitizeSkill).filter(s => s.length > 0).slice(0, 20),
    hourlyRateErg: sanitizeNumber(agentData.hourlyRateErg, 0.1, 10000),
    ergoAddress: sanitizeErgoAddress(agentData.ergoAddress),
  };

  // SECURITY FIX: Check duplicate ergo address
  const { count } = await supabase.from('agents').select('*', { count: 'exact', head: true }).eq('ergo_address', sanitizedData.ergoAddress);
  if (sanitizedData.ergoAddress && count && count > 0) {
    throw new Error('An agent with this Ergo address already exists.');
  }

  // SECURITY FIX: Limit agents per owner to prevent Sybil attacks
  const { count: ownerAgentCount } = await supabase.from('agents').select('*', { count: 'exact', head: true }).eq('owner_address', ownerAddress);
  if (ownerAgentCount && ownerAgentCount >= 3) {
    throw new Error('Maximum number of agents (3) reached for this wallet address. This prevents reputation system gaming.');
  }

  const newAgent: Agent = {
    ...sanitizedData,
    id: generateId(),
    ownerAddress,
    egoScore: 50,
    tasksCompleted: 0,
    rating: 0,
    status: 'available',
    createdAt: new Date().toISOString(),
    probationCompleted: false,
    probationTasksRemaining: 5,
    suspendedUntil: null,
    anomalyScore: 0,
    maxTaskValue: 10,
    velocityWindow: { count: 0, windowStart: new Date().toISOString() },
    tier: 'newcomer',
    disputesWon: 0,
    disputesLost: 0,
    consecutiveDisputesLost: 0,
    completionRate: 0,
    lastActivityAt: new Date().toISOString(),
  };

  await supabase.from('agents').insert(agentToDb(newAgent));
  return newAgent;
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  const { data } = await supabase.from('agents')
    .update(agentToDb(updates))
    .eq('id', id)
    .select()
    .single();
  return data ? dbToAgent(data) : null;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const { error } = await supabase.from('agents').delete().eq('id', id);
  return !error;
}

export async function getAgentsByOwner(ownerAddress: string): Promise<Agent[]> {
  await initializeData();
  const { data } = await supabase.from('agents').select('*').eq('owner_address', ownerAddress);
  return (data || []).map(dbToAgent);
}

// ---- Task Management ----

export async function getTasks(): Promise<Task[]> {
  await initializeData();
  const { data } = await supabase.from('tasks').select('*');
  return (data || []).map(dbToTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  await initializeData();
  const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
  return data ? dbToTask(data) : null;
}

export async function createTask(
  taskData: Omit<Task, 'id' | 'creatorAddress' | 'status' | 'bidsCount' | 'createdAt'>,
  creatorAddress: string
): Promise<Task> {
  if (!validateErgoAddress(creatorAddress)) {
    throw new Error('Invalid creator address format. Must be a valid P2PK address starting with 9.');
  }
  await initializeData();

  const sanitizedTaskData = {
    ...taskData,
    title: sanitizeText(taskData.title, 200),
    description: sanitizeText(taskData.description, 5000),
    skillsRequired: taskData.skillsRequired.map(sanitizeSkill).filter(s => s.length > 0).slice(0, 10),
    budgetErg: sanitizeNumber(taskData.budgetErg, 0.1, 100000),
    creatorAddress,
    creatorName: taskData.creatorName ? sanitizeText(taskData.creatorName, 100) : undefined,
  };

  const newTask: Task = {
    ...sanitizedTaskData,
    id: generateId(),
    status: 'open',
    bidsCount: 0,
    createdAt: new Date().toISOString(),
  };

  await supabase.from('tasks').insert(taskToDb(newTask));
  return newTask;
}

async function serviceUpdate(table: string, data: Record<string, unknown>, match: Record<string, string>): Promise<void> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_BASE}/task-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data, match }),
    });
    const result = await res.json();
    if (result.error) console.error(`serviceUpdate(${table}) error:`, result.error);
  } catch (err) {
    console.error(`serviceUpdate(${table}) failed:`, err);
    // Fallback to direct update
    await supabase.from(table).update(data).match(match);
  }
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const dbUpdates = taskToDb(updates);
  await serviceUpdate('tasks', dbUpdates, { id });
  // Re-fetch to return fresh data
  const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
  return data ? dbToTask(data) : null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  return !error;
}

export async function getTasksByCreator(creatorAddress: string): Promise<Task[]> {
  await initializeData();
  const { data } = await supabase.from('tasks').select('*').eq('creator_address', creatorAddress);
  return (data || []).map(dbToTask);
}

// ---- Bid Management ----

export async function getBids(): Promise<Bid[]> {
  await initializeData();
  const { data } = await supabase.from('bids').select('*');
  return (data || []).map(dbToBid);
}

export async function getBidsForTask(taskId: string): Promise<Bid[]> {
  await initializeData();
  const { data } = await supabase.from('bids').select('*').eq('task_id', taskId);
  return (data || []).map(dbToBid);
}

export async function getBidsForAgent(agentId: string): Promise<Bid[]> {
  await initializeData();
  const { data } = await supabase.from('bids').select('*').eq('agent_id', agentId);
  return (data || []).map(dbToBid);
}

export async function createBid(bidData: Omit<Bid, 'id' | 'createdAt'>): Promise<Bid> {
  const { notifyBidReceived } = await import('./notifications');
  const { logBidSubmitted } = await import('./taskEvents');
  await initializeData();
  const sanitizedBidData = {
    ...bidData,
    agentName: sanitizeText(bidData.agentName, 100),
    message: sanitizeText(bidData.message, 1000),
    proposedRate: sanitizeNumber(bidData.proposedRate, 0.1, 10000),
    agentEgoScore: sanitizeNumber(bidData.agentEgoScore, 0, 100),
  };

  const newBid: Bid = {
    ...sanitizedBidData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  await supabase.from('bids').insert(bidToDb(newBid));

  // Update task bid count
  const { data: taskData } = await supabase.from('tasks').select('bids_count, creator_address').eq('id', bidData.taskId).single();
  if (taskData) {
    await supabase.from('tasks').update({ bids_count: (taskData.bids_count || 0) + 1 }).eq('id', bidData.taskId);
    // Fire-and-forget notification
    // Get agent address for notification
    const { data: agentInfo } = await supabase.from('agents').select('ergo_address').eq('id', bidData.agentId).single();
    if (agentInfo?.ergo_address) {
      notifyBidReceived(bidData.taskId, taskData.creator_address, agentInfo.ergo_address).catch(() => {});
      logBidSubmitted(bidData.taskId, agentInfo.ergo_address, newBid.id, bidData.proposedRate).catch(() => {});
    }
  }

  return newBid;
}

export async function acceptBid(bidId: string): Promise<boolean> {
  const { notifyBidAccepted } = await import('./notifications');
  const { logBidAccepted } = await import('./taskEvents');
  const { data: bids } = await supabase.from('bids').select('*').eq('id', bidId).single();
  if (!bids) return false;
  const bid = dbToBid(bids);

  // Get agent's ergo address
  const { data: agentData } = await supabase.from('agents').select('ergo_address').eq('id', bid.agentId).single();
  const agentAddress = agentData?.ergo_address as string || '';

  // Update task with accepted bid info and transition to in_progress
  await serviceUpdate('tasks', {
    status: 'in_progress',
    assigned_agent_id: bid.agentId,
    assigned_agent_name: bid.agentName,
    accepted_bid_id: bid.id,
    accepted_agent_address: agentAddress,
  }, { id: bid.taskId });

  // Mark accepted bid, reject others
  await serviceUpdate('bids', { status: 'accepted' }, { id: bidId });
  // Reject other bids (can't use neq with serviceUpdate, use direct for this)
  await supabase.from('bids').update({ status: 'rejected' }).eq('task_id', bid.taskId).neq('id', bidId);

  // Minor EGO score boost for getting a bid accepted
  recalculateEgoScore(bid.agentId).catch(error => {
    console.error('Failed to recalculate EGO score after bid acceptance:', error);
  });

  // Fire-and-forget notification + event log
  notifyBidAccepted(bid.taskId, agentAddress).catch(() => {});
  logBidAccepted(bid.taskId, agentAddress, bidId, bid.agentName).catch(() => {});

  return true;
}

// ---- Task Status Transitions ----

export async function transitionTaskStatus(
  taskId: string,
  newStatus: string,
  actorAddress: string,
): Promise<{ success: boolean; error?: string; from?: string; to?: string }> {
  const { data, error } = await supabase.rpc('transition_task_status', {
    p_task_id: taskId,
    p_new_status: newStatus,
    p_actor_address: actorAddress,
  });

  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  
  // If task was successfully completed, recalculate the agent's EGO score
  if (data?.to === 'completed' && taskId) {
    const { data: taskData } = await supabase
      .from('tasks')
      .select('assigned_agent_id')
      .eq('id', taskId)
      .single();
      
    if (taskData?.assigned_agent_id) {
      // Fire-and-forget EGO score recalculation
      recalculateEgoScore(taskData.assigned_agent_id).catch(error => {
        console.error('Failed to recalculate EGO score after task completion:', error);
      });
    }
  }
  
  return { success: true, from: data?.from, to: data?.to };
}

// ---- Transaction Management ----

export async function getTransactions(): Promise<Transaction[]> {
  await initializeData();
  const { data } = await supabase.from('transactions').select('*');
  return (data || []).map(dbToTransaction);
}

export async function createTransaction(transactionData: Omit<Transaction, 'id'>): Promise<Transaction> {
  const newTx: Transaction = { ...transactionData, id: generateId() };
  await supabase.from('transactions').insert({
    id: newTx.id, task_id: newTx.taskId, task_title: newTx.taskTitle,
    amount_erg: newTx.amountErg, type: newTx.type, date: newTx.date, tx_id: newTx.txId,
  });
  return newTx;
}

// ---- Completion Management ----

export async function getCompletions(): Promise<Completion[]> {
  await initializeData();
  const { data } = await supabase.from('completions').select('*');
  return (data || []).map(dbToCompletion);
}

export async function getCompletionsForAgent(agentId: string): Promise<Completion[]> {
  await initializeData();
  const { data } = await supabase.from('completions').select('*').eq('agent_id', agentId);
  return (data || []).map(dbToCompletion);
}

export async function createCompletion(completionData: Omit<Completion, 'id'>): Promise<Completion> {
  const newCompletion: Completion = {
    ...completionData,
    id: generateId(),
    reviewerId: completionData.reviewerId || 'unknown',
  };
  await supabase.from('completions').insert({
    id: newCompletion.id, task_id: newCompletion.taskId, task_title: newCompletion.taskTitle,
    agent_id: newCompletion.agentId, rating: newCompletion.rating, review: newCompletion.review,
    reviewer_name: newCompletion.reviewerName, reviewer_id: newCompletion.reviewerId,
    ego_earned: newCompletion.egoEarned, erg_paid: newCompletion.ergPaid, completed_at: newCompletion.completedAt,
  });
  return newCompletion;
}

// ---- Reputation Events ----

export async function getReputationEvents(): Promise<ReputationEvent[]> {
  await initializeData();
  const { data } = await supabase.from('reputation_events').select('*');
  return (data || []).map(dbToReputationEvent);
}

export async function getReputationEventsForAgent(agentId: string): Promise<ReputationEvent[]> {
  await initializeData();
  const { data } = await supabase.from('reputation_events').select('*').eq('agent_id', agentId);
  return (data || []).map(dbToReputationEvent);
}

export async function createReputationEvent(eventData: Omit<ReputationEvent, 'id'>): Promise<ReputationEvent> {
  const newEvent: ReputationEvent = { ...eventData, id: generateId() };
  await supabase.from('reputation_events').insert({
    id: newEvent.id, agent_id: newEvent.agentId, event_type: newEvent.eventType,
    ego_delta: newEvent.egoDelta, description: newEvent.description, created_at: newEvent.createdAt,
  });
  return newEvent;
}

// ---- Search & Filter ----

export async function searchAgents(query: string = '', skills: string[] = []): Promise<Agent[]> {
  const agents = await getAgents();
  return agents.filter(agent => {
    const matchesQuery = !query ||
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.description.toLowerCase().includes(query.toLowerCase());
    const matchesSkills = skills.length === 0 ||
      skills.some(skill => agent.skills.includes(skill));
    return matchesQuery && matchesSkills;
  });
}

export async function searchTasks(query: string = '', skills: string[] = [], status?: Task['status']): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter(task => {
    const matchesQuery = !query ||
      task.title.toLowerCase().includes(query.toLowerCase()) ||
      task.description.toLowerCase().includes(query.toLowerCase());
    const matchesSkills = skills.length === 0 ||
      skills.some(skill => task.skillsRequired.includes(skill));
    const matchesStatus = !status || task.status === status;
    return matchesQuery && matchesSkills && matchesStatus;
  });
}

export async function getAllSkills(): Promise<string[]> {
  const agents = await getAgents();
  const tasks = await getTasks();
  const skillSet = new Set<string>();
  agents.forEach(a => a.skills.forEach(s => skillSet.add(s)));
  tasks.forEach(t => t.skillsRequired.forEach(s => skillSet.add(s)));
  return Array.from(skillSet).sort();
}

// ---- Legacy email/password auth REMOVED (security hardening 2026-02-09) ----
// The app uses wallet-based identity only. Plaintext password storage has been removed.
// createUser() and verifyPassword() are no longer available.

// ---- Deliverable Management ----

export async function createDeliverable(deliverable: {
  taskId: string;
  agentId: string;
  content: string;
  deliverableUrl?: string;
  revisionNumber: number;
}): Promise<{ id: string }> {
  const { notifyDeliverableSubmitted } = await import('./notifications');
  const { logDeliverableSubmitted } = await import('./taskEvents');
  // Validate deliverable URL if provided
  if (deliverable.deliverableUrl) {
    if (!deliverable.deliverableUrl.startsWith('https://')) {
      throw new Error('Deliverable URL must start with https://');
    }
  }
  const id = generateId();
  await supabase.from('deliverables').insert({
    id,
    task_id: deliverable.taskId,
    agent_id: deliverable.agentId,
    content: sanitizeText(deliverable.content, 5000),
    deliverable_url: deliverable.deliverableUrl || null,
    status: 'pending',
    revision_number: deliverable.revisionNumber,
    created_at: new Date().toISOString(),
  });

  // Fire-and-forget notification to task poster
  const { data: taskData } = await supabase.from('tasks').select('creator_address').eq('id', deliverable.taskId).single();
  if (taskData?.creator_address) {
    notifyDeliverableSubmitted(deliverable.taskId, taskData.creator_address).catch(() => {});
    logDeliverableSubmitted(deliverable.taskId, deliverable.agentId, id).catch(() => {});
  }

  return { id };
}

export async function updateDeliverableStatus(id: string, status: string): Promise<void> {
  await supabase.from('deliverables').update({ status }).eq('id', id);
}

export async function getDeliverablesForTask(taskId: string): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from('deliverables')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function updateAgentStats(agentId: string, egoDelta: number, description: string): Promise<void> {
  // Create reputation event
  await supabase.from('reputation_events').insert({
    id: generateId(),
    agent_id: agentId,
    event_type: 'completion',
    ego_delta: egoDelta,
    description: sanitizeText(description, 500),
    created_at: new Date().toISOString(),
  });

  // Update agent's EGO score and task count
  const { data: currentAgent } = await supabase
    .from('agents')
    .select('ego_score, tasks_completed')
    .eq('id', agentId)
    .single();

  if (currentAgent) {
    await supabase.from('agents').update({
      ego_score: currentAgent.ego_score + egoDelta,
      tasks_completed: currentAgent.tasks_completed + 1,
    }).eq('id', agentId);
  }
}

export async function updateTaskMetadata(taskId: string, metadata: Record<string, string>): Promise<void> {
  await serviceUpdate('tasks', { metadata }, { id: taskId });
}

export async function updateTaskEscrow(taskId: string, escrowTxId: string, metadata: Record<string, string>): Promise<void> {
  await serviceUpdate('tasks', { escrow_tx_id: escrowTxId, metadata }, { id: taskId });
}

// ============================================================
// EGO SCORE RECALCULATION SYSTEM
// This is where reputation scores are actually computed and stored
// ============================================================

/**
 * Recalculate an agent's EGO score based on real data from the database.
 * This function bypasses RLS restrictions using the service client.
 */
export async function recalculateEgoScore(agentId: string): Promise<{ success: boolean; newScore: number; error?: string }> {
  try {
    // Check if service client is properly configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, newScore: 0, error: 'Service role key not configured - cannot bypass RLS' };
    }
    // Get agent data
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('id, created_at, ergo_address')
      .eq('id', agentId)
      .single();

    if (agentError || !agentData) {
      return { success: false, newScore: 0, error: 'Agent not found' };
    }

    // Count completed tasks
    const { count: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .eq('status', 'completed');

    if (tasksError) {
      console.error('Error counting completed tasks:', tasksError);
    }

    // Get completion rate data
    const { count: totalAssignedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .in('status', ['completed', 'disputed', 'cancelled']);

    // ANTI-GAMING: Diversity-weighted rating with repeat-interaction dampening
    // Value-weighted (log scale) + repeat counterparty diminishing returns + min threshold
    const { data: diversityRating, error: ratingError } = await supabase
      .rpc('get_diversity_weighted_rating', { p_address: agentData.ergo_address });
    
    const avgRating = ratingError ? 3.0 : Number(diversityRating) || 3.0;
    
    // Count ratings from high-value tasks only (>= 0.5 ERG) for EGO score calculation
    const { count: validRatingsCount } = await supabase
      .from('ratings')
      .select('*', { count: 'exact', head: true })
      .eq('ratee_address', agentData.ergo_address)
      .gte('task_value_erg', 0.5); // Minimum task value threshold

    // Calculate account age in days
    const accountAge = Math.floor((Date.now() - new Date(agentData.created_at).getTime()) / (1000 * 60 * 60 * 24));

    // Count disputes (placeholder 0 for now as requested)
    const disputeCount = 0;
    
    // Get on-chain EGO tokens
    let onChainEgoTokens = 0n;
    if (agentData.ergo_address) {
      try {
        onChainEgoTokens = await getTotalEgoScore(agentData.ergo_address);
      } catch (error) {
        console.error('Error fetching on-chain EGO tokens:', error);
      }
    }

    // ANTI-GAMING: Get counterparty diversity (unique raters vs total ratings)
    const { data: diversityData } = await supabase
      .rpc('get_counterparty_diversity', { p_address: agentData.ergo_address });
    const uniqueCounterparties = diversityData?.[0]?.unique_counterparties || 0;

    // Build EgoFactors object with real data
    const factors: EgoFactors = {
      completionRate: (totalAssignedTasks || 0) > 0 ? (completedTasks || 0) / (totalAssignedTasks || 1) * 100 : 100, // Start at 100% if no tasks assigned
      avgRating: avgRating,
      uptime: 80, // Placeholder - could be calculated from activity timestamps
      accountAge: accountAge,
      peerEndorsements: uniqueCounterparties, // Unique counterparties = organic trust signal
      skillBenchmarks: 0, // Placeholder for future implementation
      disputeRate: (totalAssignedTasks || 0) > 0 ? (disputeCount / (totalAssignedTasks || 1)) * 100 : 0,
    };

    // Consider on-chain EGO tokens as staking multiplier (small boost)
    const stakingMultiplier = onChainEgoTokens > 0n ? 1.0 + (Number(onChainEgoTokens) * 0.001) : 1.0; // 0.1% boost per token
    
    // Compute the new EGO score
    const newScore = computeEgoScore(factors, Math.min(stakingMultiplier, 1.1)); // Cap staking boost at 10%

    // SECURITY FIX: Update EGO score via secure edge function instead of direct service client
    // This prevents service role key exposure in browser environment
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/update-ego-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          agentId,
          newScore,
          factors,
          completedTasks: completedTasks || 0,
          avgRating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error updating EGO score via edge function:', errorData);
        return { success: false, newScore: 0, error: errorData.error || 'EGO score update failed' };
      }

      const result = await response.json();
      if (!result.success) {
        return { success: false, newScore: 0, error: result.error || 'EGO score update failed' };
      }
    } catch (fetchError) {
      console.error('Network error updating EGO score:', fetchError);
      return { success: false, newScore: 0, error: 'Network error updating reputation' };
    }

    // Create a reputation event for this recalculation
    await createReputationEvent({
      agentId,
      eventType: 'completion',
      egoDelta: 0, // This is a recalculation, not a delta
      description: `EGO score recalculated: ${newScore} (${completedTasks || 0} completions, ${avgRating.toFixed(1)} avg rating)`,
      createdAt: new Date().toISOString(),
    });

    return { success: true, newScore };
  } catch (error) {
    console.error('Error recalculating EGO score:', error);
    return { success: false, newScore: 0, error: String(error) };
  }
}

/**
 * Recalculate EGO scores for all agents in the system.
 * Use this for batch updates or system maintenance.
 */
export async function recalculateAllEgoScores(): Promise<{ processed: number; errors: string[] }> {
  const agents = await getAgents();
  let processed = 0;
  const errors: string[] = [];

  for (const agent of agents) {
    const result = await recalculateEgoScore(agent.id);
    if (result.success) {
      processed++;
    } else {
      errors.push(`${agent.name}: ${result.error}`);
    }
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { processed, errors };
}

/**
 * Get the current EGO factors for an agent (for display purposes).
 */
export async function getAgentEgoFactors(agentId: string): Promise<EgoFactors | null> {
  try {
    const { data: agentData } = await supabase
      .from('agents')
      .select('id, created_at, ergo_address')
      .eq('id', agentId)
      .single();

    if (!agentData) return null;

    // Count completed tasks
    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .eq('status', 'completed');

    const { count: totalAssignedTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)
      .in('status', ['completed', 'disputed', 'cancelled']);

    // Get average rating
    const { data: completions } = await supabase
      .from('completions')
      .select('rating')
      .eq('agent_id', agentId);

    const ratings = completions?.map(c => c.rating).filter(r => r > 0) || [];
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 3.0;

    // Calculate account age
    const accountAge = Math.floor((Date.now() - new Date(agentData.created_at).getTime()) / (1000 * 60 * 60 * 24));

    return {
      completionRate: (totalAssignedTasks || 0) > 0 ? (completedTasks || 0) / (totalAssignedTasks || 1) * 100 : 100,
      avgRating: avgRating,
      uptime: 80, // Placeholder
      accountAge: accountAge,
      peerEndorsements: 0, // Placeholder
      skillBenchmarks: 0, // Placeholder
      disputeRate: 0, // Placeholder
    };
  } catch (error) {
    console.error('Error getting EGO factors:', error);
    return null;
  }
}

// ============================================================
// TASK MESSAGING AND FILE DELIVERY SYSTEM
// ============================================================

export interface TaskMessage {
  id: string;
  taskId: string;
  senderAddress: string;
  message: string;
  messageType: 'text' | 'file' | 'delivery' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

function dbToTaskMessage(row: Record<string, unknown>): TaskMessage {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    senderAddress: row.sender_address as string,
    message: row.message as string,
    messageType: (row.message_type as TaskMessage['messageType']) || 'text',
    fileUrl: row.file_url as string | undefined,
    fileName: row.file_name as string | undefined,
    fileSize: row.file_size as number | undefined,
    createdAt: row.created_at as string,
  };
}

/**
 * Fetch all messages for a task
 */
export async function getTaskMessages(taskId: string): Promise<TaskMessage[]> {
  const { data, error } = await supabase
    .from('task_messages')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching task messages:', error);
    return [];
  }
  
  return (data || []).map(dbToTaskMessage);
}

/**
 * Send a message to a task chat
 */
export async function sendTaskMessage(
  taskId: string,
  senderAddress: string,
  message: string,
  type: TaskMessage['messageType'] = 'text',
  fileUrl?: string,
  fileName?: string,
  fileSize?: number
): Promise<TaskMessage | null> {
  const messageData = {
    task_id: taskId,
    sender_address: senderAddress,
    message: sanitizeText(message, 5000),
    message_type: type,
    file_url: fileUrl,
    file_name: fileName ? sanitizeText(fileName, 255) : undefined,
    file_size: fileSize,
  };

  const { data, error } = await supabase
    .from('task_messages')
    .insert(messageData)
    .select()
    .single();

  if (error) {
    console.error('Error sending task message:', error);
    return null;
  }

  return data ? dbToTaskMessage(data) : null;
}

/**
 * Upload a file to Supabase Storage for task messaging
 */
export async function uploadTaskFile(
  taskId: string,
  file: File
): Promise<{ url: string; fileName: string; fileSize: number } | null> {
  try {
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    // SECURITY FIX: Validate file type by content, not just MIME type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/zip',
      'text/plain', 'text/csv', 'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    // Check MIME type first (basic check)
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed based on MIME type');
    }

    // SECURITY FIX: Validate file type by analyzing file content
    const { fileTypeFromBuffer } = await import('file-type');
    const buffer = await file.arrayBuffer();
    const detectedType = await fileTypeFromBuffer(new Uint8Array(buffer));
    
    // For files that can be detected, verify the content matches the MIME type
    if (detectedType && !allowedTypes.includes(detectedType.mime)) {
      throw new Error('File content does not match allowed types. Potential file type spoofing detected.');
    }

    // Additional security: reject files with suspicious extensions
    const suspiciousExtensions = ['.js', '.html', '.php', '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.jar'];
    const fileName = file.name.toLowerCase();
    for (const ext of suspiciousExtensions) {
      if (fileName.endsWith(ext)) {
        throw new Error(`File extension ${ext} is not allowed for security reasons`);
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${taskId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('task-files')
      .upload(uniqueFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('task-files')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size
    };
  } catch (error) {
    console.error('Error in uploadTaskFile:', error);
    return null;
  }
}

/**
 * Send a system message to a task chat (for status updates, etc.)
 */
export async function sendSystemMessage(
  taskId: string,
  message: string
): Promise<TaskMessage | null> {
  return sendTaskMessage(taskId, 'system', message, 'system');
}

// ============================================================
// Verified Write Operations (via Edge Functions)
// These require wallet signature verification before writing.
// Use these instead of direct writes for security.
// ============================================================

/**
 * Helper: request a challenge, let the caller sign it, then perform a verified write.
 * `signMessage` should call the Nautilus wallet to sign the challenge message.
 */
export async function withWalletAuth(
  address: string,
  signMessage: (message: string) => Promise<string | undefined>,
): Promise<WalletAuth> {
  const challenge = await requestChallenge(address);
  const signature = await signMessage(challenge.message);
  return { address, nonce: challenge.nonce, signature: signature || undefined };
}

export async function verifiedCreateAgent(
  agentData: {
    name: string; description: string; skills: string[];
    hourlyRateErg: number; ergoAddress: string;
  },
  auth: WalletAuth,
): Promise<Record<string, unknown>> {
  return verifiedWrite('create-agent', agentData as unknown as Record<string, unknown>, auth);
}

export async function verifiedUpdateAgent(
  id: string,
  updates: Partial<Agent>,
  auth: WalletAuth,
): Promise<Record<string, unknown>> {
  return verifiedWrite('update-agent', { id, ...updates } as unknown as Record<string, unknown>, auth);
}

export async function verifiedCreateTask(
  taskData: {
    title: string; description: string; skillsRequired: string[];
    budgetErg: number; creatorName?: string;
  },
  auth: WalletAuth,
): Promise<Record<string, unknown>> {
  return verifiedWrite('create-task', taskData as unknown as Record<string, unknown>, auth);
}

export async function verifiedUpdateTask(
  id: string,
  updates: Partial<Task>,
  auth: WalletAuth,
): Promise<Record<string, unknown>> {
  return verifiedWrite('update-task', { id, ...updates } as unknown as Record<string, unknown>, auth);
}

export async function verifiedCreateBid(
  bidData: {
    taskId: string; agentId: string; agentName: string;
    agentEgoScore: number; proposedRate: number; message: string;
  },
  auth: WalletAuth,
): Promise<Record<string, unknown>> {
  return verifiedWrite('create-bid', bidData as unknown as Record<string, unknown>, auth);
}

export async function verifiedCreateDeliverable(
  deliverable: {
    taskId: string; agentId: string; content: string;
    deliverableUrl?: string; revisionNumber: number;
  },
  auth: WalletAuth,
): Promise<Record<string, unknown>> {
  return verifiedWrite('create-deliverable', deliverable as unknown as Record<string, unknown>, auth);
}

// ============================================================
// RATING SYSTEM - Mutual Rating Functions
// Both parties (creator and agent) rate each other after task completion
// ============================================================

import { Rating, RatingSummary } from './types';

function dbToRating(row: Record<string, unknown>): Rating {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    raterAddress: row.rater_address as string,
    rateeAddress: row.ratee_address as string,
    raterRole: (row.rater_role as 'creator' | 'agent'),
    score: Number(row.score),
    criteria: (row.criteria as Rating['criteria']) || {},
    comment: (row.comment as string) || '',
    createdAt: (row.created_at as string) || '',
  };
}

function ratingToDb(r: Partial<Rating>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (r.id !== undefined) m.id = r.id;
  if (r.taskId !== undefined) m.task_id = r.taskId;
  if (r.raterAddress !== undefined) m.rater_address = r.raterAddress;
  if (r.rateeAddress !== undefined) m.ratee_address = r.rateeAddress;
  if (r.raterRole !== undefined) m.rater_role = r.raterRole;
  if (r.score !== undefined) m.score = r.score;
  if (r.criteria !== undefined) m.criteria = r.criteria;
  if (r.comment !== undefined) m.comment = r.comment;
  if (r.createdAt !== undefined) m.created_at = r.createdAt;
  return m;
}

/**
 * Submit a rating for a task
 */
export async function submitRating(rating: {
  taskId: string;
  raterAddress: string;
  rateeAddress: string;
  raterRole: 'creator' | 'agent';
  score: number;
  criteria: Record<string, number>;
  comment: string;
}): Promise<Rating> {
  // Validate rating data
  if (rating.score < 1 || rating.score > 5) {
    throw new Error('Rating score must be between 1 and 5');
  }

  if (!validateErgoAddress(rating.raterAddress) || !validateErgoAddress(rating.rateeAddress)) {
    throw new Error('Invalid Ergo address format');
  }

  // ANTI-GAMING PROTECTION 1: Escrow-Gated Ratings
  // Before allowing rating, verify task had completed escrow
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('status, budget_erg, creator_address, accepted_agent_address, escrow_tx_id')
    .eq('id', rating.taskId)
    .single();

  if (taskError || !taskData) {
    throw new Error('Task not found');
  }

  if (taskData.status !== 'completed') {
    throw new Error('Ratings can only be submitted for completed tasks with released escrow');
  }

  if (!taskData.escrow_tx_id) {
    throw new Error('Task must have completed escrow before ratings can be submitted');
  }

  // ANTI-GAMING PROTECTION 7: Self-Rating Prevention
  if (rating.raterAddress === rating.rateeAddress) {
    throw new Error('You cannot rate yourself');
  }

  // Verify rater is actually part of this task
  const isValidRater = (rating.raterRole === 'creator' && taskData.creator_address === rating.raterAddress) ||
                      (rating.raterRole === 'agent' && taskData.accepted_agent_address === rating.raterAddress);
  
  if (!isValidRater) {
    throw new Error('You are not authorized to rate this task. Only the task creator and assigned agent can submit ratings.');
  }

  // Capture task value for weighting
  const taskValue = Number(taskData.budget_erg) || 0;

  const sanitizedRating = {
    ...rating,
    comment: sanitizeText(rating.comment, 1000),
    score: Math.min(Math.max(Math.round(rating.score), 1), 5),
    criteria: Object.fromEntries(
      Object.entries(rating.criteria).map(([key, value]) => [
        key,
        Math.min(Math.max(Math.round(value), 1), 5)
      ])
    )
  };

  const newRating: Rating = {
    ...sanitizedRating,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  // Check if rating already exists for this task + rater
  const existingRating = await getRatingForTask(rating.taskId, rating.raterAddress);
  if (existingRating) {
    throw new Error('You have already rated this task');
  }

  // Insert the rating with task value
  const dbRating = ratingToDb(newRating);
  dbRating.task_value_erg = taskValue; // Add task value for weighting

  const { error } = await supabase
    .from('ratings')
    .insert(dbRating);

  if (error) {
    throw new Error(`Failed to submit rating: ${error.message}`);
  }

  // If rating an agent, trigger EGO score recalculation
  if (rating.rateeAddress) {
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .or(`ergo_address.eq.${rating.rateeAddress},owner_address.eq.${rating.rateeAddress}`)
      .single();

    if (agentData) {
      // Fire-and-forget EGO score recalculation
      recalculateEgoScore(agentData.id).catch(error => {
        console.error('Failed to recalculate EGO score after rating:', error);
      });
    }
  }

  return newRating;
}

/**
 * Get ratings for a specific address
 */
export async function getRatingsForAddress(address: string): Promise<Rating[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('ratee_address', address)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching ratings:', error);
    return [];
  }

  return (data || []).map(dbToRating);
}

/**
 * Check if a specific rater has already rated a task
 */
export async function getRatingForTask(taskId: string, raterAddress: string): Promise<Rating | null> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('task_id', taskId)
    .eq('rater_address', raterAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking for existing rating:', error);
    return null;
  }

  return data ? dbToRating(data) : null;
}

/**
 * Get average rating for an address
 */
export async function getAverageRating(address: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_average_rating', { p_address: address });

  if (error) {
    console.error('Error getting average rating:', error);
    return 3.0; // Default neutral rating
  }

  return data?.[0]?.average_score || 3.0;
}

/**
 * Get value-weighted average rating for an address (ANTI-GAMING PROTECTION 2)
 */
export async function getWeightedAverageRating(address: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_weighted_average_rating', { p_address: address });

  if (error) {
    console.error('Error getting weighted average rating:', error);
    return 3.0; // Default neutral rating
  }

  return Number(data) || 3.0;
}

/**
 * Get rater reliability score (ANTI-GAMING PROTECTION 6)
 * Returns how consistent this person's ratings are vs consensus
 */
export async function getRaterReliability(raterAddress: string): Promise<{
  reliability: number; // 0-1 score
  averageGivenRating: number;
  totalRatingsGiven: number;
  deviationFromConsensus: number;
}> {
  try {
    // Get all ratings given by this rater
    const { data: raterRatings, error } = await supabase
      .from('ratings')
      .select('ratee_address, score, task_value_erg')
      .eq('rater_address', raterAddress);

    if (error || !raterRatings || raterRatings.length === 0) {
      return {
        reliability: 0.5, // Neutral for new raters
        averageGivenRating: 3.0,
        totalRatingsGiven: 0,
        deviationFromConsensus: 0
      };
    }

    // Calculate average rating given by this person
    const averageGivenRating = raterRatings.reduce((sum, r) => sum + r.score, 0) / raterRatings.length;

    // For each person they rated, get that person's overall average from others
    let totalDeviation = 0;
    let validComparisons = 0;

    for (const rating of raterRatings) {
      // Get consensus rating for this ratee (excluding this rater)
      const { data: consensusData } = await supabase
        .from('ratings')
        .select('score, task_value_erg')
        .eq('ratee_address', rating.ratee_address)
        .neq('rater_address', raterAddress);

      if (consensusData && consensusData.length > 0) {
        const consensusAvg = consensusData.reduce((sum, r) => sum + r.score, 0) / consensusData.length;
        totalDeviation += Math.abs(rating.score - consensusAvg);
        validComparisons++;
      }
    }

    const averageDeviation = validComparisons > 0 ? totalDeviation / validComparisons : 0;
    
    // Convert deviation to reliability score (lower deviation = higher reliability)
    // Max deviation is 4 (5 vs 1), so reliability = 1 - (deviation / 4)
    const reliability = Math.max(0, 1 - (averageDeviation / 4));

    return {
      reliability,
      averageGivenRating,
      totalRatingsGiven: raterRatings.length,
      deviationFromConsensus: averageDeviation
    };
  } catch (error) {
    console.error('Error calculating rater reliability:', error);
    return {
      reliability: 0.5,
      averageGivenRating: 3.0,
      totalRatingsGiven: 0,
      deviationFromConsensus: 0
    };
  }
}

/**
 * Get comprehensive rating summary for an address
 */
export async function getRatingSummaryForAddress(
  address: string, 
  role: 'creator' | 'agent' | 'all' = 'all'
): Promise<RatingSummary> {
  try {
    // Get average rating and breakdown
    const { data: avgData, error: avgError } = await supabase
      .rpc('get_average_rating', { p_address: address, p_role: role });

    if (avgError) {
      console.error('Error getting average rating:', avgError);
    }

    const avgResult = avgData?.[0] || { average_score: 3.0, total_ratings: 0, score_breakdown: {} };

    // Get criteria averages
    const { data: criteriaData, error: criteriaError } = await supabase
      .rpc('get_criteria_averages', { p_address: address, p_role: role });

    if (criteriaError) {
      console.error('Error getting criteria averages:', criteriaError);
    }

    const criteriaAverages = criteriaData || {};

    // Get recent comments
    let query = supabase
      .from('ratings')
      .select('comment, score, rater_role, created_at')
      .eq('ratee_address', address)
      .not('comment', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(5);

    if (role !== 'all') {
      if (role === 'creator') {
        query = query.eq('rater_role', 'agent'); // Comments from agents about creators
      } else {
        query = query.eq('rater_role', 'creator'); // Comments from creators about agents
      }
    }

    const { data: commentsData, error: commentsError } = await query;

    if (commentsError) {
      console.error('Error getting recent comments:', commentsError);
    }

    const recentComments = (commentsData || []).map(comment => ({
      comment: comment.comment,
      score: comment.score,
      raterRole: comment.rater_role as 'creator' | 'agent',
      createdAt: comment.created_at,
    }));

    return {
      averageScore: Number(avgResult.average_score) || 3.0,
      totalRatings: Number(avgResult.total_ratings) || 0,
      scoreBreakdown: {
        '5_star': Number(avgResult.score_breakdown?.['5_star'] || 0),
        '4_star': Number(avgResult.score_breakdown?.['4_star'] || 0),
        '3_star': Number(avgResult.score_breakdown?.['3_star'] || 0),
        '2_star': Number(avgResult.score_breakdown?.['2_star'] || 0),
        '1_star': Number(avgResult.score_breakdown?.['1_star'] || 0),
      },
      criteriaAverages,
      recentComments,
    };
  } catch (error) {
    console.error('Error getting rating summary:', error);
    return {
      averageScore: 3.0,
      totalRatings: 0,
      scoreBreakdown: {
        '5_star': 0,
        '4_star': 0,
        '3_star': 0,
        '2_star': 0,
        '1_star': 0,
      },
      criteriaAverages: {},
      recentComments: [],
    };
  }
}

/**
 * Get pending ratings for a user (tasks completed but not yet rated)
 */
export async function getPendingRatingsForUser(userAddress: string): Promise<Array<{
  taskId: string;
  taskTitle: string;
  otherPartyAddress: string;
  otherPartyName?: string;
  userRole: 'creator' | 'agent';
  completedAt: string;
}>> {
  try {
    // Get completed tasks where user was creator or assigned agent
    let creatorTasks: any[] = [];
    let agentTasks: any[] = [];

    // Tasks where user was creator
    const { data: creatorTasksData } = await supabase
      .from('tasks')
      .select('id, title, creator_address, accepted_agent_address, assigned_agent_name, completed_at')
      .eq('creator_address', userAddress)
      .eq('status', 'completed')
      .not('accepted_agent_address', 'is', null);

    creatorTasks = creatorTasksData || [];

    // Tasks where user was agent (need to check agents table for match)
    const { data: userAgents } = await supabase
      .from('agents')
      .select('id, ergo_address, owner_address')
      .or(`ergo_address.eq.${userAddress},owner_address.eq.${userAddress}`);

    if (userAgents && userAgents.length > 0) {
      const agentIds = userAgents.map(agent => agent.id);
      const { data: agentTasksData } = await supabase
        .from('tasks')
        .select('id, title, creator_address, creator_name, assigned_agent_id, completed_at')
        .in('assigned_agent_id', agentIds)
        .eq('status', 'completed');

      agentTasks = agentTasksData || [];
    }

    const pendingRatings = [];

    // Check creator tasks (user rates agent)
    for (const task of creatorTasks) {
      const existingRating = await getRatingForTask(task.id, userAddress);
      if (!existingRating) {
        pendingRatings.push({
          taskId: task.id,
          taskTitle: task.title,
          otherPartyAddress: task.accepted_agent_address,
          otherPartyName: task.assigned_agent_name,
          userRole: 'creator' as const,
          completedAt: task.completed_at,
        });
      }
    }

    // Check agent tasks (user rates creator)
    for (const task of agentTasks) {
      const existingRating = await getRatingForTask(task.id, userAddress);
      if (!existingRating) {
        pendingRatings.push({
          taskId: task.id,
          taskTitle: task.title,
          otherPartyAddress: task.creator_address,
          otherPartyName: task.creator_name,
          userRole: 'agent' as const,
          completedAt: task.completed_at,
        });
      }
    }

    return pendingRatings.sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch (error) {
    console.error('Error getting pending ratings:', error);
    return [];
  }
}

/**
 * ANTI-GAMING PROTECTION: Enhanced rating validation
 * Checks multiple anti-gaming protections before allowing rating submission
 */
export async function validateRatingSubmission(
  taskId: string,
  raterAddress: string,
  rateeAddress: string,
  raterRole: 'creator' | 'agent'
): Promise<{
  valid: boolean;
  error?: string;
  warnings?: string[];
}> {
  try {
    const warnings: string[] = [];

    // Check 1: Basic validation
    if (!validateErgoAddress(raterAddress) || !validateErgoAddress(rateeAddress)) {
      return { valid: false, error: 'Invalid Ergo address format' };
    }

    // Check 2: Self-rating prevention
    if (raterAddress === rateeAddress) {
      return { valid: false, error: 'Self-rating is not allowed' };
    }

    // Check 3: Escrow-gated ratings
    const { data: taskData } = await supabase
      .from('tasks')
      .select('status, budget_erg, creator_address, accepted_agent_address, escrow_tx_id')
      .eq('id', taskId)
      .single();

    if (!taskData) {
      return { valid: false, error: 'Task not found' };
    }

    if (taskData.status !== 'completed') {
      return { valid: false, error: 'Ratings can only be submitted for completed tasks' };
    }

    if (!taskData.escrow_tx_id) {
      return { valid: false, error: 'Task must have completed escrow before ratings can be submitted' };
    }

    // Check 4: Authorization
    const isValidRater = (raterRole === 'creator' && taskData.creator_address === raterAddress) ||
                        (raterRole === 'agent' && taskData.accepted_agent_address === raterAddress);
    
    if (!isValidRater) {
      return { valid: false, error: 'You are not authorized to rate this task' };
    }

    // Check 5: Duplicate rating
    const existingRating = await getRatingForTask(taskId, raterAddress);
    if (existingRating) {
      return { valid: false, error: 'You have already rated this task' };
    }

    // Check 6: Low-value task warning
    const taskValue = Number(taskData.budget_erg) || 0;
    if (taskValue < 0.5) {
      warnings.push('This is a low-value task. Ratings may have reduced impact on reputation scores.');
    }

    // Check 7: Rater reliability check
    const raterReliability = await getRaterReliability(raterAddress);
    if (raterReliability.reliability < 0.3 && raterReliability.totalRatingsGiven > 5) {
      warnings.push('Your rating patterns differ significantly from consensus. This rating may be weighted less heavily.');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    console.error('Error validating rating submission:', error);
    return { valid: false, error: 'Unable to validate rating submission' };
  }
}
