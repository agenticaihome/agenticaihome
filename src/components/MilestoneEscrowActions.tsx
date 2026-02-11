'use client';

import { useState, useCallback, useEffect } from 'react';
import { createMilestoneEscrowTx, releaseMilestoneTx, refundMilestoneEscrowTx, parseMilestoneEscrowBox, calculateMilestoneProgress } from '@/lib/ergo/milestone-escrow';
import { mintEgoAfterRelease } from '@/lib/ergo/ego-token';
import { notifyPaymentReleased } from '@/lib/notifications';
import { logEscrowFunded, logEscrowReleased, logEscrowRefunded, logEgoMinted } from '@/lib/taskEvents';
import { connectWallet, getUtxos, getAddress, signTransaction, submitTransaction, getCurrentHeight, getCurrentWalletInfo, WalletState } from '@/lib/ergo/wallet';
import { txExplorerUrl } from '@/lib/ergo/constants';
import { nanoErgToErg, ergToNanoErg } from '@/lib/ergo/explorer';
import { WalletSelector, type WalletType } from '@/components/WalletSelector';
import ErgoPayQR from '@/components/ErgoPayQR';
import { isTransactionSuitableForErgoPay } from '@/lib/ergo/ergopay';
import type { Milestone } from '@/lib/ergo/milestone-escrow';

type TxState = 'idle' | 'connecting' | 'building' | 'signing' | 'submitting' | 'success' | 'error' | 'ergopay_qr' | 'ergopay_waiting';

interface MilestoneEscrowActionsProps {
  taskId: string;
  /** Agent's Ergo address */
  agentAddress: string;
  /** Agent's display name (for EGO token naming) */
  agentName?: string;
  /** Amount in ERG (e.g. "1.5") */
  amountErg: string;
  /** Milestones configuration */
  milestones: Milestone[];
  /** Box ID of existing escrow (for release/refund) */
  escrowBoxId?: string;
  /** Current milestone index (0-based) */
  currentMilestone?: number;
  /** Current escrow status */
  escrowStatus?: 'unfunded' | 'funded' | 'completed' | 'refunded';
  /** Callback after successful fund */
  onFunded?: (txId: string, boxId: string) => void;
  /** Callback after successful milestone release */
  onMilestoneReleased?: (txId: string, milestoneIndex: number) => void;
  /** Callback after successful refund */
  onRefunded?: (txId: string) => void;
}

interface EgoMintResult {
  success: boolean;
  txId?: string;
  error?: string;
}

