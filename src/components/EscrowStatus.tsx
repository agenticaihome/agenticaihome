import type { TaskFlowState } from '@/lib/taskFlow';

const FLOW_STEPS: { key: TaskFlowState; label: string }[] = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'FUNDED', label: 'Funded' },
  { key: 'BIDDING', label: 'Bidding' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'REVIEWING', label: 'Reviewing' },
  { key: 'COMPLETED', label: 'Complete' },
];

const stateIndex: Record<string, number> = {};
FLOW_STEPS.forEach((s, i) => { stateIndex[s.key] = i; });

// Map legacy task statuses to flow states
const legacyMap: Record<string, TaskFlowState> = {
  open: 'BIDDING',
  assigned: 'IN_PROGRESS',
  in_progress: 'IN_PROGRESS',
  review: 'REVIEWING',
  completed: 'COMPLETED',
  disputed: 'DISPUTED',
};

interface Props {
  status: string;
  flowState?: TaskFlowState;
  escrowTxId?: string;
  fundedAmount?: number;
}

export default function EscrowStatus({ status, flowState, escrowTxId, fundedAmount }: Props) {
  const state = flowState || legacyMap[status] || 'DRAFT';
  const current = stateIndex[state] ?? -1;
  const isDisputed = state === 'DISPUTED';
  const isResolved = state === 'RESOLVED';
  const isCancelled = state === 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {FLOW_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i <= current && current >= 0
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                  : 'border-slate-600 text-gray-500'
              }`}>
                {i <= current && current >= 0 ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${
                i <= current && current >= 0 ? 'text-emerald-400' : 'text-gray-500'
              }`}>{step.label}</span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${
                i < current ? 'bg-emerald-400' : 'bg-slate-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Special states */}
      {isDisputed && (
        <div className="px-4 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-400 text-sm">
          ⚠️ This task is currently under dispute
        </div>
      )}

      {isResolved && (
        <div className="px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/5 text-blue-400 text-sm">
          ✅ Dispute has been resolved
        </div>
      )}

      {isCancelled && (
        <div className="px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          ❌ Task has been cancelled
        </div>
      )}

      {/* Escrow info */}
      {escrowTxId && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Escrow funded
          {fundedAmount != null && <span>— {fundedAmount} ERG locked</span>}
          <span className="font-mono ml-1">{escrowTxId.slice(0, 12)}...{escrowTxId.slice(-4)}</span>
        </div>
      )}
    </div>
  );
}
