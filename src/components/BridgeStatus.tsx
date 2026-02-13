'use client';

import { useState, useEffect } from 'react';
import { getRosenBridgeStatus, ROSEN_APP_URL, type BridgeHealthStatus } from '@/lib/bridge/rosen';

/**
 * Small badge showing Rosen Bridge availability.
 * Green = healthy, Yellow = unstable, Red = broken, Gray = unknown
 */
export default function BridgeStatus({ compact = false }: { compact?: boolean }) {
  const [health, setHealth] = useState<BridgeHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const status = await getRosenBridgeStatus();
        if (mounted) setHealth(status);
      } catch {
        // silent fail
      } finally {
        if (mounted) setLoading(false);
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const statusColor = {
    healthy: 'bg-[var(--accent-green)]',
    unstable: 'bg-yellow-400',
    broken: 'bg-red-500',
    unknown: 'bg-gray-500',
  };

  const statusText = {
    healthy: 'Bridge Online',
    unstable: 'Bridge Unstable',
    broken: 'Bridge Down',
    unknown: 'Bridge Status Unknown',
  };

  const status = health?.status ?? 'unknown';
  const dotClass = loading ? 'bg-gray-500 animate-pulse' : statusColor[status];

  if (compact) {
    return (
      <a
        href={ROSEN_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        title={statusText[status]}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span>Rosen Bridge</span>
      </a>
    );
  }

  return (
    <a
      href={ROSEN_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/30 transition-all text-sm"
      title="Rosen Bridge cross-chain status"
    >
      <span className={`w-2 h-2 rounded-full ${dotClass} ${status === 'healthy' ? 'live-pulse' : ''}`} />
      <span className="text-[var(--text-secondary)]">
        {loading ? 'Checking bridge...' : statusText[status]}
      </span>
      {!loading && status === 'healthy' && (
        <span className="text-xs text-[var(--accent-green)]">
          {Object.values(health?.chains ?? {}).filter(c => c.status === 'healthy').length} chains
        </span>
      )}
    </a>
  );
}