export default function MilestoneEscrowActions({
  taskId,
  agentAddress,
  agentName = 'Agent',
  amountErg,
  milestones,
  escrowBoxId,
  currentMilestone = 0,
  escrowStatus = 'unfunded',
  onFunded,
  onMilestoneReleased,
  onRefunded,
}: MilestoneEscrowActionsProps) {
  const [txState, setTxState] = useState<TxState>('idle');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [egoMintResult, setEgoMintResult] = useState<EgoMintResult | null>(null);
  
  // Wallet selection state
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState<WalletType | null>(null);
  const [unsignedTxForErgoPay, setUnsignedTxForErgoPay] = useState<any>(null);
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  
  // Polling for ErgoPay transactions
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const isFinalMilestone = currentMilestone === milestones.length - 1;
  const totalAmountNanoErg = ergToNanoErg(parseFloat(amountErg));

  const handleFund = useCallback(async (walletType?: WalletType) => {
    setError(null);
    setEgoMintResult(null);
    
    // If no wallet type specified, show wallet selector
    if (!walletType) {
      setShowWalletSelector(true);
      return;
    }
    
    setSelectedWalletType(walletType);
    setTxState('connecting');

    try {
      // Enhanced wallet connection with timeout
      const connectPromise = connectWallet(walletType);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );
      
      const walletState = await Promise.race([connectPromise, timeoutPromise]) as WalletState;
      
      if (!walletState.address) {
        throw new Error('Wallet address not available');
      }
      
      setCurrentUserAddress(walletState.address);
      setTxState('building');

      // Get current height for milestone deadlines
      const currentHeight = await getCurrentHeight();
      
      // Update milestone deadlines to be in the future
      const milestonesWithDeadlines = milestones.map((milestone, index) => ({
        ...milestone,
        deadlineHeight: currentHeight + (index + 1) * 720, // ~1 day per milestone
      }));

      // Get wallet info for transaction building
      const [utxos, changeAddress] = await Promise.all([
        getUtxos(),
        getAddress(),
      ]);

      // Create milestone escrow transaction
      const unsignedTx = await createMilestoneEscrowTx({
        clientAddress: walletState.address,
        agentAddress,
        totalAmountNanoErg,
        milestones: milestonesWithDeadlines,
        taskId,
      }, utxos, changeAddress);

      // Check if transaction is suitable for ErgoPay
      if (isTransactionSuitableForErgoPay(unsignedTx)) {
        setUnsignedTxForErgoPay(unsignedTx);
        setTxState('ergopay_qr');
        return;
      }

      // Standard wallet signing flow
      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);
      
      setTxState('submitting');
      const submittedTxId = await submitTransaction(signedTx);
      
      setTxId(submittedTxId);
      setTxState('success');

      // Log event and call callback
      await logEscrowFunded(taskId, walletState.address, submittedTxId, parseFloat(amountErg));
      onFunded?.(submittedTxId, unsignedTx.outputs[0].boxId || submittedTxId);

    } catch (err) {
      console.error('Milestone escrow funding error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fund milestone escrow');
      setTxState('error');
    }
  }, [taskId, agentAddress, amountErg, milestones, totalAmountNanoErg, onFunded]);

  const handleReleaseMilestone = useCallback(async (walletType?: WalletType) => {
    if (!escrowBoxId) {
      setError('No escrow box ID available');
      return;
    }

    setError(null);
    setEgoMintResult(null);

    if (!walletType) {
      setShowWalletSelector(true);
      return;
    }

    setSelectedWalletType(walletType);
    setTxState('connecting');

    try {
      const walletState = await connectWallet(walletType);
      
      if (!walletState.address) {
        throw new Error('Wallet address not available');
      }
      
      setCurrentUserAddress(walletState.address);
      setTxState('building');

      // Get wallet info for transaction building
      const [utxos, changeAddress] = await Promise.all([
        getUtxos(),
        getAddress(),
      ]);

      // Build milestone release transaction
      const result = await releaseMilestoneTx(escrowBoxId, utxos, changeAddress, agentName);
      const unsignedTx = result.milestoneReleaseTx;

      if (isTransactionSuitableForErgoPay(unsignedTx)) {
        setUnsignedTxForErgoPay(unsignedTx);
        setTxState('ergopay_qr');
        return;
      }

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);
      
      setTxState('submitting');
      const submittedTxId = await submitTransaction(signedTx);
      
      setTxId(submittedTxId);

      // Calculate milestone payment amount for logging
      const milestonePayment = (totalAmountNanoErg * BigInt(milestones[currentMilestone].percentage)) / BigInt(10000);
      
      // Try to mint EGO tokens for this milestone
      try {
        const userUtxos = await getUtxos(currentUserAddress || '');
        const egoTx = await mintEgoAfterRelease({
          agentAddress,
          agentName: `${agentName} - Milestone ${currentMilestone + 1}`,
          minterAddress: currentUserAddress || '',
          minterUtxos: userUtxos,
        });
        
        if (egoTx.success && egoTx.txId) {
          await logEgoMinted(taskId, currentUserAddress || '', egoTx.txId, egoTx.egoAmount || 0);
          setEgoMintResult({ success: true, txId: egoTx.txId });
        } else {
          setEgoMintResult({ success: false, error: egoTx.error });
        }
      } catch (egoErr) {
        console.warn('EGO minting failed (non-critical):', egoErr);
        setEgoMintResult({ success: false, error: 'EGO minting failed' });
      }

      // Send notification to agent
      await notifyPaymentReleased(taskId, agentAddress, parseFloat(nanoErgToErg(milestonePayment.toString())));
      
      // Log the milestone release
      await logEscrowReleased(taskId, walletState.address, submittedTxId, parseFloat(nanoErgToErg(milestonePayment.toString())));
      
      setTxState('success');
      onMilestoneReleased?.(submittedTxId, currentMilestone);

    } catch (err) {
      console.error('Milestone release error:', err);
      setError(err instanceof Error ? err.message : 'Failed to release milestone');
      setTxState('error');
    }
  }, [escrowBoxId, currentMilestone, milestones, taskId, agentAddress, agentName, totalAmountNanoErg, onMilestoneReleased]);

  const handleRefund = useCallback(async (walletType?: WalletType) => {
    if (!escrowBoxId) {
      setError('No escrow box ID available');
      return;
    }

    setError(null);
    setEgoMintResult(null);

    if (!walletType) {
      setShowWalletSelector(true);
      return;
    }

    setSelectedWalletType(walletType);
    setTxState('connecting');

    try {
      const walletState = await connectWallet(walletType);
      
      if (!walletState.address) {
        throw new Error('Wallet address not available');
      }
      
      setCurrentUserAddress(walletState.address);
      setTxState('building');

      // Get wallet info for transaction building
      const [utxos, changeAddress] = await Promise.all([
        getUtxos(),
        getAddress(),
      ]);

      const unsignedTx = await refundMilestoneEscrowTx(escrowBoxId, utxos, changeAddress);

      if (isTransactionSuitableForErgoPay(unsignedTx)) {
        setUnsignedTxForErgoPay(unsignedTx);
        setTxState('ergopay_qr');
        return;
      }

      setTxState('signing');
      const signedTx = await signTransaction(unsignedTx);
      
      setTxState('submitting');
      const submittedTxId = await submitTransaction(signedTx);
      
      setTxId(submittedTxId);
      setTxState('success');

      await logEscrowRefunded(taskId, walletState.address, submittedTxId);
      onRefunded?.(submittedTxId);

    } catch (err) {
      console.error('Milestone refund error:', err);
      setError(err instanceof Error ? err.message : 'Failed to refund milestone escrow');
      setTxState('error');
    }
  }, [escrowBoxId, taskId, amountErg, onRefunded]);

  const resetState = () => {
    setTxState('idle');
    setTxId(null);
    setError(null);
    setEgoMintResult(null);
    setShowWalletSelector(false);
    setSelectedWalletType(null);
    setUnsignedTxForErgoPay(null);
    setCurrentUserAddress(null);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const onErgoPaySubmit = (submittedTxId: string) => {
    setTxId(submittedTxId);
    setTxState('success');
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const currentMilestoneData = milestones[currentMilestone];
  const progressData = calculateMilestoneProgress({ 
    milestones, 
    currentMilestone, 
    totalAmount: totalAmountNanoErg 
  } as any);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Milestone Escrow</h3>
          <div className="text-sm text-gray-400">
            Total: {amountErg} ERG
          </div>
        </div>

        {/* Milestone Progress Summary */}
        {escrowStatus === 'funded' && (
          <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                Current: Milestone {currentMilestone + 1} of {milestones.length}
              </span>
              <span className="text-sm text-[var(--accent-cyan)]">
                {currentMilestoneData?.percentage}% ({nanoErgToErg(((totalAmountNanoErg * BigInt(currentMilestoneData?.percentage || 0)) / BigInt(10000)))} ERG)
              </span>
            </div>
            <div className="text-sm text-gray-400 mb-2">
              {currentMilestoneData?.name}: {currentMilestoneData?.description}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-[var(--accent-cyan)] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentMilestone) / milestones.length) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {progressData.progress}% of total value released
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {escrowStatus === 'unfunded' && (
          <button
            onClick={() => handleFund()}
            disabled={txState !== 'idle'}
            className="w-full bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 disabled:opacity-50 text-[var(--bg-primary)] font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {txState === 'idle' ? 'Fund Milestone Escrow' : 
             txState === 'connecting' ? 'Connecting Wallet...' :
             txState === 'building' ? 'Building Transaction...' :
             txState === 'signing' ? 'Sign Transaction' :
             txState === 'submitting' ? 'Submitting...' : 
             'Processing...'}
          </button>
        )}

        {escrowStatus === 'funded' && !isFinalMilestone && (
          <button
            onClick={() => handleReleaseMilestone()}
            disabled={txState !== 'idle'}
            className="w-full bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/80 disabled:opacity-50 text-[var(--bg-primary)] font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {txState === 'idle' ? `Release Milestone ${currentMilestone + 1}` :
             txState === 'connecting' ? 'Connecting Wallet...' :
             txState === 'building' ? 'Building Transaction...' :
             txState === 'signing' ? 'Sign Transaction' :
             txState === 'submitting' ? 'Submitting...' : 
             'Processing...'}
          </button>
        )}

        {escrowStatus === 'funded' && isFinalMilestone && (
          <button
            onClick={() => handleReleaseMilestone()}
            disabled={txState !== 'idle'}
            className="w-full bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/80 disabled:opacity-50 text-[var(--bg-primary)] font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {txState === 'idle' ? `Complete Final Milestone & Release All Funds` :
             txState === 'connecting' ? 'Connecting Wallet...' :
             txState === 'building' ? 'Building Transaction...' :
             txState === 'signing' ? 'Sign Transaction' :
             txState === 'submitting' ? 'Submitting...' : 
             'Processing...'}
          </button>
        )}

        {escrowStatus === 'funded' && (
          <button
            onClick={() => handleRefund()}
            disabled={txState !== 'idle'}
            className="w-full mt-2 bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/80 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {txState === 'idle' ? 'Refund Escrow' : 'Processing...'}
          </button>
        )}

        {/* Success State */}
        {txState === 'success' && txId && (
          <div className="mt-4 p-3 bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-[var(--accent-emerald)] text-xl">✓</span>
              <div>
                <p className="text-[var(--accent-emerald)] font-medium">
                  Transaction Successful!
                </p>
                <a 
                  href={txExplorerUrl(txId)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-cyan)] hover:underline"
                >
                  View on Explorer →
                </a>
                {egoMintResult?.success && egoMintResult.txId && (
                  <div className="mt-2">
                    <p className="text-sm text-[var(--accent-cyan)]">
                      ⭐ EGO tokens minted for {agentName}
                    </p>
                    <a 
                      href={txExplorerUrl(egoMintResult.txId)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-cyan)] hover:underline"
                    >
                      View EGO TX →
                    </a>
                  </div>
                )}
                <button 
                  onClick={resetState}
                  className="mt-2 text-sm text-gray-400 hover:text-white"
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {txState === 'error' && error && (
          <div className="mt-4 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-[var(--accent-red)] text-xl">⚠</span>
              <div>
                <p className="text-[var(--accent-red)] font-medium">Transaction Failed</p>
                <p className="text-sm text-gray-400 mt-1">{error}</p>
                <button 
                  onClick={resetState}
                  className="mt-2 text-sm text-gray-400 hover:text-white"
                >
                  ← Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EGO Mint Result */}
        {egoMintResult && !egoMintResult.success && (
          <div className="mt-2 p-2 bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 rounded">
            <p className="text-xs text-[var(--accent-amber)]">
              ⚠ Payment successful, but EGO token minting failed: {egoMintResult.error}
            </p>
          </div>
        )}
      </div>

      {/* Wallet Selector Modal */}
      {showWalletSelector && (
        <WalletSelector isOpen={showWalletSelector}
          onSelect={(walletType) => {
            setShowWalletSelector(false);
            if (escrowStatus === 'unfunded') {
              handleFund(walletType);
            } else {
              // Determine action based on context
              handleReleaseMilestone(walletType);
            }
          }}
          onClose={() => setShowWalletSelector(false)}
        />
      )}

      {/* ErgoPay QR Code */}
      {txState === 'ergopay_qr' && unsignedTxForErgoPay && (
        <ErgoPayQR
          unsignedTx={unsignedTxForErgoPay}
          userAddress={currentUserAddress || undefined}
          message={`${escrowStatus === 'unfunded' ? 'Fund' : 'Release'} Milestone Escrow`}
          onGenerated={(data) => console.log('ErgoPay QR generated:', data.url)}
          onError={(err) => { setError(err); setTxState('error'); }}
        />
      )}
    </div>
  );
}