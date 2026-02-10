'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, QrCode, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { isMobileDevice, pollErgoPayStatus } from '@/lib/ergo/ergopay';
import { txExplorerUrl } from '@/lib/ergo/constants';

interface ErgoPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  ergoPayUrl: string;
  qrCode: string;
  requestId: string;
  onSuccess: (txId: string) => void;
  message?: string;
}

export default function ErgoPayModal({
  isOpen,
  onClose,
  ergoPayUrl,
  qrCode,
  requestId,
  onSuccess,
  message = 'Sign the transaction in your Terminus wallet',
}: ErgoPayModalProps) {
  const [status, setStatus] = useState<'waiting' | 'signed' | 'error' | 'timeout'>('waiting');
  const [txId, setTxId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const isMobile = isMobileDevice();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('waiting');
      setTxId(null);
      setElapsedSec(0);
    }
  }, [isOpen, requestId]);

  // Poll for completion
  useEffect(() => {
    if (!isOpen || !requestId || status !== 'waiting') return;
    let cancelled = false;
    const startTime = Date.now();
    const TIMEOUT = 300000; // 5 min

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startTime > TIMEOUT) {
        setStatus('timeout');
        return;
      }
      try {
        const result = await pollErgoPayStatus(requestId);
        if (cancelled) return;
        if (result.status === 'signed' && result.txId) {
          setStatus('signed');
          setTxId(result.txId);
          onSuccess(result.txId);
          return;
        }
      } catch {
        // continue polling
      }
      setTimeout(poll, 3000);
    };

    poll();
    return () => { cancelled = true; };
  }, [isOpen, requestId, onSuccess, status]);

  // Elapsed time counter
  useEffect(() => {
    if (!isOpen || status !== 'waiting') return;
    const interval = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen, status]);

  const handleOpenInWallet = useCallback(() => {
    window.location.href = ergoPayUrl;
  }, [ergoPayUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Smartphone size={24} className="text-purple-400" />
          ErgoPay
        </h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>

        {/* Waiting state */}
        {status === 'waiting' && (
          <>
            {isMobile ? (
              <div className="space-y-4">
                <button
                  onClick={handleOpenInWallet}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  <Smartphone size={22} />
                  Open in Terminus Wallet
                </button>
                <button
                  onClick={handleOpenInWallet}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-600"
                >
                  Open in Ergo Wallet
                </button>
                <p className="text-slate-500 text-xs text-center">
                  Make sure you have a compatible Ergo wallet installed
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {qrCode ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-xl">
                      <img src={qrCode} alt="ErgoPay QR Code" className="w-56 h-56" />
                    </div>
                    <p className="text-slate-400 text-sm mt-3 flex items-center gap-1">
                      <QrCode size={16} />
                      Scan with Terminus or Ergo wallet
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-purple-400" />
                    <span className="ml-2 text-slate-400">Generating QR code...</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin text-purple-400" />
              <span>Waiting for signature... {elapsedSec > 0 && `(${elapsedSec}s)`}</span>
            </div>
          </>
        )}

        {/* Success state */}
        {status === 'signed' && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle size={56} className="text-green-400 mx-auto" />
            <p className="text-green-400 font-semibold text-lg">Transaction Signed!</p>
            {txId && (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs font-mono break-all bg-slate-800 p-2 rounded-lg">{txId}</p>
                <a
                  href={txExplorerUrl(txId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
                >
                  View on Explorer <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error / Timeout state */}
        {(status === 'error' || status === 'timeout') && (
          <div className="text-center space-y-4 py-4">
            <AlertCircle size={56} className="text-red-400 mx-auto" />
            <p className="text-red-400 font-semibold text-lg">
              {status === 'timeout' ? 'Request Timed Out' : 'Something Went Wrong'}
            </p>
            <p className="text-slate-400 text-sm">
              {status === 'timeout'
                ? 'The signing request expired. Please try again.'
                : 'An error occurred. Please try again.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setStatus('waiting'); setElapsedSec(0); }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
