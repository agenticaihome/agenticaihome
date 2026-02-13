'use client';

import { useState, useEffect } from 'react';
import { canUseBabelFees, estimateBabelFeeRate } from '@/lib/ergo/babel-fees';
import { RECOMMENDED_TX_FEE, NANOERG_FACTOR } from '@/lib/ergo/constants';
import { Coins, Zap, AlertCircle, Loader2 } from 'lucide-react';

interface BabelFeeOptionProps {
  /** User's connected wallet address */
  userAddress: string;
  /** Called when user toggles babel fee usage */
  onToggle: (useBabelFees: boolean) => void;
  /** Whether babel fees are currently enabled */
  enabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * BabelFeeOption — UI toggle for paying transaction fees with EGO tokens.
 *
 * Shows the user:
 * - Whether babel fees are available
 * - Their EGO token balance
 * - Estimated EGO cost vs ERG cost
 * - Toggle to enable/disable
 *
 * Falls back gracefully if no EGO balance or no babel boxes available.
 */
export default function BabelFeeOption({
  userAddress,
  onToggle,
  enabled = false,
  className = '',
}: BabelFeeOptionProps) {
  const [loading, setLoading] = useState(true);
  const [hasEgo, setHasEgo] = useState(false);
  const [egoBalance, setEgoBalance] = useState<bigint>(BigInt(0));
  const [babelAvailable, setBabelAvailable] = useState(false);
  const [egoEstimate, setEgoEstimate] = useState<bigint | null>(null);
  const [rate, setRate] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      canUseBabelFees(userAddress),
      estimateBabelFeeRate(),
    ])
      .then(([availability, estimate]) => {
        if (cancelled) return;
        setHasEgo(availability.hasEgoTokens);
        setEgoBalance(availability.egoBalance);
        setBabelAvailable(availability.babelBoxesAvailable);
        setRate(availability.bestRate);
        if (estimate) {
          setEgoEstimate(estimate.egoTokensNeeded);
        }
      })
      .catch((err) => {
        if (!cancelled) setError('Failed to check babel fee availability');
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userAddress]);

  // Format ERG amount for display
  const ergFee = Number(RECOMMENDED_TX_FEE) / Number(NANOERG_FACTOR);

  // Don't render if address not connected
  if (!userAddress) return null;

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-zinc-400 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking EGO fee options...
      </div>
    );
  }

  // Not available — no babel boxes exist
  if (!babelAvailable) {
    return (
      <div className={`text-xs text-zinc-500 ${className}`}>
        <span className="flex items-center gap-1">
          <Coins className="w-3 h-3" />
          EGO fee payment not currently available
        </span>
      </div>
    );
  }

  // Available but user has no EGO
  if (!hasEgo) {
    return (
      <div className={`p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Coins className="w-4 h-4 text-amber-500" />
          <span>
            <strong className="text-zinc-200">Pay fees with EGO tokens</strong>
            {' '}— earn EGO by completing tasks to unlock this feature
          </span>
        </div>
      </div>
    );
  }

  // Fully available — show toggle
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      enabled
        ? 'border-amber-500/50 bg-amber-500/5'
        : 'border-zinc-700 bg-zinc-800/50'
    } ${className}`}>
      <label className="flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${enabled ? 'text-amber-400' : 'text-zinc-500'}`} />
          <div>
            <span className="text-sm font-medium text-zinc-200">
              Pay fees with EGO tokens
            </span>
            <div className="text-xs text-zinc-500 mt-0.5">
              {egoEstimate !== null ? (
                <>
                  ~{egoEstimate.toString()} EGO
                  <span className="text-zinc-600 mx-1">instead of</span>
                  {ergFee.toFixed(4)} ERG
                </>
              ) : (
                <>Balance: {egoBalance.toString()} EGO</>
              )}
            </div>
          </div>
        </div>

        {/* Toggle switch */}
        <div className="relative">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-amber-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
        </div>
      </label>

      {/* Info banner when enabled */}
      {enabled && (
        <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs text-zinc-500 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500/70" />
          <span>
            EGO tokens will be used to cover the transaction fee via{' '}
            <a
              href="https://github.com/ergoplatform/eips/blob/master/eip-0031.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500/80 hover:text-amber-400 underline"
            >
              EIP-31 Babel Fees
            </a>
            . No ERG needed.
          </span>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}
