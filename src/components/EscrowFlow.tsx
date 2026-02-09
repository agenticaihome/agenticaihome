'use client';

import { useState, useEffect } from 'react';
import { txExplorerUrl } from '@/lib/ergo/constants';
import { ERGO_EXPLORER_UI, PLATFORM_FEE_PERCENT } from '@/lib/ergo/constants';
import { nanoErgToErg } from '@/lib/ergo/explorer';

export type EscrowStatus = 'unfunded' | 'funded' | 'in_progress' | 'delivered' | 'released' | 'refunded' | 'disputed';

export interface EscrowFlowProps {
  status: EscrowStatus;
  amountNanoErg?: bigint | string;
  deadlineHeight?: number;
  currentHeight?: number;
  fundTxId?: string;
  releaseTxId?: string;
  refundTxId?: string;
  agentAddress?: string;
  onFund?: () => void;
  onRelease?: () => void;
  onRefund?: () => void;
  onDispute?: () => void;
}

const STATUS_CONFIG: Record<EscrowStatus, { label: string; icon: string; color: string; glow?: string }> = {
  unfunded: { label: 'Unfunded', icon: '○', color: 'text-gray-400' },
  funded: { label: 'Funded', icon: '🔒', color: 'text-[var(--accent-green)]', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]' },
  in_progress: { label: 'In Progress', icon: '⚙️', color: 'text-[var(--accent-cyan)]' },
  delivered: { label: 'Delivered', icon: '📦', color: 'text-blue-400' },
  released: { label: 'Released', icon: '✅', color: 'text-[var(--accent-green)]' },
  refunded: { label: 'Refunded', icon: '↩️', color: 'text-amber-400' },
  disputed: { label: 'Disputed', icon: '⚠️', color: 'text-red-400' },
};

const PROGRESS_STEPS: EscrowStatus[] = ['funded', 'in_progress', 'delivered', 'released'];

export default function EscrowFlow({
  status,
  amountNanoErg,
  deadlineHeight,
  currentHeight,
  fundTxId,
  releaseTxId,
  refundTxId,
  onFund,
  onRelease,
  onRefund,
  onDispute,
}: EscrowFlowProps) {
  const config = STATUS_CONFIG[status];
  const amount = amountNanoErg ? nanoErgToErg(typeof amountNanoErg === 'string' ? BigInt(amountNanoErg) : amountNanoErg) : null;
  const blocksRemaining = deadlineHeight && currentHeight ? Math.max(0, deadlineHeight - currentHeight) : null;
  const deadlinePassed = blocksRemaining !== null && blocksRemaining === 0;

  // Calculate amounts
  const grossBigInt = amountNanoErg ? (typeof amountNanoErg === 'string' ? BigInt(amountNanoErg) : amountNanoErg) : 0n;
  const feeBigInt = (grossBigInt * BigInt(PLATFORM_FEE_PERCENT)) / 100n;
  const netBigInt = grossBigInt - feeBigInt;

  // Progress bar
  const activeStepIdx = PROGRESS_STEPS.indexOf(status);
  const showProgress = status !== 'unfunded' && status !== 'refunded' && status !== 'disputed';

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden ${config.glow || ''}`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`font-semibold ${config.color}`}>{config.label}</span>
        </div>
        {amount && (
          <span className="text-lg font-bold text-[var(--text-primary)]">Σ{amount} ERG</span>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-1">
            {PROGRESS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-3 h-3 rounded-full ${i <= activeStepIdx ? 'bg-[var(--accent-green)]' : 'bg-[var(--border)]'}`} />
                {i < PROGRESS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < activeStepIdx ? 'bg-[var(--accent-green)]' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {PROGRESS_STEPS.map(s => (
              <span key={s} className="text-[10px] text-[var(--text-secondary)]">{STATUS_CONFIG[s].label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
        {/* Deadline countdown */}
        {blocksRemaining !== null && status !== 'released' && status !== 'refunded' && (
          <div className={`text-sm ${deadlinePassed ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
            {deadlinePassed
              ? '⏰ Deadline passed — refund available'
              : `⏳ ${blocksRemaining.toLocaleString()} blocks until deadline (~${Math.round(blocksRemaining * 2 / 60)}h)`}
          </div>
        )}

        {/* Release breakdown */}
        {status === 'released' && grossBigInt > 0n && (
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Agent ({100 - PLATFORM_FEE_PERCENT}%)</span>
              <span>Σ{nanoErgToErg(netBigInt)} ERG</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Protocol ({PLATFORM_FEE_PERCENT}%)</span>
              <span>Σ{nanoErgToErg(feeBigInt)} ERG</span>
            </div>
          </div>
        )}

        {/* Disputed status */}
        {status === 'disputed' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            This escrow is under arbitration. A resolution is pending.
          </div>
        )}

        {/* Transaction links */}
        <div className="space-y-1">
          {fundTxId && <TxLink label="Fund tx" txId={fundTxId} />}
          {releaseTxId && <TxLink label="Release tx" txId={releaseTxId} />}
          {refundTxId && <TxLink label="Refund tx" txId={refundTxId} />}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {status === 'unfunded' && onFund && (
            <button onClick={onFund}
              className="flex-1 py-2 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
              Fund Escrow
            </button>
          )}
          {(status === 'delivered') && onRelease && (
            <button onClick={onRelease}
              className="flex-1 py-2 bg-[var(--accent-green)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
              Release Payment
            </button>
          )}
          {deadlinePassed && status !== 'released' && status !== 'refunded' && onRefund && (
            <button onClick={onRefund}
              className="flex-1 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
              Claim Refund
            </button>
          )}
          {status === 'funded' && onDispute && (
            <button onClick={onDispute}
              className="py-2 px-4 border border-red-400/30 text-red-400 rounded-lg hover:bg-red-400/10 transition-colors text-sm">
              Dispute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TxLink({ label, txId }: { label: string; txId: string }) {
  return (
    <a href={txExplorerUrl(txId)} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs text-[var(--accent-cyan)] hover:underline">
      <span>{label}:</span>
      <span className="font-mono">{txId.slice(0, 8)}...{txId.slice(-6)}</span>
      <span>↗</span>
    </a>
  );
}
