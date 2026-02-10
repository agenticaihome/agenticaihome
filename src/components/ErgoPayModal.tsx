'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, QrCode, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { isMobileDevice, pollErgoPayStatus } from '@/lib/ergo/ergopay';

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
  const isMobile = isMobileDevice();

  // Poll for completion
  useEffect(() => {
    if (!isOpen || !requestId) return;
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
  }, [isOpen, requestId, onSuccess]);

  const handleOpenInTerminus = useCallback(() => {
    window.location.href = ergoPayUrl;
  }, [ergoPayUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Smartphone size={24} className="text-purple-400" />
          ErgoPay
        </h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>

        {status === 'waiting' && (
          <>
            {isMobile ? (
              <div className="space-y-4">
                <button
                  onClick={handleOpenInTerminus}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Smartphone size={20} />
                  Open in Terminus Wallet
                </button>
                <p className="text-gray-500 text-xs text-center">
                  Make sure Terminus wallet is installed on your device
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {qrCode ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-xl">
                      <img src={qrCode} alt="ErgoPay QR Code" className="w-56 h-56" />
                    </div>
                    <p className="text-gray-400 text-sm mt-3 flex items-center gap-1">
                      <QrCode size={16} />
                      Scan with Terminus wallet
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center">Generating QR code...</p>
                )}
              </div>
            )}
            <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Waiting for signature...
            </div>
          </>
        )}

        {status === 'signed' && (
          <div className="text-center space-y-3">
            <CheckCircle size={48} className="text-green-400 mx-auto" />
            <p className="text-green-400 font-semibold">Transaction Signed!</p>
            {txId && (
              <p className="text-gray-400 text-xs font-mono break-all">{txId}</p>
            )}
          </div>
        )}

        {(status === 'error' || status === 'timeout') && (
          <div className="text-center space-y-3">
            <AlertCircle size={48} className="text-red-400 mx-auto" />
            <p className="text-red-400 font-semibold">
              {status === 'timeout' ? 'Request timed out' : 'Something went wrong'}
            </p>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              Close and try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
