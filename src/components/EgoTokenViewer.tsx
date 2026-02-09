'use client';

import { useState, useEffect } from 'react';
import { getAllEgoTokens, egoTokenExplorerUrl, type EgoToken } from '@/lib/ergo/ego-token';

interface EgoTokenViewerProps {
  address: string;
  compact?: boolean;
}

export default function EgoTokenViewer({ address, compact = false }: EgoTokenViewerProps) {
  const [tokens, setTokens] = useState<EgoToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAllEgoTokens(address)
      .then((t) => {
        if (!cancelled) setTokens(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load EGO tokens');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [address]);

  const totalScore = tokens.reduce((sum, t) => sum + t.amount, 0n);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent-cyan)]" />
        Loading EGO tokens...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        {error}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center p-6 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-[var(--text-secondary)] text-sm">No EGO tokens found for this address.</p>
        <p className="text-[var(--text-muted)] text-xs mt-1">EGO tokens are earned through verified task completions.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <span className="text-[var(--accent-green)] font-bold text-xl">{totalScore.toString()}</span>
        <span className="text-[var(--text-secondary)] text-sm">EGO</span>
        <span className="text-[var(--text-muted)] text-xs">({tokens.length} badge{tokens.length !== 1 ? 's' : ''})</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Score Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[var(--accent-green)]/10 to-[var(--accent-cyan)]/10 rounded-xl border border-[var(--accent-green)]/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="text-2xl font-bold text-[var(--accent-green)]">{totalScore.toString()} EGO</div>
            <div className="text-xs text-[var(--text-secondary)]">Total Reputation Score</div>
          </div>
        </div>
        <div className="px-3 py-1 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded-full text-xs font-medium">
          🔗 Soulbound
        </div>
      </div>

      {/* Token Cards */}
      <div className="grid gap-3">
        {tokens.map((token) => (
          <div
            key={token.tokenId}
            className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-white">{token.name}</div>
                <div className="text-xs text-[var(--text-muted)] font-mono mt-1">
                  <a
                    href={egoTokenExplorerUrl(token.tokenId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    {token.tokenId.slice(0, 8)}...{token.tokenId.slice(-8)}
                  </a>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-[var(--accent-green)]">
                  ×{token.amount.toString()}
                </div>
                <div className="text-xs text-[var(--text-muted)]">tokens</div>
              </div>
            </div>
            {token.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-2">{token.description}</p>
            )}
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] rounded text-xs">
                🔗 Soulbound Reputation
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
