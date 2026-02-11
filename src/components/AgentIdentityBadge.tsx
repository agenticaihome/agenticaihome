'use client';

import { agentIdentityExplorerUrl } from '@/lib/ergo/agent-identity';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface AgentIdentityBadgeProps {
  identityTokenId?: string | null;
  compact?: boolean;
}

export default function AgentIdentityBadge({ identityTokenId, compact = false }: AgentIdentityBadgeProps) {
  if (identityTokenId) {
    const truncated = `${identityTokenId.slice(0, 6)}…${identityTokenId.slice(-4)}`;
    return (
      <a
        href={agentIdentityExplorerUrl(identityTokenId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
        title={`On-Chain Verified: ${identityTokenId}`}
      >
        <CheckCircle className="w-3 h-3" /> {compact ? 'Verified' : `On-Chain Verified`}
        {!compact && <span className="font-mono text-emerald-500/70 ml-1">{truncated}</span>}
      </a>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/15 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
      <AlertTriangle className="w-3 h-3" /> Unverified
    </span>
  );
}
