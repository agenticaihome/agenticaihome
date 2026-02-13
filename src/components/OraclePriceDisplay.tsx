'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOraclePoolBox, clearOracleCache, type OraclePoolBox } from '@/lib/ergo/oracle';
import { RefreshCw, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { ERGO_EXPLORER_UI } from '@/lib/ergo/constants';

interface OraclePriceDisplayProps {
  /** Compact mode shows just the price inline. */
  compact?: boolean;
  /** Callback when price is fetched (useful for parent components). */
  onPriceUpdate?: (price: number) => void;
  /** CSS class name for the wrapper. */
  className?: string;
}

export default function OraclePriceDisplay({
  compact = false,
  onPriceUpdate,
  className = '',
}: OraclePriceDisplayProps) {
  const [oracle, setOracle] = useState<OraclePoolBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOraclePoolBox();
      setOracle(data);
      onPriceUpdate?.(data.ergUsdPrice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch oracle price');
    } finally {
      setLoading(false);
    }
  }, [onPriceUpdate]);

  useEffect(() => {
    fetchPrice();
    // Refresh every 2 minutes
    const interval = setInterval(fetchPrice, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  const handleRefresh = () => {
    clearOracleCache();
    fetchPrice();
  };

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
        {loading ? (
          <span className="text-[var(--text-muted)]">Loading oracle…</span>
        ) : error ? (
          <span className="text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Oracle unavailable
          </span>
        ) : oracle ? (
          <>
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-medium">
              1 ERG = ${oracle.ergUsdPrice.toFixed(4)}
            </span>
            <span className="text-[var(--text-muted)] text-xs">on-chain</span>
          </>
        ) : null}
      </span>
    );
  }

  return (
    <div
      className={`bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          On-chain Oracle Price
        </h3>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)] rounded-lg transition-all disabled:opacity-50"
          title="Refresh oracle price"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : oracle ? (
        <div>
          <div className="text-2xl font-bold text-white">
            ${oracle.ergUsdPrice.toFixed(4)}
            <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">per ERG</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              On-chain verified
            </span>
            <span>Epoch #{oracle.epoch}</span>
            <a
              href={`${ERGO_EXPLORER_UI}/en/oracle-pool-state/ergusd`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--accent-cyan)] transition-colors"
            >
              Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : loading ? (
        <div className="h-10 flex items-center">
          <div className="animate-pulse bg-[var(--bg-card)] rounded h-6 w-32" />
        </div>
      ) : null}
    </div>
  );
}
