'use client';

/**
 * PrivateBidding — Commit-Reveal Sealed Bid UI Component
 * 
 * Provides the full user experience for the private bidding protocol:
 * - Commit phase: submit sealed bids with hidden amounts
 * - Reveal phase: reveal bids to prove commitment
 * - Selection phase: view ranked bids, task owner selects winner
 * - Refund: reclaim funds from unrevealed/unselected bids
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateBidSalt,
  hashBid,
  createSealedBid,
  revealBid,
  refundExpiredBid,
  getTaskBidCommitments,
  getTaskRevealedBids,
  storeSalt,
  getSaltForBox,
  getSaltsForTask,
  bytesToHex,
  DEFAULT_COMMIT_WINDOW_BLOCKS,
  DEFAULT_REVEAL_WINDOW_BLOCKS,
  type SealedBidCommitment,
  type RevealedBid,
} from '@/lib/ergo/private-bidding';
import { getCurrentHeight } from '@/lib/ergo/explorer';
import { NANOERG_FACTOR } from '@/lib/ergo/constants';

// ─── Types ───────────────────────────────────────────────────────────

interface PrivateBiddingProps {
  taskId: string;
  taskTitle?: string;
  /** Block height when commit phase ends */
  commitDeadline: number;
  /** Block height when reveal/refund phase ends */
  refundDeadline: number;
  /** Current user's wallet address */
  userAddress?: string;
  /** Whether the current user is the task owner */
  isTaskOwner?: boolean;
}

type BiddingPhase = 'commit' | 'reveal' | 'selection' | 'expired';

// ─── Helpers ─────────────────────────────────────────────────────────

function formatErg(nanoErg: bigint): string {
  const erg = Number(nanoErg) / Number(NANOERG_FACTOR);
  return erg.toFixed(4);
}

