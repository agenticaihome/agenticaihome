'use client';

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Loader2, ExternalLink } from 'lucide-react';
import {
  ReputationAvlTree,
  verifyAgentReputation,
  calculateTrustLevelV2,
  formatReputationV2,
  type AgentReputationV2,
  type ReputationLookupResult,
} from '@/lib/ergo/reputation-avl';
import { ERGO_EXPLORER_UI } from '@/lib/ergo/constants';

// ─── Props ───────────────────────────────────────────────────────────────────

interface OnChainReputationProps {
  /** Agent's Ergo address to look up */
  agentAddress: string;
  /** Compact display mode (just badge + score) */
  compact?: boolean;
  /** Optional CSS class */
  className?: string;
}

// ─── Trust Level Badge Colors ────────────────────────────────────────────────

const TRUST_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  platinum: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  gold:     { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  silver:   { bg: 'bg-gray-400/10',   text: 'text-gray-300',   border: 'border-gray-400/30' },
  bronze:   { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  unverified: { bg: 'bg-gray-600/10', text: 'text-gray-500',   border: 'border-gray-600/30' },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * OnChainReputation — displays an agent's AVL-tree-verified on-chain reputation.
 *
 * This component:
 *   1. Fetches the agent's reputation from the off-chain AVL tree
 *   2. Verifies it against the on-chain singleton digest
 *   3. Displays the reputation with a cryptographic verification badge
 *
 * The verification badge indicates:
 *   🛡️ Green  — reputation verified against on-chain AVL tree digest
 *   🛡️ Yellow — reputation found but proof verification pending
 *   🛡️ Red    — no on-chain reputation data found
 *
 * NOTE: This is a V2 component. The existing reputation system (V1) continues
 * to work independently. V2 provides stronger cryptographic guarantees.
 */
export default function OnChainReputation({
  agentAddress,
  compact = false,
  className = '',
}: OnChainReputationProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ReputationLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentAddress) return;

    let cancelled = false;

    async function fetchReputation() {
      setLoading(true);
      setError(null);

      try {
        // Create tree instance for lookup
        // In production, this would connect to a persistent off-chain tree service
        const tree = new ReputationAvlTree();
        const lookupResult = await verifyAgentReputation(tree, agentAddress);

        if (!cancelled) {
          setResult(lookupResult);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to verify reputation');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReputation();
    return () => { cancelled = true; };
  }, [agentAddress]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        {!compact && <span className="text-sm">Verifying on-chain reputation...</span>}
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className={`flex items-center gap-2 text-red-400 ${className}`}>
        <ShieldAlert className="w-4 h-4" />
        {!compact && <span className="text-sm">{error}</span>}
      </div>
    );
  }

  // ── No Data State ──
  if (!result || !result.found || !result.reputation) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-600/10 border border-gray-600/30">
          <Shield className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">No on-chain reputation (V2)</span>
        </div>
      </div>
    );
  }

  // ── Verified Reputation Display ──
  const rep = result.reputation;
  const trustLevel = calculateTrustLevelV2(rep);
  const colors = TRUST_COLORS[trustLevel] || TRUST_COLORS.unverified;
  const digestHex = Buffer.from(result.treeDigest).toString('hex').slice(0, 12);

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <ShieldCheck className={`w-3.5 h-3.5 ${colors.text}`} />
        <span className={`text-xs font-medium ${colors.text}`}>
          {Number(rep.totalScore)} EGO
        </span>
        <span className="text-[10px] text-gray-500" title="AVL tree verified">✓ V2</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${colors.text}`} />
          <span className={`text-sm font-semibold ${colors.text} uppercase`}>
            {trustLevel} — On-Chain Verified
          </span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono" title="AVL tree digest">
          {digestHex}…
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">EGO Score</div>
          <div className="text-lg font-bold text-white">{Number(rep.totalScore)}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Tasks</div>
          <div className="text-lg font-bold text-white">{rep.tasksCompleted}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Reviews</div>
          <div className="text-lg font-bold text-white">{rep.reviewCount}</div>
        </div>
      </div>

      {/* Verification Badge */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] text-gray-400">
            AVL tree proof verified • Block #{result.singletonHeight}
          </span>
        </div>
        <a
          href={`${ERGO_EXPLORER_UI}/en/addresses/${agentAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          Explorer <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
