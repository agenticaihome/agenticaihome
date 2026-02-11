/**
 * Task Lifecycle State Machine Tests
 * Tests all valid/invalid state transitions and business logic
 */

import {
  TaskStatus,
  isValidTransition,
  getValidTransitions,
  getTransition,
  canActorTransition,
  validateUserAction,
  getNextStatuses,
  isTerminalStatus,
  TASK_STATUS_ORDER,
} from '../src/lib/taskLifecycle';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

function testValidTransitions() {
  console.log('\n--- Testing Valid State Transitions ---');

  // Test all documented valid transitions work
  const validTransitionCases = [
    // From open
    { from: 'open', to: 'funded', actor: 'system' },
    { from: 'open', to: 'cancelled', actor: 'poster' },
    { from: 'open', to: 'in_progress', actor: 'poster' },

    // From funded
    { from: 'funded', to: 'in_progress', actor: 'poster' },
    { from: 'funded', to: 'refunded', actor: 'system' },

    // From in_progress
    { from: 'in_progress', to: 'review', actor: 'agent' },
    { from: 'in_progress', to: 'disputed', actor: 'agent' },
    { from: 'in_progress', to: 'disputed', actor: 'poster' },
    { from: 'in_progress', to: 'cancelled', actor: 'poster' },

    // From review
    { from: 'review', to: 'completed', actor: 'poster' },
    { from: 'review', to: 'in_progress', actor: 'poster' },
    { from: 'review', to: 'disputed', actor: 'poster' },

    // From disputed
    { from: 'disputed', to: 'completed', actor: 'system' },
    { from: 'disputed', to: 'refunded', actor: 'system' },
  ] as const;

  validTransitionCases.forEach(({ from, to, actor }) => {
    const isValid = isValidTransition(from as TaskStatus, to as TaskStatus, actor);
    assert(isValid, `Transition ${from} → ${to} by ${actor} should be valid`);
  });

  console.log('Valid transition tests passed!');
}

function testInvalidTransitions() {
  console.log('\n--- Testing Invalid State Transitions ---');

  // Test transitions that should be rejected
  const invalidTransitionCases = [
    // Can't go backwards (completed → in_progress)
    { from: 'completed', to: 'in_progress', actor: 'poster' },
    { from: 'completed', to: 'open', actor: 'poster' },
    { from: 'refunded', to: 'in_progress', actor: 'poster' },

    // Can't skip states
    { from: 'open', to: 'completed', actor: 'poster' },
    { from: 'open', to: 'review', actor: 'agent' },
    { from: 'funded', to: 'completed', actor: 'poster' },

    // Wrong actor for transition
    { from: 'in_progress', to: 'review', actor: 'poster' }, // Only agent can submit
    { from: 'review', to: 'completed', actor: 'agent' },   // Only poster can approve
    { from: 'open', to: 'funded', actor: 'poster' },       // Only system sets funded

    // Impossible transitions
    { from: 'cancelled', to: 'in_progress', actor: 'poster' },
    { from: 'completed', to: 'cancelled', actor: 'poster' },
    { from: 'refunded', to: 'completed', actor: 'system' },
  ] as const;

  invalidTransitionCases.forEach(({ from, to, actor }) => {
    const isValid = isValidTransition(from as TaskStatus, to as TaskStatus, actor);
    assert(!isValid, `Transition ${from} → ${to} by ${actor} should be INVALID`);
  });

  console.log('Invalid transition tests passed!');
}

function testActorPermissions() {
  console.log('\n--- Testing Actor Permission System ---');

  // Test poster permissions
  const posterAllowedTransitions = [
    { from: 'open', to: 'cancelled' },
    { from: 'open', to: 'in_progress' },
    { from: 'funded', to: 'in_progress' },
    { from: 'in_progress', to: 'disputed' },
    { from: 'in_progress', to: 'cancelled' },
    { from: 'review', to: 'completed' },
    { from: 'review', to: 'in_progress' },
    { from: 'review', to: 'disputed' },
  ];

  posterAllowedTransitions.forEach(({ from, to }) => {
    const canTransition = canActorTransition(from as TaskStatus, to as TaskStatus, 'poster');
    assert(canTransition, `Poster should be able to transition ${from} → ${to}`);
  });

  // Test agent permissions
  const agentAllowedTransitions = [
    { from: 'in_progress', to: 'review' },
    { from: 'in_progress', to: 'disputed' },
  ];

  agentAllowedTransitions.forEach(({ from, to }) => {
    const canTransition = canActorTransition(from as TaskStatus, to as TaskStatus, 'agent');
    assert(canTransition, `Agent should be able to transition ${from} → ${to}`);
  });

  // Test system permissions
  const systemAllowedTransitions = [
    { from: 'open', to: 'funded' },
    { from: 'funded', to: 'refunded' },
    { from: 'disputed', to: 'completed' },
    { from: 'disputed', to: 'refunded' },
  ];

  systemAllowedTransitions.forEach(({ from, to }) => {
    const canTransition = canActorTransition(from as TaskStatus, to as TaskStatus, 'system');
    assert(canTransition, `System should be able to transition ${from} → ${to}`);
  });

  // Test denied permissions
  const agentDeniedTransitions = [
    { from: 'review', to: 'completed' }, // Only poster can approve
    { from: 'open', to: 'cancelled' },   // Only poster can cancel
  ];

  agentDeniedTransitions.forEach(({ from, to }) => {
    const canTransition = canActorTransition(from as TaskStatus, to as TaskStatus, 'agent');
    assert(!canTransition, `Agent should NOT be able to transition ${from} → ${to}`);
  });

  console.log('Actor permission tests passed!');
}

