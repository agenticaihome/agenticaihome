'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Copy, Check, AlertTriangle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import {
  getSupportedChains,
  estimateBridgeFee,
  generateBridgeDeposit,
  getConversionDisplay,
  ROSEN_APP_URL,
  type SourceChain,
  type SupportedChain,
  type BridgeFeeEstimate,
  type BridgeDepositInfo,
} from '@/lib/bridge/rosen';
import BridgeStatus from './BridgeStatus';

interface CrossChainPaymentProps {
  /** Required ERG amount for the task escrow */
  requiredErg: number;
  /** User's Ergo wallet address (destination for bridged funds) */
  ergoAddress: string;
  /** Callback when user completes bridge (returns to fund escrow) */
  onBridgeComplete?: () => void;
  /** Optional: show compact version */
  compact?: boolean;
}

type PaymentStep = 'select-chain' | 'review' | 'instructions' | 'waiting';

export default function CrossChainPayment({
  requiredErg,
  ergoAddress,
  onBridgeComplete,
  compact = false,
}: CrossChainPaymentProps) {
  const [step, setStep] = useState<PaymentStep>('select-chain');
  const [selectedChain, setSelectedChain] = useState<SourceChain | null>(null);
  const [amount, setAmount] = useState('');
  const [fees, setFees] = useState<BridgeFeeEstimate | null>(null);
  const [deposit, setDeposit] = useState<BridgeDepositInfo | null>(null);
  const [conversion, setConversion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const chains = getSupportedChains();

  // Estimate fees when chain/amount changes
  useEffect(() => {
    if (!selectedChain || !amount || parseFloat(amount) <= 0) {
      setFees(null);
      setConversion('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [feeResult, convResult] = await Promise.all([
          estimateBridgeFee(selectedChain, parseFloat(amount)),
          getConversionDisplay(selectedChain, parseFloat(amount)),
        ]);
        setFees(feeResult);
        setConversion(convResult.display);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fee estimation failed');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedChain, amount]);

  const handleChainSelect = (chain: SourceChain) => {
    setSelectedChain(chain);
    setStep('review');
    setAmount('');
    setFees(null);
    setError(null);
  };

  const handleProceed = useCallback(async () => {
    if (!selectedChain || !amount) return;

    setLoading(true);
    setError(null);
    try {
      const depositInfo = await generateBridgeDeposit(
        selectedChain,
        parseFloat(amount),
        ergoAddress,
      );
      setDeposit(depositInfo);
      setStep('instructions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate deposit instructions');
    } finally {
      setLoading(false);
    }
  }, [selectedChain, amount, ergoAddress]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const selectedChainData = chains.find(c => c.key === selectedChain);

  // ─── Chain Selection ───────────────────────────────────────────
  if (step === 'select-chain') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pay with Another Chain</h3>
          <BridgeStatus compact />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Bridge assets from other blockchains to Ergo via{' '}
          <a href={ROSEN_APP_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">
            Rosen Bridge
          </a>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {chains.map(chain => (
            <button
              key={chain.key}
              onClick={() => handleChainSelect(chain.key)}
              className="card p-4 text-center hover:border-[var(--accent-cyan)]/40 transition-all group"
            >
              <div className="text-2xl mb-2">{chain.icon}</div>
              <div className="font-medium text-sm group-hover:text-[var(--accent-cyan)] transition-colors">
                {chain.label}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                ~{chain.confirmationMinutes} min
              </div>
            </button>
          ))}
        </div>

        <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Bridge fee: max(0.5%, ~$10) + network fees. Powered by Rosen Bridge.
        </div>
      </div>
    );
  }

  // ─── Review / Enter Amount ─────────────────────────────────────
  if (step === 'review' && selectedChainData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setStep('select-chain'); setSelectedChain(null); }}
            className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h3 className="text-lg font-semibold">
            Pay with {selectedChainData.label}
          </h3>
        </div>

        {/* Required amount display */}
        <div className="card p-4 bg-[var(--accent-cyan)]/5 border-[var(--accent-cyan)]/20">
          <div className="text-sm text-[var(--text-secondary)] mb-1">Task escrow requires</div>
          <div className="text-xl font-bold text-[var(--accent-cyan)]">
            {requiredErg.toFixed(4)} ERG
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Amount in {selectedChainData.nativeToken}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`e.g., ${fees?.minimumAmount ?? '0.01'}`}
              className="input w-full pr-16"
              step="any"
              min="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
              {selectedChainData.nativeToken}
            </span>
          </div>
        </div>

        {/* Conversion display */}
        {conversion && (
          <div className="text-sm text-[var(--accent-green)] font-medium">
            {conversion}
          </div>
        )}

        {/* Fee breakdown */}
        {fees && (
          <div className="card p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Bridge fee</span>
              <span>{fees.bridgeFee.toFixed(6)} {selectedChainData.nativeToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Network fee (est.)</span>
              <span>{fees.networkFee.toFixed(6)} {selectedChainData.nativeToken}</span>
            </div>
            <div className="border-t border-[var(--border-color)] pt-2 flex justify-between font-medium">
              <span>You receive (est.)</span>
              <span className="text-[var(--accent-green)]">
                ~{fees.estimatedErgReceived.toFixed(2)} ERG
              </span>
            </div>
            {fees.estimatedErgReceived < requiredErg && parseFloat(amount) > 0 && (
              <div className="flex items-center gap-1 text-yellow-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                Estimated ERG is less than required. Consider sending more.
              </div>
            )}
          </div>
        )}

        {/* Estimated time */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Clock className="w-4 h-4" />
          Estimated time: ~{selectedChainData.confirmationMinutes} minutes
        </div>

        {error && (
          <div className="text-sm text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </div>
        )}

        <button
          onClick={handleProceed}
          disabled={loading || !amount || parseFloat(amount) <= 0 || !!error}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue to Bridge <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Bridge Instructions ───────────────────────────────────────
  if (step === 'instructions' && deposit && selectedChainData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep('review')}
            className="text-[var(--text-secondary)] hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h3 className="text-lg font-semibold">
            Bridge {deposit.amountToSend} {deposit.token} to Ergo
          </h3>
        </div>

        {/* Step-by-step instructions */}
        <div className="card p-5 space-y-3">
          <h4 className="font-semibold text-[var(--accent-cyan)] flex items-center gap-2">
            <span className="text-lg">{selectedChainData.icon}</span>
            {selectedChainData.label} → Ergo Bridge Instructions
          </h4>

          <ol className="space-y-2">
            {deposit.steps.map((stepText, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-[var(--text-secondary)] pt-0.5">{stepText.replace(/^\d+\.\s*/, '')}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Ergo destination address */}
        <div className="card p-4">
          <div className="text-xs text-[var(--text-muted)] mb-1">Your Ergo address (destination)</div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-[var(--accent-green)] break-all flex-1">
              {ergoAddress}
            </code>
            <button
              onClick={() => copyToClipboard(ergoAddress)}
              className="flex-shrink-0 p-1.5 rounded hover:bg-[var(--bg-card-hover)] transition-colors"
              title="Copy address"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[var(--accent-green)]" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </button>
          </div>
        </div>

        {/* Fee summary */}
        <div className="card p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Sending</span>
            <span>{deposit.amountToSend} {deposit.token}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Total fees</span>
            <span>{deposit.fees.totalFee.toFixed(6)} {deposit.token}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Receive (est.)</span>
            <span className="text-[var(--accent-green)]">
              ~{deposit.fees.estimatedErgReceived.toFixed(2)} ERG (~${deposit.fees.estimatedUsdReceived.toFixed(2)})
            </span>
          </div>
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Est. time</span>
            <span>~{deposit.estimatedMinutes} min</span>
          </div>
        </div>

        {/* Open Rosen Bridge button */}
        <a
          href={deposit.rosenAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          Open Rosen Bridge <ExternalLink className="w-4 h-4" />
        </a>

        {/* After bridge completes */}
        <button
          onClick={() => {
            setStep('waiting');
            onBridgeComplete?.();
          }}
          className="btn-secondary w-full"
        >
          I&apos;ve completed the bridge transfer
        </button>

        <div className="text-xs text-[var(--text-muted)] text-center">
          After bridging, you&apos;ll receive wrapped tokens on Ergo. Swap them to ERG on{' '}
          <a href="https://app.spectrum.fi/ergo/swap" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline">
            Spectrum DEX
          </a>{' '}
          to fund the escrow.
        </div>
      </div>
    );
  }

  // ─── Waiting / Completion ──────────────────────────────────────
  if (step === 'waiting') {
    return (
      <div className="card p-6 text-center space-y-4">
        <div className="text-4xl">🌉</div>
        <h3 className="text-lg font-semibold">Bridge Transfer In Progress</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Your {selectedChainData?.label} transfer is being processed by the Rosen Bridge watchers and guards.
          This typically takes ~{selectedChainData?.confirmationMinutes ?? 30} minutes.
        </p>

        <div className="flex items-center justify-center gap-2 text-[var(--accent-cyan)]">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Waiting for confirmation...</span>
        </div>

        <div className="space-y-2">
          <a
            href={ROSEN_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            Check status on Rosen Bridge <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => {
              setStep('select-chain');
              setSelectedChain(null);
              setAmount('');
              setDeposit(null);
            }}
            className="btn-outline w-full text-sm"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return null;
}
