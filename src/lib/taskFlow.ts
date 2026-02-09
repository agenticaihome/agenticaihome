/**
 * Task Lifecycle Engine
 * Manages the full task state machine with audit trail.
 * localStorage-backed, designed for easy Supabase swap.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type TaskFlowState =
  | 'DRAFT'
  | 'FUNDED'
  | 'BIDDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWING'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'CANCELLED';

export interface TaskFlowBid {
  id: string;
  taskId: string;
  agentId: string;
  agentAddress: string;
  bidAmount: number; // ERG
  proposal: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface TaskFlowEntry {
  taskId: string;
  state: TaskFlowState;
  escrowTxId?: string;
  escrowBoxId?: string;
  fundedAmount?: number; // ERG
  assignedAgentId?: string;
  assignedAgentAddress?: string;
  acceptedBidId?: string;
  deliverableIds: string[];
  disputeReason?: string;
  disputeWinner?: 'client' | 'agent';
  history: StateTransition[];
  createdAt: string;
  updatedAt: string;
}

export interface StateTransition {
  from: TaskFlowState;
  to: TaskFlowState;
  actor: string; // address or role
  timestamp: string;
  metadata?: Record<string, string>;
}

// ─── Valid Transitions ───────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TaskFlowState, TaskFlowState[]> = {
  DRAFT: ['FUNDED', 'CANCELLED'],
  FUNDED: ['BIDDING', 'CANCELLED'],
  BIDDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['REVIEWING'],
  REVIEWING: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  DISPUTED: ['RESOLVED'],
  RESOLVED: [],
  CANCELLED: [],
};

// ─── Storage ─────────────────────────────────────────────────────────

const FLOW_KEY = 'aih_task_flow';
const BIDS_KEY = 'aih_task_flow_bids';

function getFlows(): Record<string, TaskFlowEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FLOW_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveFlows(flows: Record<string, TaskFlowEntry>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FLOW_KEY, JSON.stringify(flows));
}

function getFlowBids(): TaskFlowBid[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BIDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFlowBids(bids: TaskFlowBid[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BIDS_KEY, JSON.stringify(bids));
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── State Machine ──────────────────────────────────────────────────

function transition(
  entry: TaskFlowEntry,
  to: TaskFlowState,
  actor: string,
  metadata?: Record<string, string>
): TaskFlowEntry {
  const from = entry.state;
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`);
  }
  return {
    ...entry,
    state: to,
    updatedAt: new Date().toISOString(),
    history: [
      ...entry.history,
      { from, to, actor, timestamp: new Date().toISOString(), metadata },
    ],
  };
}

// ─── Public API ─────────────────────────────────────────────────────

export function initTaskFlow(taskId: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  if (flows[taskId]) return flows[taskId];

  const entry: TaskFlowEntry = {
    taskId,
    state: 'DRAFT',
    deliverableIds: [],
    history: [{
      from: 'DRAFT',
      to: 'DRAFT',
      actor,
      timestamp: new Date().toISOString(),
      metadata: { action: 'created' },
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function getTaskFlow(taskId: string): TaskFlowEntry | null {
  return getFlows()[taskId] || null;
}

export function fundTask(
  taskId: string,
  escrowTxId: string,
  escrowBoxId: string,
  amount: number,
  actor: string
): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry) entry = initTaskFlow(taskId, actor);

  entry = transition(entry, 'FUNDED', actor, { escrowTxId, amount: String(amount) });
  entry.escrowTxId = escrowTxId;
  entry.escrowBoxId = escrowBoxId;
  entry.fundedAmount = amount;

  // Auto-advance to BIDDING
  entry = transition(entry, 'BIDDING', actor);

  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function submitBid(
  taskId: string,
  agentId: string,
  agentAddress: string,
  bidAmount: number,
  proposal: string
): TaskFlowBid {
  const flow = getTaskFlow(taskId);
  if (!flow || flow.state !== 'BIDDING') {
    throw new Error(`Task ${taskId} is not accepting bids (state: ${flow?.state || 'not found'})`);
  }

  const bid: TaskFlowBid = {
    id: genId(),
    taskId,
    agentId,
    agentAddress,
    bidAmount,
    proposal,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const bids = getFlowBids();
  bids.push(bid);
  saveFlowBids(bids);
  return bid;
}

export function getTaskBidsFlow(taskId: string): TaskFlowBid[] {
  return getFlowBids().filter(b => b.taskId === taskId);
}

export function acceptBid(taskId: string, bidId: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry || entry.state !== 'BIDDING') {
    throw new Error('Task is not in BIDDING state');
  }

  const bids = getFlowBids();
  const bid = bids.find(b => b.id === bidId && b.taskId === taskId);
  if (!bid) throw new Error('Bid not found');

  // Mark bid as accepted, others as rejected
  for (const b of bids) {
    if (b.taskId === taskId) {
      b.status = b.id === bidId ? 'accepted' : 'rejected';
    }
  }
  saveFlowBids(bids);

  entry = transition(entry, 'IN_PROGRESS', actor, { bidId, agentId: bid.agentId });
  entry.assignedAgentId = bid.agentId;
  entry.assignedAgentAddress = bid.agentAddress;
  entry.acceptedBidId = bidId;

  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function submitWork(taskId: string, deliverableId: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry || entry.state !== 'IN_PROGRESS') {
    throw new Error('Task is not IN_PROGRESS');
  }

  entry.deliverableIds.push(deliverableId);
  entry = transition(entry, 'SUBMITTED', actor, { deliverableId });

  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function startReview(taskId: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry || entry.state !== 'SUBMITTED') {
    throw new Error('Task is not SUBMITTED');
  }

  entry = transition(entry, 'REVIEWING', actor);
  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function approveWork(taskId: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry) throw new Error('Task flow not found');

  // Allow from SUBMITTED or REVIEWING
  if (entry.state === 'SUBMITTED') {
    entry = transition(entry, 'REVIEWING', actor);
  }
  if (entry.state !== 'REVIEWING') {
    throw new Error('Task is not in REVIEWING state');
  }

  entry = transition(entry, 'COMPLETED', actor);
  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function disputeWork(taskId: string, reason: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry) throw new Error('Task flow not found');

  if (entry.state === 'SUBMITTED') {
    entry = transition(entry, 'REVIEWING', actor);
  }
  if (entry.state !== 'REVIEWING') {
    throw new Error('Task is not in REVIEWING state');
  }

  entry = transition(entry, 'DISPUTED', actor, { reason });
  entry.disputeReason = reason;
  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function resolveDispute(
  taskId: string,
  winner: 'client' | 'agent',
  actor: string
): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry || entry.state !== 'DISPUTED') {
    throw new Error('Task is not DISPUTED');
  }

  entry = transition(entry, 'RESOLVED', actor, { winner });
  entry.disputeWinner = winner;
  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function cancelTask(taskId: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry) throw new Error('Task flow not found');

  if (!['DRAFT', 'FUNDED', 'BIDDING'].includes(entry.state)) {
    throw new Error('Cannot cancel task after work has started');
  }

  entry = transition(entry, 'CANCELLED', actor);
  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}

export function getTaskHistory(taskId: string): StateTransition[] {
  const flow = getTaskFlow(taskId);
  return flow?.history || [];
}

export function getAllTaskFlows(): TaskFlowEntry[] {
  return Object.values(getFlows());
}

/**
 * Request revision — moves task back to IN_PROGRESS from SUBMITTED/REVIEWING
 * so the agent can resubmit.
 */
export function requestRevision(taskId: string, reason: string, actor: string): TaskFlowEntry {
  const flows = getFlows();
  let entry = flows[taskId];
  if (!entry) throw new Error('Task flow not found');

  if (entry.state === 'SUBMITTED') {
    entry = transition(entry, 'REVIEWING', actor);
  }

  // We need to add IN_PROGRESS as valid from REVIEWING for revisions
  // Instead, just directly set it (special case)
  if (entry.state !== 'REVIEWING') {
    throw new Error('Task is not in a reviewable state');
  }

  // Manual transition for revision (not in standard flow)
  entry = {
    ...entry,
    state: 'IN_PROGRESS',
    updatedAt: new Date().toISOString(),
    history: [
      ...entry.history,
      {
        from: 'REVIEWING',
        to: 'IN_PROGRESS',
        actor,
        timestamp: new Date().toISOString(),
        metadata: { action: 'revision_requested', reason },
      },
    ],
  };

  flows[taskId] = entry;
  saveFlows(flows);
  return entry;
}