function testUserActionValidation() {
  console.log('\n--- Testing User Action Validation ---');

  const posterAddress = '9fRusudBKtVm2PRdaPfNnkX6GCwHn8cYdAxdMYMPokdEQZvJ8pT';
  const agentAddress = '9fRusudBKtVm2PRdaPfNnkX6GCwHn8cYdAxdMYMPokdEQZvJ8pU';
  const randomAddress = '9fRusudBKtVm2PRdaPfNnkX6GCwHn8cYdAxdMYMPokdEQZvJ8pX';

  // Test poster actions
  const posterCancelValid = validateUserAction(
    'open',
    'cancelled',
    posterAddress,
    posterAddress
  );
  assert(posterCancelValid.valid, 'Poster should be able to cancel their own task');
  assert(posterCancelValid.userRole === 'poster', 'User role should be identified as poster');

  // Test agent actions
  const agentSubmitValid = validateUserAction(
    'in_progress',
    'review',
    agentAddress,
    posterAddress,
    agentAddress
  );
  assert(agentSubmitValid.valid, 'Agent should be able to submit deliverable');
  assert(agentSubmitValid.userRole === 'agent', 'User role should be identified as agent');

  // Test unauthorized actions
  const randomUserAction = validateUserAction(
    'open',
    'cancelled',
    randomAddress,
    posterAddress
  );
  assert(!randomUserAction.valid, 'Random user should not be able to cancel task');
  assert(randomUserAction.userRole === 'viewer', 'Random user should be identified as viewer');

  // Test agent trying poster action
  const agentTryingApproval = validateUserAction(
    'review',
    'completed',
    agentAddress,
    posterAddress,
    agentAddress
  );
  assert(!agentTryingApproval.valid, 'Agent should not be able to approve their own work');

  // Test poster trying agent action
  const posterTryingSubmit = validateUserAction(
    'in_progress',
    'review',
    posterAddress,
    posterAddress,
    agentAddress
  );
  assert(!posterTryingSubmit.valid, 'Poster should not be able to submit deliverable for agent');

  console.log('User action validation tests passed!');
}

function testStateMachineUtilities() {
  console.log('\n--- Testing State Machine Utility Functions ---');

  // Test getNextStatuses
  const openNextStatuses = getNextStatuses('open');
  const expectedOpenNext: TaskStatus[] = ['funded', 'cancelled', 'in_progress'];
  expectedOpenNext.forEach(status => {
    assert(openNextStatuses.includes(status), `'open' should have '${status}' as next status`);
  });

  const completedNextStatuses = getNextStatuses('completed');
  assert(completedNextStatuses.length === 0, 'Completed tasks should have no next statuses');

  // Test terminal status detection
  assert(isTerminalStatus('completed'), 'Completed should be terminal status');
  assert(isTerminalStatus('cancelled'), 'Cancelled should be terminal status');
  assert(isTerminalStatus('refunded'), 'Refunded should be terminal status');
  assert(!isTerminalStatus('open'), 'Open should not be terminal status');
  assert(!isTerminalStatus('in_progress'), 'In progress should not be terminal status');

  // Test transition lookup
  const openToProgressTransition = getTransition('open', 'in_progress');
  assert(openToProgressTransition !== null, 'Should find transition from open to in_progress');
  assert(openToProgressTransition!.actor === 'poster', 'Transition should be by poster');

  const invalidTransition = getTransition('completed', 'open');
  assert(invalidTransition === null, 'Should not find invalid transition');

  console.log('State machine utility tests passed!');
}

