'use client';

import { useState, useEffect } from 'react';
import { createErgoPayRequest } from '@/lib/ergo/ergopay';
import { AlertTriangle, Book, ClipboardList, Lightbulb, Smartphone, Wrench } from 'lucide-react';

interface ErgoPayQRProps {
  /** The unsigned transaction to convert to ErgoPay */
  unsignedTx: any;
  /** User's address for verification */
  userAddress?: string;
  /** Message to show in the wallet */
  message?: string;
  /** Message severity */
  messageSeverity?: 'info' | 'warning' | 'error';
  /** Title for the QR code section */
  title?: string;
  /** Subtitle/description */
  description?: string;
  /** Called when the QR code is generated successfully */
  onGenerated?: (data: { url: string; qrCode: string; deepLink: string }) => void;
  /** Called when there's an error generating the QR code */
  onError?: (error: string) => void;
}

export function ErgoPayQR({ 
  unsignedTx,
  userAddress,
  message,
  messageSeverity = 'info',
  title = "Scan with Mobile Wallet",
  description = "Use your mobile Ergo wallet to scan this QR code and complete the transaction.",
  onGenerated,
  onError,
}: ErgoPayQRProps) {
  const [qrData, setQrData] = useState<{ url: string; qrCode: string; deepLink: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unsignedTx) {
      setError('No transaction provided');
      setLoading(false);
      return;
    }

    const generateQR = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await createErgoPayRequest(unsignedTx, {
          userAddress,
          message,
          messageSeverity,
        });

        setQrData(data);
        onGenerated?.(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate QR code';
        setError(errorMessage);
        onError?.(errorMessage);
        console.error('ErgoPay QR generation error:', err);
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [unsignedTx, userAddress, message, messageSeverity, onGenerated, onError]);

  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="inline-block animate-spin text-2xl mb-4">⟳</div>
        <p className="text-[var(--text-secondary)]">Generating QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="text-4xl mb-4"><AlertTriangle className="w-4 h-4 text-yellow-400 inline" /></div>
        <h3 className="text-lg font-semibold text-red-400 mb-2">QR Code Error</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-sm text-[var(--accent-cyan)] hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!qrData) {
    return (
      <div className="text-center p-8">
        <div className="text-4xl mb-4">❓</div>
        <p className="text-[var(--text-secondary)]">No QR code data available</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      {/* Title and Description */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {description}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-2xl shadow-lg">
          <img 
            src={qrData.qrCode} 
            alt="ErgoPay QR Code"
            className="w-64 h-64 block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>

      {/* Mobile Actions */}
      <div className="space-y-3">
        {/* Deep Link Button */}
        <a
          href={qrData.deepLink}
          className="block w-full py-3 px-6 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          onClick={(e) => {
            // On desktop, warn user that deep links won't work
            if (window.innerWidth > 768) {
              e.preventDefault();
              alert('Deep links work on mobile devices. Use the QR code instead or open this on your mobile device.');
            }
          }}
        >
          <Smartphone className="w-4 h-4 text-slate-400 inline" /> Open in Wallet App
        </a>

        {/* Copy Link Button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(qrData.url).then(() => {
              // Show temporary success message
              const btn = document.activeElement as HTMLButtonElement;
              const originalText = btn.textContent;
              btn.textContent = '✓ Copied!';
              setTimeout(() => {
                btn.textContent = originalText;
              }, 2000);
            });
          }}
          className="block w-full py-2 px-6 border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-cyan)]/10 transition-colors text-sm"
        >
          <ClipboardList className="w-4 h-4 text-slate-400 inline" /> Copy Link
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 rounded-lg p-4 text-left">
        <h4 className="font-semibold text-[var(--text-primary)] mb-2">
          <Book className="w-4 h-4 text-blue-400 inline" /> Instructions:
        </h4>
        <ol className="text-sm text-[var(--text-secondary)] space-y-1 list-decimal list-inside">
          <li>Open your Ergo mobile wallet (Terminus, SAFEW, etc.)</li>
          <li>Look for "Scan QR" or "ErgoPay" option</li>
          <li>Scan the QR code above</li>
          <li>Review the transaction details in your wallet</li>
          <li>Confirm to sign and broadcast the transaction</li>
        </ol>
        <p className="text-xs text-[var(--text-secondary)] mt-3 opacity-80">
          <Lightbulb className="w-4 h-4 text-yellow-400 inline" /> On mobile? Tap "Open in Wallet App" button instead of scanning.
        </p>
      </div>

      {/* Technical Details (Collapsible) */}
      <details className="text-left">
        <summary className="text-sm text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] select-none">
          <Wrench className="w-4 h-4 text-slate-400 inline" /> Technical Details
        </summary>
        <div className="mt-3 p-3 bg-[var(--card-bg)] border border-[var(--border-secondary)] rounded-lg">
          <div className="space-y-2 text-xs text-[var(--text-secondary)] font-mono">
            <div>
              <span className="text-[var(--text-primary)]">Protocol:</span> EIP-20 ErgoPay
            </div>
            <div>
              <span className="text-[var(--text-primary)]">URL Length:</span> {qrData.url.length} chars
            </div>
            {userAddress && (
              <div className="break-all">
                <span className="text-[var(--text-primary)]">Address:</span> {userAddress}
              </div>
            )}
            {message && (
              <div>
                <span className="text-[var(--text-primary)]">Message:</span> {message}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

export default ErgoPayQR;