const steps = ['Open', 'Assigned', 'In Progress', 'Review', 'Complete'] as const;

const statusToStep: Record<string, number> = {
  open: 0, assigned: 1, in_progress: 2, review: 3, completed: 4, disputed: -1,
};

export default function EscrowStatus({ status, escrowTxId }: { status: string; escrowTxId?: string }) {
  const current = statusToStep[status] ?? 0;
  const isDisputed = status === 'disputed';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                i <= current
                  ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                  : 'border-[var(--border-color)] text-[var(--text-muted)]'
              }`}>
                {i <= current ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${i <= current ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${i < current ? 'bg-[var(--accent-green)]' : 'bg-[var(--border-color)]'}`} />
            )}
          </div>
        ))}
      </div>

      {isDisputed && (
        <div className="px-4 py-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 text-[#f59e0b] text-sm">
          ⚠️ This task is currently under dispute
        </div>
      )}

      {escrowTxId && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
          Escrow funded — <span className="font-mono">{escrowTxId.slice(0, 12)}...{escrowTxId.slice(-4)}</span>
        </div>
      )}
    </div>
  );
}
