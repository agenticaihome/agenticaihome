import { supabase } from './supabase';
import { sanitizeText, sanitizeErgoAddress } from './sanitize';
import { getCurrentHeight } from './ergo/explorer';

// ─── Types ───────────────────────────────────────────────────────────

export type DisputeStatus = 'open' | 'mediation' | 'resolved' | 'refunded' | 'expired';

export interface Dispute {
  id: string;
  taskId: string;
  reason: string;
  status: DisputeStatus;
  posterAddress: string;
  agentAddress: string;
  originalAmount: number; // nanoERG
  proposedPosterPercent?: number; // 0-100
  proposedAgentPercent?: number; // 0-100
  mediationDeadline: number; // block height
  disputeBoxId?: string; // On-chain dispute box ID
  resolutionTxId?: string; // Final resolution transaction
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface DisputeResolution {
  disputeId: string;
  posterPercent: number;
  agentPercent: number;
  proposedBy: string; // address of who proposed this split
  acceptedBy?: string; // address of who accepted (if any)
  createdAt: string;
}

// ─── Database helpers: camelCase <-> snake_case ────────────────────

function disputeToDb(d: Partial<Dispute>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (d.id !== undefined) m.id = d.id;
  if (d.taskId !== undefined) m.task_id = d.taskId;
  if (d.reason !== undefined) m.reason = d.reason;
  if (d.status !== undefined) m.status = d.status;
  if (d.posterAddress !== undefined) m.poster_address = d.posterAddress;
  if (d.agentAddress !== undefined) m.agent_address = d.agentAddress;
  if (d.originalAmount !== undefined) m.original_amount = d.originalAmount;
  if (d.proposedPosterPercent !== undefined) m.proposed_poster_percent = d.proposedPosterPercent;
  if (d.proposedAgentPercent !== undefined) m.proposed_agent_percent = d.proposedAgentPercent;
  if (d.mediationDeadline !== undefined) m.mediation_deadline = d.mediationDeadline;
  if (d.disputeBoxId !== undefined) m.dispute_box_id = d.disputeBoxId;
  if (d.resolutionTxId !== undefined) m.resolution_tx_id = d.resolutionTxId;
  if (d.createdAt !== undefined) m.created_at = d.createdAt;
  if (d.updatedAt !== undefined) m.updated_at = d.updatedAt;
  if (d.metadata !== undefined) m.metadata = d.metadata;
  return m;
}

function dbToDispute(row: Record<string, unknown>): Dispute {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    reason: (row.reason as string) || '',
    status: (row.status as DisputeStatus) || 'open',
    posterAddress: row.poster_address as string,
    agentAddress: row.agent_address as string,
    originalAmount: (row.original_amount as number) || 0,
    proposedPosterPercent: row.proposed_poster_percent as number | undefined,
    proposedAgentPercent: row.proposed_agent_percent as number | undefined,
    mediationDeadline: (row.mediation_deadline as number) || 0,
    disputeBoxId: row.dispute_box_id as string | undefined,
    resolutionTxId: row.resolution_tx_id as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    metadata: (row.metadata as Record<string, any>) || {},
  };
}

function resolutionToDb(r: Partial<DisputeResolution>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  if (r.disputeId !== undefined) m.dispute_id = r.disputeId;
  if (r.posterPercent !== undefined) m.poster_percent = r.posterPercent;
  if (r.agentPercent !== undefined) m.agent_percent = r.agentPercent;
  if (r.proposedBy !== undefined) m.proposed_by = r.proposedBy;
  if (r.acceptedBy !== undefined) m.accepted_by = r.acceptedBy;
  if (r.createdAt !== undefined) m.created_at = r.createdAt;
  return m;
}

