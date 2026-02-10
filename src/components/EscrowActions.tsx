'use client';

import { useState, useCallback } from 'react';
import { createEscrowTx, releaseEscrowTx, refundEscrowTx } from '@/lib/ergo/escrow';
import { mintEgoAfterRelease } from '@/lib/ergo/ego-token';
import { notifyPaymentReleased } from '@/lib/notifications';
import { logEscrowFunded, logEscrowReleased, logEscrowRefunded, logEgoMinted } from '@/lib/taskEvents';
import { connectWallet, getUtxos, getAddress, signTransaction, submitTransaction, getCurrentHeight } from '@/lib/ergo/wallet';
import { txExplorerUrl } from '@/lib/ergo/constants';
import { nanoErgToErg, ergToNanoErg } from '@/lib/ergo/explorer';

type TxState = 'idle' | 'connecting' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

interface EscrowActionsProps {
  taskId: string;
  /** Agent's Ergo address */
  agentAddress: string;
  /** Agent's display name (for EGO token naming) */
  agentName?: string;
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

interface EgoMintResult {
  success: boolean;
  txId?: string;
  error?: string;
}

export default function EscrowActions({
  taskId,
  agentAddress,
  agentName = 'Agent',
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
  const [egoMintResult, setEgoMintResult] = useState<EgoMintResult | null>(null);

  const handleFund = useCallback(async () => {
    setError(null);
    setEgoMintResult(null);
    setTxState('connecting');

    try {
      // Enhanced wallet connection with timeout
      const connectPromise = connectWallet('nautilus');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      setTxState('building');

      // Validate wallet has sufficient funds first
      const [utxos, changeAddress, height] = await Promise.all([
        getUtxos(),
        getAddress(), 
        getCurrentHeight()
      ]);

      // Check if user has enough ERG
      const amountNanoErg = ergToNanoErg(amountErg);
      const txFee = 1100000n; // 0.0011 ERG recommended fee
      const totalNeeded = amountNanoErg + txFee;
      
      const totalBalance = utxos.reduce((sum: bigint, utxo: any) => {
        return sum + BigInt(utxo.value || 0);
      }, 0n);

      if (totalBalance < totalNeeded) {
        const neededErg = nanoErgToErg(totalNeeded);
        const balanceErg = nanoErgToErg(totalBalance);
        throw new Error(`Insufficient funds. Need ${neededErg} ERG total (including fees), but wallet only has ${balanceErg} ERG.`);
      }

      const deadline = deadlineHeight || height + 720; // ~1 day default

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
      
      // Add timeout to transaction submission
      const submitPromise = submitTransaction(signedTx);
      const submitTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction submission timeout after 60 seconds. Please check the explorer manually.')), 60000)
      );
      
      const id = await Promise.race([submitPromise, submitTimeoutPromise]);

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
      logEscrowFunded(taskId, changeAddress, id, parseFloat(amountErg)).catch(() => {});
    } catch (err: any) {
      console.error('Fund escrow failed:', err);
      const msg = err?.message || 'Transaction failed';
      
      // Enhanced user-friendly error messages
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled in wallet. No funds were transferred. You can try again.');
      } else if (msg.includes('not found') || msg.includes('Not Found') || msg.includes('wallet not available')) {
        setError('Nautilus wallet not found or locked. Please install Nautilus Wallet and unlock it, then try again.');
      } else if (msg.includes('UTXO') || msg.includes('utxo') || msg.includes('No UTXOs') || msg.includes('Insufficient funds')) {
        setError(msg.includes('Need ') ? msg : 'Insufficient funds. Please add more ERG to your wallet and try again.');
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        setError('Connection or transaction timeout. Your funds are safe. Please check the transaction explorer or try again.');
      } else if (msg.includes('network') || msg.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(`Transaction failed: ${msg}`);
      }
      setTxState('error');
    }
  }, [taskId, agentAddress, amountErg, deadlineHeight, onFunded]);