function testCompleteWorkflows() {
  console.log('\n--- Testing Complete Task Workflows ---');

  // Test happy path: open → funded → in_progress → review → completed
  const happyPathStates: TaskStatus[] = ['open', 'funded', 'in_progress', 'review', 'completed'];
  
  for (let i = 0; i < happyPathStates.length - 1; i++) {
    const from = happyPathStates[i];
    const to = happyPathStates[i + 1];
    
    // Determine expected actor
    let expectedActor: 'poster' | 'agent' | 'system';
    if (from === 'open' && to === 'funded') expectedActor = 'system';
    else if (from === 'in_progress' && to === 'review') expectedActor = 'agent';
    else expectedActor = 'poster';

    const isValid = isValidTransition(from, to, expectedActor);
    assert(isValid, `Happy path transition ${from} → ${to} should be valid`);
  }

  // Test cancellation path: open → cancelled
  assert(isValidTransition('open', 'cancelled', 'poster'), 'Early cancellation should work');

  // Test refund path: funded → refunded
  assert(isValidTransition('funded', 'refunded', 'system'), 'Auto-refund should work');

  // Test dispute resolution paths
  assert(isValidTransition('in_progress', 'disputed', 'agent'), 'Agent can dispute during work');
  assert(isValidTransition('review', 'disputed', 'poster'), 'Poster can dispute during review');
  assert(isValidTransition('disputed', 'completed', 'system'), 'System can resolve dispute to completion');
  assert(isValidTransition('disputed', 'refunded', 'system'), 'System can resolve dispute to refund');

  // Test revision workflow: review → in_progress → review → completed
  assert(isValidTransition('review', 'in_progress', 'poster'), 'Poster can request revisions');
  assert(isValidTransition('in_progress', 'review', 'agent'), 'Agent can resubmit after revisions');

  console.log('Complete workflow tests passed!');
}

function testStatusOrdering() {
  console.log('\n--- Testing Status Ordering ---');

  // Verify all statuses are included in order
  const expectedStatuses: TaskStatus[] = [
    'open', 'funded', 'in_progress', 'review', 'completed', 'cancelled', 'refunded', 'disputed'
  ];

  expectedStatuses.forEach(status => {
    assert(TASK_STATUS_ORDER.includes(status), `Status '${status}' should be in TASK_STATUS_ORDER`);
  });

  assert(TASK_STATUS_ORDER.length === expectedStatuses.length, 'Status order should include all statuses');

  // Check logical ordering
  assert(TASK_STATUS_ORDER.indexOf('open') < TASK_STATUS_ORDER.indexOf('in_progress'), 
    'Open should come before in_progress');
  assert(TASK_STATUS_ORDER.indexOf('in_progress') < TASK_STATUS_ORDER.indexOf('review'), 
    'In_progress should come before review');
  assert(TASK_STATUS_ORDER.indexOf('review') < TASK_STATUS_ORDER.indexOf('completed'), 
    'Review should come before completed');

  console.log('Status ordering tests passed!');
}

function testEdgeCases() {
  console.log('\n--- Testing Edge Cases ---');

  // Test self-transitions (should be invalid)
  const allStatuses: TaskStatus[] = ['open', 'funded', 'in_progress', 'review', 'completed', 'cancelled', 'refunded', 'disputed'];
  
  allStatuses.forEach(status => {
    const selfTransition = isValidTransition(status, status, 'poster');
    assert(!selfTransition, `Self-transition ${status} → ${status} should be invalid`);
  });

  // Test invalid status inputs
  const invalidStatus = 'invalid_status' as TaskStatus;
  const invalidTransition = isValidTransition(invalidStatus, 'completed', 'poster');
  assert(!invalidTransition, 'Transition from invalid status should be rejected');

  // Test getValidTransitions with no matches
  const noValidTransitions = getValidTransitions('completed', 'agent');
  assert(noValidTransitions.length === 0, 'No valid transitions should exist from completed status for agent');

  // Test disputed task can only be resolved by system
  assert(!canActorTransition('disputed', 'completed', 'poster'), 'Poster cannot resolve disputes');
  assert(!canActorTransition('disputed', 'completed', 'agent'), 'Agent cannot resolve disputes');
  assert(canActorTransition('disputed', 'completed', 'system'), 'Only system can resolve disputes');

  console.log('Edge cases tests passed!');
}

async function runAllTests() {
  console.log('🔄 Starting Task Lifecycle State Machine Tests...');

  try {
    testValidTransitions();
    testInvalidTransitions();
    testActorPermissions();
    testUserActionValidation();
    testStateMachineUtilities();
    testCompleteWorkflows();
    testStatusOrdering();
    testEdgeCases();

    console.log('\n🎉 All task lifecycle tests passed!');
    return true;
  } catch (error) {
    console.error('\n💥 Test failed:', (error as Error).message);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default runAllTests;