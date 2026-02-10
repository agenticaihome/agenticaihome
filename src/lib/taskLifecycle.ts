/**
 * Task Lifecycle State Machine
 * Defines valid task status transitions and validation logic
 */

export type TaskStatus = 
  | 'open'        // Created, accepting bids
  | 'funded'      // Escrow TX confirmed (if needed as intermediate state)
  | 'in_progress' // Bid accepted, work in progress
  | 'review'      // Work submitted, waiting for approval
  | 'completed'   // Work approved and payment released
  | 'cancelled'   // Cancelled by poster
  | 'refunded'    // Escrow refunded
  | 'disputed';   // In dispute

export interface TaskTransition {
  from: TaskStatus;
  to: TaskStatus;
  description: string;
  actor: 'poster' | 'agent' | 'system';
  conditions?: string[];
}

/**
 * Valid task status transitions based on the state machine
 */
export const TASK_TRANSITIONS: TaskTransition[] = [
  // From open
  {
    from: 'open',
    to: 'funded',
    description: 'Escrow transaction confirmed',
    actor: 'system',
    conditions: ['Escrow TX confirmed on blockchain']
  },
  {
    from: 'open',
    to: 'cancelled',
    description: 'Task cancelled by poster',
    actor: 'poster',
    conditions: ['No bids accepted yet']
  },
  {
    from: 'open',
    to: 'in_progress',
    description: 'Bid accepted (direct transition)',
    actor: 'poster',
    conditions: ['Valid bid selected', 'Agent available']
  },

  // From funded
  {
    from: 'funded',
    to: 'in_progress',
    description: 'Bid accepted',
    actor: 'poster',
    conditions: ['Valid bid selected', 'Agent available']
  },
  {
    from: 'funded',
    to: 'refunded',
    description: 'Refund height passed',
    actor: 'system',
    conditions: ['Refund block height reached', 'No bid accepted']
  },

  // From in_progress
  {
    from: 'in_progress',
    to: 'review',
    description: 'Deliverable submitted by agent',
    actor: 'agent',
    conditions: ['Work submission provided']
  },

  // From review
  {
    from: 'review',
    to: 'completed',
    description: 'Work approved and payment released',
    actor: 'poster',
    conditions: ['Work meets requirements']
  },
  {
    from: 'review',
    to: 'in_progress',
    description: 'Work rejected, requesting revision',
    actor: 'poster',
    conditions: ['Specific revision feedback provided']
  },
  {
    from: 'review',
    to: 'disputed',
    description: 'Work disputed',
    actor: 'poster',
    conditions: ['Dispute reason provided']
  }
];

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus, actor: 'poster' | 'agent' | 'system'): boolean {
  return TASK_TRANSITIONS.some(transition => 
    transition.from === from && 
    transition.to === to && 
    transition.actor === actor
  );
}

/**
 * Get all valid transitions from a given status
 */
export function getValidTransitions(from: TaskStatus, actor?: 'poster' | 'agent' | 'system'): TaskTransition[] {
  return TASK_TRANSITIONS.filter(transition => {
    if (transition.from !== from) return false;
    if (actor && transition.actor !== actor) return false;
    return true;
  });
}

/**
 * Get the transition object for a specific status change
 */
export function getTransition(from: TaskStatus, to: TaskStatus): TaskTransition | null {
  return TASK_TRANSITIONS.find(transition => 
    transition.from === from && transition.to === to
  ) || null;
}

/**
 * Check if an actor can perform a specific transition
 */
export function canActorTransition(from: TaskStatus, to: TaskStatus, actor: 'poster' | 'agent' | 'system'): boolean {
  const transition = getTransition(from, to);
  return transition ? transition.actor === actor : false;
}

/**
 * Get human-readable description of what actions are available for a task
 */
export function getAvailableActions(
  status: TaskStatus, 
  userRole: 'poster' | 'agent' | 'viewer'
): { action: string; description: string; transition: TaskTransition }[] {
  const actorMap: { [key in typeof userRole]: 'poster' | 'agent' | 'system' | null } = {
    poster: 'poster',
    agent: 'agent',
    viewer: null
  };

  const actor = actorMap[userRole];
  if (!actor) return [];

  return getValidTransitions(status, actor).map(transition => ({
    action: getActionName(transition),
    description: transition.description,
    transition
  }));
}

/**
 * Convert transition to user-friendly action name
 */
function getActionName(transition: TaskTransition): string {
  const actionMap: { [key: string]: string } = {
    'open->cancelled': 'Cancel Task',
    'open->in_progress': 'Accept Bid',
    'funded->in_progress': 'Accept Bid',
    'in_progress->review': 'Submit Deliverable',
    'review->completed': 'Approve Work',
    'review->in_progress': 'Request Revision',
    'review->disputed': 'Dispute Work'
  };

  const key = `${transition.from}->${transition.to}`;
  return actionMap[key] || `${transition.from} → ${transition.to}`;
}

/**
 * Validate that a user can perform an action on a task
 */
export function validateUserAction(
  taskStatus: TaskStatus,
  targetStatus: TaskStatus,
  userAddress: string,
  taskCreatorAddress: string,
  acceptedAgentAddress?: string
): { valid: boolean; reason?: string; userRole?: 'poster' | 'agent' | 'viewer' } {
  // Determine user role
  let userRole: 'poster' | 'agent' | 'viewer' = 'viewer';
  
  if (userAddress === taskCreatorAddress) {
    userRole = 'poster';
  } else if (acceptedAgentAddress && userAddress === acceptedAgentAddress) {
    userRole = 'agent';
  }

  // Check if transition is valid for this actor
  if (!canActorTransition(taskStatus, targetStatus, userRole === 'viewer' ? 'system' : userRole)) {
    return {
      valid: false,
      reason: `${userRole} cannot perform this action on tasks with status '${taskStatus}'`,
      userRole
    };
  }

  return { valid: true, userRole };
}

/**
 * Get next possible statuses for a task
 */
export function getNextStatuses(currentStatus: TaskStatus): TaskStatus[] {
  return TASK_TRANSITIONS
    .filter(t => t.from === currentStatus)
    .map(t => t.to);
}

/**
 * Check if a task is in a terminal state (no further transitions possible)
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  return getNextStatuses(status).length === 0;
}

/**
 * Get all task statuses ordered by typical workflow progression
 */
export const TASK_STATUS_ORDER: TaskStatus[] = [
  'open',
  'funded',
  'in_progress',
  'review',
  'completed',
  'cancelled',
  'refunded',
  'disputed'
];