  const handleRelease = useCallback(async () => {
    if (!escrowBoxId) return;
    setError(null);
    setEgoMintResult(null);
    setTxState('connecting');

    try {
      // Enhanced wallet connection with timeout
      const connectPromise = connectWallet('nautilus');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      setTxState('building');

      const utxos = await getUtxos();
      const changeAddress = await getAddress();

      // Validate escrow box still exists before proceeding
      const { getBoxById } = await import('@/lib/ergo/explorer');
      const escrowBox = await getBoxById(escrowBoxId);
      if (!escrowBox) {
        throw new Error('Escrow box not found on-chain. It may have already been spent or the box ID is incorrect.');
      }

      const unsignedTx = await releaseEscrowTx(escrowBoxId, agentAddress, utxos, changeAddress);

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);

      setTxState('submitting');
      
      // Add timeout to transaction submission
      const submitPromise = submitTransaction(signedTx);
      const submitTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction submission timeout after 60 seconds')), 60000)
      );
      
      const id = await Promise.race([submitPromise, submitTimeoutPromise]);

      setTxId(id);
      setTxState('success');
      onReleased?.(id);

      // Fire-and-forget: notify agent + log event
      const ergAmount = parseFloat(amountErg) || 0;
      notifyPaymentReleased(taskId, agentAddress, ergAmount * 0.99).catch(() => {});
      logEscrowReleased(taskId, changeAddress, id, ergAmount).catch(() => {});

      // Auto-mint soulbound EGO tokens for the agent (with improved timing)
      // Wait for the release TX to confirm before minting to avoid UTXO conflicts
      setTimeout(async () => {
        try {
          // Wait for blockchain confirmation (30 seconds should be enough for most cases)
          await new Promise(resolve => setTimeout(resolve, 30000));
          
          // Get fresh UTXOs after the release transaction has been processed
          const minterUtxos = await getUtxos();
          const minterAddress = await getAddress();
          
          // Verify we have sufficient UTXOs for minting
          if (!minterUtxos || minterUtxos.length === 0) {
            console.warn('No UTXOs available for EGO minting after release');
            setEgoMintResult({ success: false, error: 'No UTXOs available' });
            return;
          }
          
          const egoTx = await mintEgoAfterRelease({
            agentAddress,
            agentName,
            minterAddress,
            minterUtxos,
          });
          const signedEgo = await signTransaction(egoTx);
          const egoTxId = await submitTransaction(signedEgo);
          
          setEgoMintResult({ success: true, txId: egoTxId });
          logEgoMinted(taskId, agentAddress, egoTxId, 10).catch(() => {});
        } catch (egoErr: any) {
          // EGO mint failure shouldn't block the release success
          console.error('EGO mint after release failed (non-blocking):', egoErr?.message);
          const egoErrorMsg = egoErr?.message || 'Unknown error';
          
          setEgoMintResult({ success: false, error: egoErrorMsg });
          
          // If it's a UTXO conflict, try again after more delay
          if (egoErrorMsg.includes('UTXO') || egoErrorMsg.includes('input')) {
            setTimeout(async () => {
              try {
                console.log('Retrying EGO mint after additional delay...');
                const retryUtxos = await getUtxos();
                const retryAddress = await getAddress();
                
                if (!retryUtxos || retryUtxos.length === 0) {
                  console.warn('Still no UTXOs available for retry');
                  return;
                }
                
                const retryEgoTx = await mintEgoAfterRelease({
                  agentAddress,
                  agentName,
                  minterAddress: retryAddress,
                  minterUtxos: retryUtxos,
                });
                const retrySignedEgo = await signTransaction(retryEgoTx);
                const retryEgoTxId = await submitTransaction(retrySignedEgo);
                
                setEgoMintResult({ success: true, txId: retryEgoTxId });
                logEgoMinted(taskId, agentAddress, retryEgoTxId, 10).catch(() => {});
              } catch (retryErr: any) {
                console.error('EGO mint retry also failed:', retryErr?.message);
                setEgoMintResult({ success: false, error: retryErr?.message || 'Retry failed' });
              }
            }, 60000); // Retry after 1 minute
          }
        }
      }, 5000); // Initial 5 second delay
    } catch (err: any) {
      console.error('Release escrow failed:', err);
      const msg = err?.message || 'Transaction failed';
      
      // Enhanced error messages for release
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled in wallet. Funds remain in escrow. You can try again.');
      } else if (msg.includes('not found on-chain') || msg.includes('Escrow box not found')) {
        setError('Escrow box not found. It may have already been released/refunded or the box ID is incorrect.');
      } else if (msg.includes('already been spent')) {
        setError('This escrow has already been spent (released or refunded). Check the transaction history.');
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        setError('Connection or transaction timeout. Funds remain safe in escrow. Please try again.');
      } else if (msg.includes('Insufficient funds') || msg.includes('UTXO')) {
        setError('Insufficient ERG for transaction fees. Please add more ERG to your wallet.');
      } else {
        setError(`Release failed: ${msg}`);
      }
      setTxState('error');
    }
  }, [escrowBoxId, agentAddress, agentName, amountErg, taskId, onReleased]);

  const handleRefund = useCallback(async () => {
    if (!escrowBoxId) return;
    setError(null);
    setEgoMintResult(null);
    setTxState('connecting');

    try {
      // Enhanced wallet connection with timeout
      const connectPromise = connectWallet('nautilus');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      setTxState('building');

      const [utxos, changeAddress, currentHeight] = await Promise.all([
        getUtxos(),
        getAddress(),
        getCurrentHeight()
      ]);

      // Validate escrow box still exists and check deadline
      const { getBoxById } = await import('@/lib/ergo/explorer');
      const escrowBox = await getBoxById(escrowBoxId);
      if (!escrowBox) {
        throw new Error('Escrow box not found on-chain. It may have already been spent.');
      }

      // Check if deadline has passed (if we can extract it from the box)
      try {
        const registers = escrowBox.additionalRegisters;
        if (registers.R6 && deadlineHeight && currentHeight <= deadlineHeight) {
          throw new Error(`Cannot refund yet. Deadline is at block ${deadlineHeight}, but current height is ${currentHeight}. Wait for ${deadlineHeight - currentHeight} more blocks (~${Math.ceil((deadlineHeight - currentHeight) * 2)} minutes).`);
        }
      } catch (deadlineErr) {
        // If we can't check deadline, proceed anyway - let the contract reject if too early
      }

      const unsignedTx = await refundEscrowTx(escrowBoxId, changeAddress, utxos, changeAddress);

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);

      setTxState('submitting');
      
      // Add timeout to transaction submission
      const submitPromise = submitTransaction(signedTx);
      const submitTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction submission timeout after 60 seconds')), 60000)
      );
      
      const id = await Promise.race([submitPromise, submitTimeoutPromise]);

      setTxId(id);
      setTxState('success');
      onRefunded?.(id);
      logEscrowRefunded(taskId, changeAddress, id).catch(() => {});
    } catch (err: any) {
      console.error('Refund escrow failed:', err);
      const msg = err?.message || 'Transaction failed';
      
      // Enhanced error messages for refund
      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        setError('Transaction cancelled in wallet. Funds remain in escrow. You can try again.');
      } else if (msg.includes('Cannot refund yet') || msg.includes('Deadline is at block')) {
        setError(msg); // Already has helpful block height info
      } else if (msg.includes('not found on-chain')) {
        setError('Escrow box not found. It may have already been released/refunded.');
      } else if (msg.includes('timeout') || msg.includes('Timeout')) {
        setError('Connection or transaction timeout. Funds remain safe in escrow. Please try again.');
      } else if (msg.includes('Insufficient funds') || msg.includes('UTXO')) {
        setError('Insufficient ERG for transaction fees. Please add more ERG to your wallet.');
      } else {
        setError(`Refund failed: ${msg}`);
      }
      setTxState('error');
    }
  }, [escrowBoxId, deadlineHeight, taskId, onRefunded]);

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
              onClick={() => { setTxState('idle'); setError(null); setEgoMintResult(null); }}
              className="mt-1 text-xs underline opacity-70 hover:opacity-100"
            >
              Dismiss & try again
            </button>
          )}
        </div>
      )}

      {/* EGO mint status for releases */}
      {txState === 'success' && escrowStatus === 'funded' && egoMintResult && (
        <div className={`text-sm px-3 py-2 rounded-lg ${
          egoMintResult.success 
            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {egoMintResult.success ? (
            <div>
              ✨ Agent reputation tokens minted successfully!
              {egoMintResult.txId && (
                <div className="mt-1">
                  <a 
                    href={txExplorerUrl(egoMintResult.txId)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-purple-300 hover:underline font-mono"
                  >
                    EGO TX: {egoMintResult.txId.slice(0, 10)}…{egoMintResult.txId.slice(-6)} ↗
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div>
              ⚠️ {egoMintResult.error}
              <div className="mt-1 text-xs opacity-80">
                The main payment was successful - this is just a bonus feature.
              </div>
            </div>
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