function estimateTimeFromBlocks(blocks: number): string {
  const minutes = blocks * 2; // Ergo ~2 min block time
  if (minutes < 60) return `~${minutes}m`;
  if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
  return `~${Math.round(minutes / 1440)}d`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function PrivateBidding({
  taskId,
  taskTitle,
  commitDeadline,
  refundDeadline,
  userAddress,
  isTaskOwner = false,
}: PrivateBiddingProps) {
  // State
  const [phase, setPhase] = useState<BiddingPhase>('commit');
  const [currentHeight, setCurrentHeight] = useState(0);
  const [bidAmount, setBidAmount] = useState('');
  const [commitments, setCommitments] = useState<SealedBidCommitment[]>([]);
  const [revealedBids, setRevealedBids] = useState<RevealedBid[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saltBackup, setSaltBackup] = useState<string | null>(null);

  // Determine current phase based on block height
  const updatePhase = useCallback((height: number) => {
    if (height <= commitDeadline) {
      setPhase('commit');
    } else if (height <= refundDeadline) {
      setPhase('reveal');
    } else {
      // Check if there are revealed bids to select from
      setPhase(revealedBids.length > 0 ? 'selection' : 'expired');
    }
  }, [commitDeadline, refundDeadline, revealedBids.length]);

  // Poll current block height
  useEffect(() => {
    const fetchHeight = async () => {
      try {
        const height = await getCurrentHeight();
        setCurrentHeight(height);
        updatePhase(height);
      } catch {
        // Silent retry
      }
    };
    fetchHeight();
    const interval = setInterval(fetchHeight, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [updatePhase]);

  // Fetch commitments and revealed bids
  useEffect(() => {
    const fetchBids = async () => {
      try {
        const [commits, reveals] = await Promise.all([
          getTaskBidCommitments(taskId),
          getTaskRevealedBids(taskId),
        ]);
        setCommitments(commits);
        setRevealedBids(reveals.sort((a, b) => 
          Number(a.bidAmountNanoErg - b.bidAmountNanoErg)
        ));
      } catch {
        // Silent retry
      }
    };
    fetchBids();
    const interval = setInterval(fetchBids, 30000);
    return () => clearInterval(interval);
  }, [taskId]);

  // ── Submit Sealed Bid ──
  const handleSubmitBid = async () => {
    if (!userAddress || !bidAmount) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const amountNanoErg = BigInt(Math.round(parseFloat(bidAmount) * 1e9));
      const salt = generateBidSalt();

      const { unsignedTx, commitHash } = await createSealedBid({
        taskId,
        bidAmountNanoErg: amountNanoErg,
        bidderAddress: userAddress,
        commitDeadlineHeight: commitDeadline,
        refundDeadlineHeight: refundDeadline,
      }, salt);

      // Sign and submit via wallet
      const ergo = ((window as unknown) as { ergo: { sign_tx: (tx: unknown) => Promise<unknown>; submit_tx: (tx: unknown) => Promise<string> } }).ergo;
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      // Store salt locally for reveal phase
      storeSalt(taskId, txId, salt, amountNanoErg);

      // Show salt backup warning
      const saltHex = bytesToHex(salt);
      setSaltBackup(saltHex);

      setSuccess(`Sealed bid submitted! TX: ${txId.slice(0, 12)}...`);
      setBidAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reveal Bid ──
  const handleRevealBid = async (boxId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const stored = getSaltForBox(boxId);
      if (!stored) {
        throw new Error('Salt not found for this bid. Cannot reveal without the original salt.');
      }

      const { unsignedTx } = await revealBid(boxId, stored.amount, stored.salt);

      const ergo = ((window as unknown) as { ergo: { sign_tx: (tx: unknown) => Promise<unknown>; submit_tx: (tx: unknown) => Promise<string> } }).ergo;
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      setSuccess(`Bid revealed! TX: ${txId.slice(0, 12)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Refund Expired Bid ──
  const handleRefund = async (boxId: string) => {
    if (!userAddress) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { unsignedTx } = await refundExpiredBid(boxId, userAddress);

      const ergo = ((window as unknown) as { ergo: { sign_tx: (tx: unknown) => Promise<unknown>; submit_tx: (tx: unknown) => Promise<string> } }).ergo;
      const signedTx = await ergo.sign_tx(unsignedTx);
      const txId = await ergo.submit_tx(signedTx);

      setSuccess(`Refund submitted! TX: ${txId.slice(0, 12)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Phase Info ──
  const blocksToCommitDeadline = Math.max(0, commitDeadline - currentHeight);
  const blocksToRefundDeadline = Math.max(0, refundDeadline - currentHeight);

  // Check if user has any commitments for this task
  const userSalts = getSaltsForTask(taskId);
  const userHasBid = userSalts.length > 0;

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🔒 Private Bidding
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              phase === 'commit' ? 'bg-blue-500/20 text-blue-400' :
              phase === 'reveal' ? 'bg-yellow-500/20 text-yellow-400' :
              phase === 'selection' ? 'bg-green-500/20 text-green-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {phase === 'commit' ? '📝 Commit Phase' :
               phase === 'reveal' ? '👁 Reveal Phase' :
               phase === 'selection' ? '🏆 Selection Phase' :
               '⏰ Expired'}
            </span>
          </h3>
          {taskTitle && <p className="text-sm text-gray-400 mt-1">{taskTitle}</p>}
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Block: {currentHeight.toLocaleString()}</div>
          {phase === 'commit' && (
            <div>Commit ends in: {blocksToCommitDeadline} blocks ({estimateTimeFromBlocks(blocksToCommitDeadline)})</div>
          )}
          {phase === 'reveal' && (
            <div>Reveal ends in: {blocksToRefundDeadline} blocks ({estimateTimeFromBlocks(blocksToRefundDeadline)})</div>
          )}
        </div>
      </div>

      {/* Protocol explanation */}
      <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3">
        <strong>How it works:</strong> Bids are sealed (hashed) during the commit phase so nobody can see other bids.
        After the commit deadline, bidders reveal their actual amounts. This prevents undercutting.
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Salt backup warning */}
      {saltBackup && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm space-y-2">
          <p className="font-semibold">⚠️ SAVE YOUR BID SECRET</p>
          <p>You need this to reveal your bid. If lost, you must wait for refund deadline.</p>
          <code className="block bg-gray-900 rounded p-2 text-xs break-all font-mono">
            {saltBackup}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(saltBackup);
              setSaltBackup(null);
            }}
            className="text-xs bg-yellow-600 hover:bg-yellow-500 text-black px-3 py-1 rounded"
          >
            Copy & Dismiss
          </button>
        </div>
      )}

      {/* ── COMMIT PHASE UI ── */}
      {phase === 'commit' && !isTaskOwner && userAddress && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your Bid Amount (ERG)</label>
            <input
              type="number"
              step="0.01"
              min="0.001"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="Enter bid amount..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your bid amount is encrypted. Other bidders cannot see it.
            </p>
          </div>
          <button
            onClick={handleSubmitBid}
            disabled={isSubmitting || !bidAmount || parseFloat(bidAmount) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? '⏳ Submitting...' : '🔒 Submit Sealed Bid'}
          </button>
        </div>
      )}

      {/* ── REVEAL PHASE UI ── */}
      {phase === 'reveal' && userHasBid && (
        <div className="space-y-3">
          <p className="text-sm text-yellow-400">
            Time to reveal your bid! Click below to prove your committed amount.
          </p>
          {userSalts.map(salt => (
            <div key={salt.boxId} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
              <div className="text-sm">
                <span className="text-gray-400">Bid: </span>
                <span className="text-white">{formatErg(BigInt(salt.amount))} ERG</span>
              </div>
              <button
                onClick={() => handleRevealBid(salt.boxId)}
                disabled={isSubmitting}
                className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 text-black text-sm font-medium px-4 py-1.5 rounded-lg"
              >
                {isSubmitting ? '⏳...' : '👁 Reveal Bid'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── REVEALED BIDS ── */}
      {(phase === 'selection' || phase === 'reveal') && revealedBids.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Revealed Bids ({revealedBids.length})</h4>
          {revealedBids.map((bid, i) => (
            <div
              key={bid.boxId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                i === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <div>
                  <div className="text-white font-medium">{formatErg(bid.bidAmountNanoErg)} ERG</div>
                  <div className="text-xs text-gray-500">{bid.bidderAddress.slice(0, 12)}...</div>
                </div>
              </div>
              {isTaskOwner && phase === 'selection' && (
                <button className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-1.5 rounded-lg">
                  Select Winner
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── COMMITMENTS COUNT ── */}
      {commitments.length > 0 && phase === 'commit' && (
        <div className="text-sm text-gray-400">
          📊 {commitments.length} sealed bid{commitments.length !== 1 ? 's' : ''} submitted
        </div>
      )}

      {/* ── REFUND (expired unrevealed) ── */}
      {phase === 'expired' && userHasBid && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Bidding has expired. You can reclaim funds from unrevealed bids.
          </p>
          {userSalts.map(salt => (
            <button
              key={salt.boxId}
              onClick={() => handleRefund(salt.boxId)}
              disabled={isSubmitting}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
            >
              Refund {formatErg(BigInt(salt.amount))} ERG
            </button>
          ))}
        </div>
      )}

      {/* ── No wallet connected ── */}
      {!userAddress && (
        <p className="text-sm text-gray-500 text-center py-4">
          Connect your wallet to participate in bidding.
        </p>
      )}
    </div>
  );
}