function dbToResolution(row: Record<string, unknown>): DisputeResolution {
  return {
    disputeId: row.dispute_id as string,
    posterPercent: (row.poster_percent as number) || 0,
    agentPercent: (row.agent_percent as number) || 0,
    proposedBy: row.proposed_by as string,
    acceptedBy: row.accepted_by as string | undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

// ─── Core dispute functions ──────────────────────────────────────────

/**
 * Create a new dispute record for a task
 */
export async function createDispute(
  taskId: string,
  reason: string,
  posterAddress: string,
  agentAddress?: string,
  originalAmount?: number
): Promise<Dispute> {
  // Sanitize inputs
  const sanitizedReason = sanitizeText(reason, 500);
  const sanitizedPosterAddress = sanitizeErgoAddress(posterAddress);
  const sanitizedAgentAddress = agentAddress ? sanitizeErgoAddress(agentAddress) : '';

  if (!sanitizedReason) {
    throw new Error('Dispute reason is required');
  }

  // Validate task exists and is in correct status
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('status, poster_address, accepted_agent_address, budget_erg')
    .eq('id', taskId)
    .single();
  
  if (taskError) {
    throw new Error(`Failed to get task details: ${taskError.message}`);
  }

  if (!task) {
    throw new Error('Task not found');
  }

  // Verify task is in review status
  if (task.status !== 'review') {
    throw new Error(`Cannot dispute task with status '${task.status}'. Task must be in 'review' status.`);
  }

  // Verify poster ownership
  if (task.poster_address !== sanitizedPosterAddress) {
    throw new Error('Only the task poster can create a dispute');
  }

  // Verify agent is assigned
  if (!task.accepted_agent_address) {
    throw new Error('Cannot dispute task without an assigned agent');
  }

  const currentHeight = await getCurrentHeight();
  const mediationDeadline = currentHeight + 720; // 720 blocks (~1 day)

  const now = new Date().toISOString();
  
  const finalAgentAddress = sanitizedAgentAddress || task.accepted_agent_address;
  const finalOriginalAmount = originalAmount || (task.budget_erg * 1e9); // Convert ERG to nanoERG

  const dispute: Partial<Dispute> = {
    taskId,
    reason: sanitizedReason,
    status: 'open',
    posterAddress: sanitizedPosterAddress,
    agentAddress: finalAgentAddress,
    originalAmount: finalOriginalAmount,
    mediationDeadline,
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from('disputes')
    .insert(disputeToDb(dispute))
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create dispute: ${error.message}`);
  }

  return dbToDispute(data);
}

/**
 * Get dispute by task ID
 */
export async function getDispute(taskId: string): Promise<Dispute | null> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get dispute: ${error.message}`);
  }

  return data ? dbToDispute(data) : null;
}

/**
 * Get dispute by ID
 */
export async function getDisputeById(disputeId: string): Promise<Dispute | null> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get dispute: ${error.message}`);
  }

  return dbToDispute(data);
}

/**
 * Update dispute status and metadata
 */
export async function updateDispute(
  disputeId: string,
  updates: Partial<Dispute>
): Promise<Dispute> {
  const now = new Date().toISOString();
  const updateData = disputeToDb({
    ...updates,
    updatedAt: now,
  });

  const { data, error } = await supabase
    .from('disputes')
    .update(updateData)
    .eq('id', disputeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update dispute: ${error.message}`);
  }

  return dbToDispute(data);
}

/**
 * Set dispute box ID after on-chain dispute creation
 */
export async function setDisputeBoxId(
  disputeId: string,
  disputeBoxId: string
): Promise<Dispute> {
  return updateDispute(disputeId, {
    disputeBoxId,
    status: 'mediation',
  });
}

/**
 * Set resolution transaction ID after dispute resolution
 */
export async function setResolutionTx(
  disputeId: string,
  resolutionTxId: string
): Promise<Dispute> {
  return updateDispute(disputeId, {
    resolutionTxId,
    status: 'resolved',
  });
}

// ─── Resolution proposals ────────────────────────────────────────────

/**
 * Propose a resolution split (poster or agent can propose)
 */
export async function proposeResolution(
  disputeId: string,
  posterPercent: number,
  agentPercent: number,
  proposedBy: string
): Promise<DisputeResolution> {
  // Validate percentages with strict checks
  if (!Number.isInteger(posterPercent) || posterPercent < 0 || posterPercent > 100) {
    throw new Error('Poster percentage must be an integer between 0 and 100');
  }
  if (!Number.isInteger(agentPercent) || agentPercent < 0 || agentPercent > 100) {
    throw new Error('Agent percentage must be an integer between 0 and 100');
  }
  if (posterPercent + agentPercent !== 100) {
    throw new Error('Percentages must sum to exactly 100');
  }
  
  // Prevent edge cases
  if (posterPercent === 0 && agentPercent === 0) {
    throw new Error('At least one party must receive some amount');
  }

  const sanitizedProposedBy = sanitizeErgoAddress(proposedBy);
  if (!sanitizedProposedBy) {
    throw new Error('Invalid proposer address');
  }

  // Check if dispute exists
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Verify proposer is either poster or agent
  if (sanitizedProposedBy !== dispute.posterAddress && sanitizedProposedBy !== dispute.agentAddress) {
    throw new Error('Only poster or agent can propose resolutions');
  }

  const now = new Date().toISOString();

  const resolution: Partial<DisputeResolution> = {
    disputeId,
    posterPercent,
    agentPercent,
    proposedBy: sanitizedProposedBy,
    createdAt: now,
  };

  // Remove any previous proposals from this proposer
  await supabase
    .from('dispute_resolutions')
    .delete()
    .eq('dispute_id', disputeId)
    .eq('proposed_by', sanitizedProposedBy);

  const { data, error } = await supabase
    .from('dispute_resolutions')
    .insert(resolutionToDb(resolution))
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to propose resolution: ${error.message}`);
  }

  // Update the dispute with the proposed percentages
  await updateDispute(disputeId, {
    proposedPosterPercent: posterPercent,
    proposedAgentPercent: agentPercent,
  });

  return dbToResolution(data);
}

/**
 * Accept a resolution proposal
 */
export async function acceptResolution(
  disputeId: string,
  acceptedBy: string
): Promise<DisputeResolution> {
  const sanitizedAcceptedBy = sanitizeErgoAddress(acceptedBy);
  if (!sanitizedAcceptedBy) {
    throw new Error('Invalid acceptor address');
  }

  // Check if dispute exists
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Verify acceptor is either poster or agent
  if (sanitizedAcceptedBy !== dispute.posterAddress && sanitizedAcceptedBy !== dispute.agentAddress) {
    throw new Error('Only poster or agent can accept resolutions');
  }

  // Get the latest resolution proposal from the other party
  const otherPartyAddress = sanitizedAcceptedBy === dispute.posterAddress 
    ? dispute.agentAddress 
    : dispute.posterAddress;

  const { data: proposals, error: proposalError } = await supabase
    .from('dispute_resolutions')
    .select('*')
    .eq('dispute_id', disputeId)
    .eq('proposed_by', otherPartyAddress)
    .is('accepted_by', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (proposalError) {
    throw new Error(`Failed to get resolution proposal: ${proposalError.message}`);
  }

  if (!proposals || proposals.length === 0) {
    throw new Error('No pending resolution proposal to accept');
  }

  const proposal = proposals[0];

  // Update the proposal with acceptance
  const { data, error } = await supabase
    .from('dispute_resolutions')
    .update({ accepted_by: sanitizedAcceptedBy })
    .eq('dispute_id', disputeId)
    .eq('proposed_by', otherPartyAddress)
    .eq('created_at', proposal.created_at)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to accept resolution: ${error.message}`);
  }

  return dbToResolution(data);
}

