'use client';

import { useState, useCallback } from 'react';
import { createEscrowTx, releaseEscrowTx, refundEscrowTx } from '@/lib/ergo/escrow';
import { connectWallet, getUtxos, getAddress, signTransaction, submitTransaction, getCurrentHeight } from '@/lib/ergo/wallet';
import { txExplorerUrl } from '@/lib/ergo/constants';
import { nanoErgToErg, ergToNanoErg } from '@/lib/ergo/explorer';

type TxState = 'idle' | 'connecting' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

interface EscrowActionsProps {
  taskId: string;
  /** Agent's Ergo address */
  agentAddress: string;
  /** Amount in ERG (e.g. "1.5") */
  amountErg: string;
  /** Deadline as block height. If not set, defaults to currentHeight + 720 (~1 day) */
  deadlineHeight?: number;
  /** Box ID of existing escrow (for release/refund) */
  escrowBoxId?: string;
  /** Current escrow status */
  escrowStatus?: 'unfunded' | 'funded' | 'released' | 'refunded';
  /** Callback after successful fund */
  onFunded?: (txId: string, boxId: string) => void;
  /** Callback after successful release */
  onReleased?: (txId: string) => void;
  /** Callback after successful refund */
  onRefunded?: (txId: string) => void;
}

export default function EscrowActions({
  taskId,
  agentAddress,
  amountErg,
  deadlineHeight,
  escrowBoxId,
  escrowStatus = 'unfunded',
  onFunded,
  onReleased,
  onRefunded,
}: EscrowActionsProps) {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFund = useCallback(async () => {
    setError(null);
    setTxState('connecting');

    try {
      await connectWallet('nautilus');
      setTxState('building');

      const utxos = await getUtxos();
      const changeAddress = await getAddress();
      const height = await getCurrentHeight();
      const deadline = deadlineHeight || height + 720; // ~1 day default

      const amountNanoErg = ergToNanoErg(amountErg);

      const unsignedTx = await createEscrowTx(
        {
          clientAddress: changeAddress,
          agentAddress,
          amountNanoErg,
          deadlineHeight: deadline,
          taskId,
        },
        utxos,
        changeAddress,
      );

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);

      setTxState('submitting');
      const id = await submitTransaction(signedTx);

      setTxId(id);
      setTxState('success');

      // Get actual box ID from the signed transaction outputs
      // The escrow box is the first output (index 0)
      let boxId = '';
      try {
        // signedTx may have outputs with boxId
        const outputs: any[] = (signedTx as any)?.outputs || [];
        if (outputs.length > 0 && outputs[0]?.boxId) {
          boxId = outputs[0].boxId;
        } else {
          // Fallback: fetch from explorer after brief delay
          await new Promise(r => setTimeout(r, 3000));
          const { getTxById } = await import('@/lib/ergo/explorer');
          const tx = await getTxById(id);
          if (tx && (tx as any).outputs?.length > 0) {
            boxId = (tx as any).outputs[0].boxId;
          }
        }
      } catch (e) {
        // Could not get box ID from tx, using txId:0 fallback
      }
      if (!boxId) boxId = `${id}:0`; // last resort fallback
      onFunded?.(id, boxId);
    } catch (err: any) {
      console.error('Fund escrow failed:', err);
      const msg = err?.message || 'Transaction failed';
      // Friendly messages for common errors
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled in wallet. You can try again.');
      } else if (msg.includes('not found') || msg.includes('Not Found')) {
        setError('Nautilus wallet not found. Please install and unlock it.');
      } else if (msg.includes('UTXO') || msg.includes('utxo') || msg.includes('No UTXOs')) {
        setError('Insufficient funds. Make sure your wallet has enough ERG.');
      } else {
        setError(msg);
      }
      setTxState('error');
    }
  }, [taskId, agentAddress, amountErg, deadlineHeight, onFunded]);

  const handleRelease = useCallback(async () => {
    if (!escrowBoxId) return;
    setError(null);
    setTxState('connecting');

    try {
      await connectWallet('nautilus');
      setTxState('building');

      const utxos = await getUtxos();
      const changeAddress = await getAddress();

      const unsignedTx = await releaseEscrowTx(escrowBoxId, agentAddress, utxos, changeAddress);

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);

      setTxState('submitting');
      const id = await submitTransaction(signedTx);

      setTxId(id);
      setTxState('success');
      onReleased?.(id);
    } catch (err: any) {
      console.error('Release escrow failed:', err);
      const msg = err?.message || 'Transaction failed';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled in wallet. You can try again.');
      } else if (msg.includes('not found on-chain')) {
        setError('Escrow box not found on-chain. It may have already been spent.');
      } else {
        setError(msg);
      }
      setTxState('error');
    }
  }, [escrowBoxId, agentAddress, onReleased]);

  const handleRefund = useCallback(async () => {
    if (!escrowBoxId) return;
    setError(null);
    setTxState('connecting');

    try {
      await connectWallet('nautilus');
      setTxState('building');

      const utxos = await getUtxos();
      const changeAddress = await getAddress();

      const unsignedTx = await refundEscrowTx(escrowBoxId, changeAddress, utxos, changeAddress);

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);

      setTxState('submitting');
      const id = await submitTransaction(signedTx);

      setTxId(id);
      setTxState('success');
      onRefunded?.(id);
    } catch (err: any) {
      console.error('Refund escrow failed:', err);
      const msg = err?.message || 'Transaction failed';
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled in wallet. You can try again.');
      } else if (msg.includes('Cannot refund yet')) {
        setError(msg); // Already has helpful block height info
      } else if (msg.includes('not found on-chain')) {
        setError('Escrow box not found on-chain. It may have already been spent.');
      } else {
        setError(msg);
      }
      setTxState('error');
    }
  }, [escrowBoxId, onRefunded]);

  const stateLabels: Record<TxState, string> = {
    idle: '',
    connecting: 'Connecting wallet…',
    building: 'Building transaction…',
    signing: 'Sign in Nautilus…',
    submitting: 'Broadcasting…',
    success: 'Transaction confirmed!',
    error: 'Transaction failed',
  };

  const isProcessing = ['connecting', 'building', 'signing', 'submitting'].includes(txState);

  return (
    <div className="space-y-3">
      {/* Status message */}
      {txState !== 'idle' && (
        <div className={`text-sm px-3 py-2 rounded-lg ${
          txState === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          txState === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
        }`}>
          {isProcessing && <span className="inline-block animate-spin mr-2">⟳</span>}
          {stateLabels[txState]}
          {error && <div className="mt-1 text-xs opacity-80">{error}</div>}
          {txState === 'error' && (
            <button
              onClick={() => { setTxState('idle'); setError(null); }}
              className="mt-1 text-xs underline opacity-70 hover:opacity-100"
            >
              Dismiss & try again
            </button>
          )}
        </div>
      )}

      {/* Tx link */}
      {txId && (
        <a href={txExplorerUrl(txId)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[var(--accent-cyan)] hover:underline">
          View on explorer: <span className="font-mono">{txId.slice(0, 10)}…{txId.slice(-6)}</span> ↗
        </a>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {escrowStatus === 'unfunded' && (
          <button
            onClick={handleFund}
            disabled={isProcessing}
            className="flex-1 py-2.5 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing…' : `Fund Escrow (${amountErg} ERG)`}
          </button>
        )}

        {escrowStatus === 'funded' && escrowBoxId && (
          <>
            <button
              onClick={handleRelease}
              disabled={isProcessing}
              className="flex-1 py-2.5 bg-emerald-500 text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing…' : 'Release Payment'}
            </button>
            <button
              onClick={handleRefund}
              disabled={isProcessing}
              className="py-2.5 px-4 border border-amber-400/30 text-amber-400 rounded-lg hover:bg-amber-400/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refund
            </button>
          </>
        )}
      </div>

      {/* Info */}
      {escrowStatus === 'unfunded' && (
        <p className="text-xs text-[var(--text-secondary)]">
          Nautilus wallet will open to sign. 1% protocol fee on release. Full refund after deadline.
        </p>
      )}
    </div>
  );
}
