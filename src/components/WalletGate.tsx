'use client';

import { ReactNode } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { NAUTILUS_CHROME_URL } from '@/lib/ergo/constants';

interface WalletGateProps {
  children: ReactNode;
  message?: string;
}

export default function WalletGate({ children, message = 'Connect your wallet to continue' }: WalletGateProps) {
  const { wallet, connecting, connect, isAvailable } = useWallet();
  const { hasNautilus, hasSafew } = useWalletInstallation();

  if (wallet.connected) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">🔒</div>
        <h3 className="text-xl font-bold text-[var(--text-primary)]">Wallet Required</h3>
        <p className="text-[var(--text-secondary)] text-sm">{message}</p>

        {isAvailable ? (
          <div className="space-y-2">
            {hasNautilus && (
              <button onClick={() => connect('nautilus')} disabled={connecting}
                className="w-full py-3 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {connecting ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                ) : null}
                Connect Nautilus
              </button>
            )}
            {hasSafew && (
              <button onClick={() => connect('safew')} disabled={connecting}
                className="w-full py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-sm">
                Connect SAFEW
              </button>
            )}
          </div>
        ) : (
          <a href={NAUTILUS_CHROME_URL} target="_blank" rel="noopener noreferrer"
            className="inline-block py-3 px-6 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity">
            Install Nautilus Wallet
          </a>
        )}
      </div>
    </div>
  );
}