/**
 * Get active resolution proposal for a dispute
 */
export async function getActiveResolution(disputeId: string): Promise<DisputeResolution | null> {
  const { data, error } = await supabase
    .from('dispute_resolutions')
    .select('*')
    .eq('dispute_id', disputeId)
    .is('accepted_by', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get active resolution: ${error.message}`);
  }

  return data ? dbToResolution(data) : null;
}

/**
 * Get accepted resolution for a dispute
 */
export async function getAcceptedResolution(disputeId: string): Promise<DisputeResolution | null> {
  const { data, error } = await supabase
    .from('dispute_resolutions')
    .select('*')
    .eq('dispute_id', disputeId)
    .not('accepted_by', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get accepted resolution: ${error.message}`);
  }

  return data ? dbToResolution(data) : null;
}

// ─── Dispute queries ─────────────────────────────────────────────────

/**
 * Get all disputes for a user (poster or agent)
 */
export async function getDisputesForUser(userAddress: string): Promise<Dispute[]> {
  const sanitizedAddress = sanitizeErgoAddress(userAddress);
  if (!sanitizedAddress) {
    throw new Error('Invalid user address');
  }

  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .or(`poster_address.eq.${sanitizedAddress},agent_address.eq.${sanitizedAddress}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get disputes for user: ${error.message}`);
  }

  return data ? data.map(dbToDispute) : [];
}

/**
 * Get all open disputes
 */
export async function getOpenDisputes(): Promise<Dispute[]> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get open disputes: ${error.message}`);
  }

  return data ? data.map(dbToDispute) : [];
}

/**
 * Get expired disputes that can be auto-refunded
 */
export async function getExpiredDisputes(): Promise<Dispute[]> {
  const currentHeight = await getCurrentHeight();

  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .eq('status', 'mediation')
    .lt('mediation_deadline', currentHeight)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get expired disputes: ${error.message}`);
  }

  return data ? data.map(dbToDispute) : [];
}

// ─── Utilities ───────────────────────────────────────────────────────

/**
 * Check if a dispute has expired (past mediation deadline)
 */
export async function isDisputeExpired(dispute: Dispute): Promise<boolean> {
  const currentHeight = await getCurrentHeight();
  return currentHeight > dispute.mediationDeadline;
}

/**
 * Get blocks until dispute mediation expires
 */
export async function getBlocksUntilExpiry(dispute: Dispute): Promise<number> {
  const currentHeight = await getCurrentHeight();
  return Math.max(0, dispute.mediationDeadline - currentHeight);
}

/**
 * Get time estimate until dispute expires (approximate)
 */
export async function getTimeUntilExpiry(dispute: Dispute): Promise<string> {
  const blocksRemaining = await getBlocksUntilExpiry(dispute);
  const minutesRemaining = blocksRemaining * 2; // ~2 minutes per block
  
  if (minutesRemaining <= 0) return 'Expired';
  if (minutesRemaining < 60) return `${minutesRemaining} minutes`;
  
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  if (hoursRemaining < 24) return `${hoursRemaining} hours`;
  
  const daysRemaining = Math.floor(hoursRemaining / 24);
  return `${daysRemaining} days`;
}

/**
 * Calculate dispute resolution amounts in nanoERG
 */
export function calculateDisputeAmounts(
  originalAmount: number,
  posterPercent: number,
  agentPercent: number
): { posterAmount: number; agentAmount: number; totalAmount: number } {
  const posterAmount = Math.floor((originalAmount * posterPercent) / 100);
  const agentAmount = Math.floor((originalAmount * agentPercent) / 100);
  
  return {
    posterAmount,
    agentAmount,
    totalAmount: posterAmount + agentAmount,
  };
}

// Types are exported via interface/type declarations above