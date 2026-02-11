'use client';

import { useState, useEffect, useCallback } from 'react';
import { CelautClient } from '@/lib/celaut/client';
import type {
  CelautNodeStatus,
  CelautRunningService,
  CelautEstimatedCost,
  CelautGasAmount,
} from '@/lib/celaut/types';
import { DEFAULT_NODE_URL, CELAUT_NODES } from '@/lib/celaut/constants';

/* ─── Icons ──────────────────────────────────────────────── */

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const statusColors: Record<CelautNodeStatus, string> = {
  connected: 'text-green-400',
  connecting: 'text-yellow-400',
  disconnected: 'text-[var(--text-muted)]',
  error: 'text-red-400',
};

const statusDots: Record<CelautNodeStatus, string> = {
  connected: 'bg-green-400',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-gray-500',
  error: 'bg-red-400',
};

/* ─── Props ──────────────────────────────────────────────── */

interface CelautStatusProps {
  /** Compact mode for embedding in task cards */
  compact?: boolean;
  /** Show node selector dropdown */
  showNodeSelector?: boolean;
  /** Show estimated cost for a service hash */
  serviceHash?: string;
  /** Callback when Celaut execution is toggled */
  onToggle?: (enabled: boolean) => void;
  /** Whether Celaut execution is enabled */
  enabled?: boolean;
  /** Running services to display */
  runningServices?: CelautRunningService[];
}

export default function CelautStatus({
  compact = false,
  showNodeSelector = false,
  serviceHash,
  onToggle,
  enabled = false,
  runningServices = [],
}: CelautStatusProps) {
  const [nodeUrl, setNodeUrl] = useState<string>(DEFAULT_NODE_URL);
  const [status, setStatus] = useState<CelautNodeStatus>('disconnected');
  const [estimatedCost, setEstimatedCost] = useState<CelautEstimatedCost | null>(null);
  const [costLoading, setCostLoading] = useState(false);

  const nodeOptions = Object.entries(CELAUT_NODES).map(([key, url]) => ({
    label: key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
    value: url,
  }));

  const checkConnection = useCallback(async () => {
    setStatus('connecting');
    const client = new CelautClient(nodeUrl);
    const ok = await client.ping();
    setStatus(ok ? 'connected' : 'error');
  }, [nodeUrl]);

  // Fetch estimated cost when serviceHash changes
  useEffect(() => {
    if (!serviceHash || !enabled) {
      setEstimatedCost(null);
      return;
    }
    let cancelled = false;
    setCostLoading(true);
    const client = new CelautClient(nodeUrl);
    client
      .estimateCost(serviceHash)
      .then(cost => { if (!cancelled) setEstimatedCost(cost); })
      .catch(() => { if (!cancelled) setEstimatedCost(null); })
      .finally(() => { if (!cancelled) setCostLoading(false); });
    return () => { cancelled = true; };
  }, [serviceHash, enabled, nodeUrl]);

  const formatGas = (gas: CelautGasAmount): string => {
    const n = BigInt(gas.n);
    const erg = Number(n) / 1_000_000_000;
    if (erg < 0.001) return `${gas.n} gas`;
    return `~${erg.toFixed(4)} ERG`;
  };

  /* ── Compact mode ──────────────────────────────────────── */

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-2 h-2 rounded-full ${statusDots[status]}`} />
        <span className={statusColors[status]}>
          Celaut {status === 'connected' ? 'Ready' : status}
        </span>
        {estimatedCost && (
          <span className="text-[var(--text-muted)]">
            • Est. {formatGas(estimatedCost.cost)}
          </span>
        )}
        {onToggle && (
          <button
            onClick={() => onToggle(!enabled)}
            className={`ml-2 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              enabled
                ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]'
            }`}
          >
            {enabled ? 'Celaut ON' : 'Celaut OFF'}
          </button>
        )}
      </div>
    );
  }

  /* ── Full mode ─────────────────────────────────────────── */

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ServerIcon />
          <h3 className="font-semibold text-sm">Celaut Execution</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]">
            Testnet
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusDots[status]}`} />
          <span className={`text-xs ${statusColors[status]}`}>{status}</span>
          <button
            onClick={checkConnection}
            className="text-xs text-[var(--accent-cyan)] hover:underline"
          >
            {status === 'disconnected' ? 'Connect' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Node selector */}
      {showNodeSelector && (
        <div>
          <label className="text-xs text-[var(--text-muted)] block mb-1">Node</label>
          <select
            value={nodeUrl}
            onChange={e => { setNodeUrl(e.target.value); setStatus('disconnected'); }}
            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm"
          >
            {nodeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Toggle */}
      {onToggle && (
        <button
          onClick={() => onToggle(!enabled)}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
            enabled
              ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 hover:bg-[var(--accent-cyan)]/30'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50'
          }`}
        >
          {enabled ? '⚡ Celaut Execution Enabled' : 'Enable Celaut Execution'}
        </button>
      )}

      {/* Estimated cost */}
      {enabled && estimatedCost && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 space-y-2">
          <div className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Estimated Cost</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[var(--text-muted)]">Initial: </span>
              <span className="text-[var(--text-primary)]">{formatGas(estimatedCost.cost)}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Maintenance: </span>
              <span className="text-[var(--text-primary)]">{formatGas(estimatedCost.initMaintenanceCost)}/loop</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Max maintenance: </span>
              <span className="text-[var(--text-primary)]">{formatGas(estimatedCost.maxMaintenanceCost)}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Variance: </span>
              <span className="text-[var(--text-primary)]">{(estimatedCost.variance * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
      {enabled && costLoading && (
        <div className="text-xs text-[var(--text-muted)] animate-pulse">Estimating cost...</div>
      )}

      {/* Running services */}
      {runningServices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
            <ActivityIcon />
            Running Services ({runningServices.length})
          </div>
          {runningServices.map(svc => (
            <div key={svc.token} className="bg-[var(--bg-secondary)] rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-[var(--text-primary)]">Task {svc.taskId.slice(0, 8)}…</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  svc.status === 'running' ? 'bg-green-400/20 text-green-400' :
                  svc.status === 'starting' ? 'bg-yellow-400/20 text-yellow-400' :
                  svc.status === 'error' ? 'bg-red-400/20 text-red-400' :
                  'bg-gray-400/20 text-gray-400'
                }`}>
                  {svc.status}
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Gas used: {formatGas(svc.gasUsed)} / {formatGas(svc.gasDeposited)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
