'use client';

import { useState } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { formatErgAmount, truncateAddress } from '@/lib/ergo/explorer';
import { NAUTILUS_CHROME_URL } from '@/lib/ergo/constants';

export default function WalletConnect() {
  const { wallet, connecting, error, connect, disconnect, clearError, isAvailable } = useWallet();
  const { hasNautilus, hasSafew } = useWalletInstallation();
  const [showDropdown, setShowDropdown] = useState(false);

  // Show install prompt if no wallet is available
  if (!isAvailable) {
    return (
      <div className="relative">
        <button
          onClick={() => window.open(NAUTILUS_CHROME_URL, '_blank')}
          className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all flex items-center gap-2"
          aria-label="Install Nautilus Wallet extension"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/>
          </svg>
          Install Wallet
        </button>
      </div>
    );
  }

  // Connected state
  if (wallet.connected) {
    const displayAddress = wallet.address ? truncateAddress(wallet.address) : '';
    const ergBalance = parseFloat(wallet.balance.erg).toFixed(3);

    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-4 py-2 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-sm font-medium hover:bg-[var(--accent-green)]/20 transition-all flex items-center gap-2"
          aria-label={`Connected wallet ${displayAddress}, ${ergBalance} ERG. Click to open wallet menu`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
          <span className="font-mono text-xs">{displayAddress}</span>
          <span className="text-xs opacity-75">Σ{ergBalance}</span>
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          >
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-50">
            <div className="p-4 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--text-secondary)]">Wallet</span>
                <span className="text-xs px-2 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded capitalize">
                  {wallet.walletName}
                </span>
              </div>
              <div className="font-mono text-xs text-[var(--text-primary)] mb-2">
                {wallet.address}
              </div>
              <div className="text-lg font-semibold text-[var(--text-primary)]">
                {formatErgAmount(wallet.balance.erg)}
              </div>
              {wallet.balance.tokens.length > 0 && (
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  +{wallet.balance.tokens.length} token{wallet.balance.tokens.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  if (wallet.address) {
                    window.open(`https://explorer.ergoplatform.com/addresses/${wallet.address}`, '_blank');
                  }
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              >
                View on Explorer
              </button>
              <button
                onClick={() => {
                  if (wallet.address) {
                    navigator.clipboard.writeText(wallet.address);
                  }
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              >
                Copy Address
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={connecting}
        className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all flex items-center gap-2 disabled:opacity-50"
        aria-label={connecting ? "Connecting to wallet" : "Open wallet connection menu"}
        aria-expanded={showDropdown}
        aria-haspopup="true"
      >
        {connecting ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/>
            </svg>
            Connect Wallet
          </>
        )}
      </button>

      {/* Connection dropdown */}
      {showDropdown && !wallet.connected && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Connect Wallet</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Choose a wallet to connect to AgenticAiHome
            </p>
          </div>
          
          <div className="p-2 space-y-2">
            {hasNautilus && (
              <button
                onClick={() => {
                  connect('nautilus');
                  setShowDropdown(false);
                  clearError();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">N</span>
                </div>
                <div>
                  <div className="font-medium">Nautilus Wallet</div>
                  <div className="text-xs text-[var(--text-secondary)]">Browser Extension</div>
                </div>
              </button>
            )}
            
            {hasSafew && (
              <button
                onClick={() => {
                  connect('safew');
                  setShowDropdown(false);
                  clearError();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <div>
                  <div className="font-medium">SAFEW</div>
                  <div className="text-xs text-[var(--text-secondary)]">Browser Extension</div>
                </div>
              </button>
            )}

            {!hasNautilus && !hasSafew && (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  No wallets detected
                </p>
                <button
                  onClick={() => window.open(NAUTILUS_CHROME_URL, '_blank')}
                  className="text-sm text-[var(--accent-cyan)] hover:underline"
                >
                  Install Nautilus Wallet →
                </button>
              </div>
            )}

            {/* Future: ErgoPay mobile option */}
            <div className="border-t border-[var(--border)] pt-2 mt-2">
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] opacity-50 cursor-not-allowed rounded-md"
              >
                <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">📱</span>
                </div>
                <div>
                  <div className="font-medium">ErgoPay (Coming Soon)</div>
                  <div className="text-xs">Mobile QR Connection</div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 border-t border-[var(--border)] bg-red-500/10">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-300 hover:text-red-200 mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
