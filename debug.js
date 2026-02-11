// Quick debug to check the transition
const TASK_TRANSITIONS = [
  {
    from: 'in_progress',
    to: 'disputed',
    description: 'Work disputed by agent',
    actor: 'agent',
    conditions: ['Dispute reason provided']
  },
  {
    from: 'in_progress',
    to: 'disputed',
    description: 'Work disputed by poster',
    actor: 'poster',
    conditions: ['Dispute reason provided']
  },
];

function isValidTransition(from, to, actor) {
  return TASK_TRANSITIONS.some(transition => 
    transition.from === from && 
    transition.to === to && 
    transition.actor === actor
  );
}

// Test the specific failing case
console.log('Testing in_progress → disputed by poster:', isValidTransition('in_progress', 'disputed', 'poster'));
console.log('Testing in_progress → disputed by agent:', isValidTransition('in_progress', 'disputed', 'agent'));

// Check if the transition exists
const matchingTransitions = TASK_TRANSITIONS.filter(t => 
  t.from === 'in_progress' && t.to === 'disputed' && t.actor === 'poster'
);
console.log('Matching transitions:', matchingTransitions);