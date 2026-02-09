'use client';

import { useState, useEffect, useCallback } from 'react';
import { txExplorerUrl, ERGO_EXPLORER_API } from '@/lib/ergo/constants';

export type TxPhase = 'signing' | 'broadcasting' | 'confirming' | 'confirmed' | 'failed';

interface TxStatusProps {
  phase: TxPhase;
  txId?: string;
  error?: string;
  onRetry?: () => void;
  /** Auto-poll for confirmation when txId is set and phase is confirming */
  autoPoll?: boolean;
  onConfirmed?: (txId: string) => void;
}

export default function TxStatus({ phase, txId, error, onRetry, autoPoll = true, onConfirmed }: TxStatusProps) {
  const [confirmations, setConfirmations] = useState(0);

  // Poll for confirmations
  useEffect(() => {
    if (!autoPoll || phase !== 'confirming' || !txId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${ERGO_EXPLORER_API}/transactions/${txId}`);
        if (res.ok) {
          const data = await res.json();
          const numConf = data.numConfirmations ?? 0;
          if (!cancelled) {
            setConfirmations(numConf);
            if (numConf >= 1) {
              onConfirmed?.(txId);
            }
          }
        }
      } catch {
        // silently retry
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [phase, txId, autoPoll, onConfirmed]);

  const config: Record<TxPhase, { icon: React.ReactNode; label: string; sublabel?: string; color: string }> = {
    signing: {
      icon: <Spinner />,
      label: 'Waiting for signature...',
      sublabel: 'Please confirm in your wallet',
      color: 'text-[var(--accent-cyan)]',
    },
    broadcasting: {
      icon: <Spinner />,
      label: 'Broadcasting...',
      sublabel: 'Submitting transaction to the network',
      color: 'text-[var(--accent-cyan)]',
    },
    confirming: {
      icon: <Spinner />,
      label: 'Confirming...',
      sublabel: confirmations > 0 ? `${confirmations} confirmation${confirmations !== 1 ? 's' : ''}` : 'Waiting for block inclusion',
      color: 'text-amber-400',
    },
    confirmed: {
      icon: <span className="text-2xl">✅</span>,
      label: 'Confirmed',
      sublabel: confirmations > 0 ? `${confirmations} confirmations` : undefined,
      color: 'text-[var(--accent-green)]',
    },
    failed: {
      icon: <span className="text-2xl">❌</span>,
      label: 'Transaction Failed',
      sublabel: error || 'An error occurred',
      color: 'text-red-400',
    },
  };

  const c = config[phase];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${c.color}`}>{c.label}</div>
          {c.sublabel && <div className="text-sm text-[var(--text-secondary)] truncate">{c.sublabel}</div>}
        </div>
      </div>

      {txId && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <a href={txExplorerUrl(txId)} target="_blank" rel="noopener noreferrer"
            className="text-sm text-[var(--accent-cyan)] hover:underline flex items-center gap-1">
            <span className="font-mono">{txId.slice(0, 12)}...{txId.slice(-8)}</span>
            <span>↗</span>
          </a>
        </div>
      )}

      {phase === 'failed' && onRetry && (
        <button onClick={onRetry}
          className="mt-3 w-full py-2 border border-red-400/30 text-red-400 rounded-lg hover:bg-red-400/10 transition-colors text-sm font-medium">
          Retry Transaction
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-6 h-6 animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
    </svg>
  );
}

/**
 * Hook to manage transaction lifecycle.
 * Usage:
 *   const tx = useTxLifecycle();
 *   tx.start();
 *   const signed = await signTx(unsignedTx); tx.signed();
 *   const txId = await submitTx(signed); tx.submitted(txId);
 *   // auto-polls for confirmation
 */
export function useTxLifecycle() {
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [txId, setTxId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const start = useCallback(() => { setPhase('signing'); setTxId(undefined); setError(undefined); }, []);
  const signed = useCallback(() => setPhase('broadcasting'), []);
  const submitted = useCallback((id: string) => { setTxId(id); setPhase('confirming'); }, []);
  const confirmed = useCallback(() => setPhase('confirmed'), []);
  const fail = useCallback((msg: string) => { setError(msg); setPhase('failed'); }, []);
  const reset = useCallback(() => { setPhase(null); setTxId(undefined); setError(undefined); }, []);

  return { phase, txId, error, start, signed, submitted, confirmed, fail, reset };
}
