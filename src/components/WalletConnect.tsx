'use client';

import { useState } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { formatErgAmount, truncateAddress } from '@/lib/ergo/explorer';
import { NAUTILUS_CHROME_URL } from '@/lib/ergo/constants';
import { isMobileDevice } from '@/lib/ergo/ergopay';
import { isValidErgoAddress } from '@/lib/ergo/wallet';
import { ClipboardList, Smartphone } from 'lucide-react';

interface WalletConnectProps {
  /** Render as full-width inline form (for mobile menu) */
  inline?: boolean;
  /** Called after successful connection */
  onConnect?: () => void;
}

export default function WalletConnect({ inline, onConnect }: WalletConnectProps) {
  const { wallet, connecting, error, connect, disconnect, clearError, isAvailable } = useWallet();
  const { hasNautilus, hasSafew, detecting } = useWalletInstallation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showErgoPayInput, setShowErgoPayInput] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState('');
  const isMobile = typeof window !== 'undefined' && isMobileDevice();

  const handleErgoPayConnect = async () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      setAddressError('Please enter your Ergo address');
      return;
    }
    if (!isValidErgoAddress(trimmed)) {
      setAddressError('Invalid address. Must start with 9 or 3 and be 51-52 characters.');
      return;
    }
    setAddressError('');
    clearError();
    await connect('ergopay', trimmed);
    setShowDropdown(false);
    setShowErgoPayInput(false);
    setAddressInput('');
    onConnect?.();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddressInput(text.trim());
      setAddressError('');
    } catch {
      setAddressError('Unable to read clipboard. Please paste manually.');
    }
  };

  const ergoPayInputUI = (
    <div className={`space-y-3 ${inline ? '' : 'p-3 border-t border-[var(--border)]'}`}>
      <p className="text-xs text-[var(--text-secondary)]">
        Open your wallet app (Terminus, SAFEW), copy your address, and paste it below.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={addressInput}
          onChange={(e) => { setAddressInput(e.target.value); setAddressError(''); }}
          placeholder="9f... or 3..."
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/50 font-mono"
          onKeyDown={(e) => e.key === 'Enter' && handleErgoPayConnect()}
          autoFocus
        />
        <button
          onClick={handlePasteFromClipboard}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap"
          title="Paste from clipboard"
        >
          <ClipboardList className="w-4 h-4 text-slate-400 inline" /> Paste
        </button>
      </div>
      {addressError && <p className="text-xs text-red-400">{addressError}</p>}
      <button
        onClick={handleErgoPayConnect}
        disabled={connecting || !addressInput.trim()}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );

  // Inline mode for mobile menu
  if (inline) {
    if (wallet.connected) return null; // Connected state handled by Navbar

    return (
      <div className="space-y-3">
        {!showErgoPayInput ? (
          <>
            <button
              onClick={() => setShowErgoPayInput(true)}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-[var(--text-primary)] hover:border-purple-500/50 transition-all text-sm font-medium"
            >
              <Smartphone className="w-5 h-5 text-slate-400 inline" />
              Connect via ErgoPay
            </button>
            {!isMobile && hasNautilus && (
              <button
                onClick={async () => { clearError(); await connect('nautilus'); onConnect?.(); }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/40 hover:text-[var(--text-primary)] transition-all text-sm"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">N</span>
                </div>
                Nautilus Wallet
              </button>
            )}
            {!isMobile && hasSafew && (
              <button
                onClick={async () => { clearError(); await connect('safew'); onConnect?.(); }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/40 hover:text-[var(--text-primary)] transition-all text-sm"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-teal-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">S</span>
                </div>
                SAFEW
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => { setShowErgoPayInput(false); setAddressError(''); }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Back
            </button>
            {ergoPayInputUI}
          </>
        )}
        {error && (
          <div className="p-3 bg-red-500/10 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={clearError} className="text-xs text-red-300 hover:text-red-200 mt-1">Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  // --- Standard dropdown mode (desktop / non-inline) ---

  // On mobile, always show connect (ErgoPay available without extension)
  // On desktop, show loading while detecting, then install if nothing found
  if (!isAvailable && !isMobile) {
    if (detecting) {
      return (
        <div className="relative">
          <button
            disabled
            className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none"/>
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Detecting Wallet...
          </button>
        </div>
      );
    }

    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all flex items-center gap-2"
          aria-label="Connect wallet"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/>
          </svg>
          Connect Wallet
        </button>

        {showDropdown && (
          <>
            <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-50">
              <div className="p-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">Connect Wallet</h3>
                <p className="text-sm text-[var(--text-secondary)]">No browser wallet detected</p>
              </div>
              <div className="p-2 space-y-2">
                <button
                  onClick={() => setShowErgoPayInput(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs"><Smartphone className="w-4 h-4 text-slate-400 inline" /></span>
                  </div>
                  <div>
                    <div className="font-medium">Connect via ErgoPay</div>
                    <div className="text-xs text-[var(--text-secondary)]">Enter your Ergo address</div>
                  </div>
                </button>
                {showErgoPayInput && ergoPayInputUI}
                <div className="border-t border-[var(--border)] pt-2">
                  <button
                    onClick={() => window.open(NAUTILUS_CHROME_URL, '_blank')}
                    className="w-full text-sm text-[var(--accent-cyan)] hover:underline px-3 py-2 text-left"
                  >
                    Install Nautilus Wallet →
                  </button>
                </div>
              </div>
            </div>
            <div className="fixed inset-0 z-40" onClick={() => { setShowDropdown(false); setShowErgoPayInput(false); }} />
          </>
        )}
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
          aria-label={`Connected wallet ${displayAddress}, ${ergBalance} ERG`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
          <span className="font-mono text-xs">{displayAddress}</span>
          <span className="text-xs opacity-75">Σ{ergBalance}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`}>
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>

        {showDropdown && (
          <>
            <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-50">
              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-secondary)]">Wallet</span>
                  <span className="text-xs px-2 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded capitalize">
                    {wallet.walletName}
                  </span>
                </div>
                <div className="font-mono text-xs text-[var(--text-primary)] mb-2 break-all">
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
                    if (wallet.address) window.open(`https://explorer.ergoplatform.com/addresses/${wallet.address}`, '_blank');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >
                  View on Explorer
                </button>
                <button
                  onClick={() => {
                    if (wallet.address) navigator.clipboard.writeText(wallet.address);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >
                  Copy Address
                </button>
                <button
                  onClick={() => { disconnect(); setShowDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          </>
        )}
      </div>
    );
  }

  // Disconnected state — wallet available or mobile
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={connecting}
        className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all flex items-center gap-2 disabled:opacity-50"
        aria-label={connecting ? "Connecting to wallet" : "Open wallet connection menu"}
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

      {showDropdown && !wallet.connected && (
        <>
          <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl z-50">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--text-primary)] mb-2">Connect Wallet</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {isMobile ? 'Connect your mobile wallet' : 'Choose a wallet to connect'}
              </p>
            </div>
            
            <div className="p-2 space-y-2">
              {/* Desktop browser wallets */}
              {!isMobile && hasNautilus && (
                <button
                  onClick={() => { connect('nautilus'); setShowDropdown(false); clearError(); onConnect?.(); }}
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
              
              {!isMobile && hasSafew && (
                <button
                  onClick={() => { connect('safew'); setShowDropdown(false); clearError(); onConnect?.(); }}
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

              {/* ErgoPay — always available, prominent on mobile */}
              <div className={!isMobile && (hasNautilus || hasSafew) ? 'border-t border-[var(--border)] pt-2 mt-2' : ''}>
                <button
                  onClick={() => setShowErgoPayInput(!showErgoPayInput)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs"><Smartphone className="w-4 h-4 text-slate-400 inline" /></span>
                  </div>
                  <div>
                    <div className="font-medium">{isMobile ? 'Connect via ErgoPay' : 'ErgoPay (Mobile)'}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {isMobile ? 'Terminus / Ergo Wallet' : 'Enter your Ergo address'}
                    </div>
                  </div>
                </button>
              </div>

              {showErgoPayInput && ergoPayInputUI}

              {/* Install link on desktop if no wallets found */}
              {!isMobile && !hasNautilus && !hasSafew && (
                <div className="border-t border-[var(--border)] pt-2">
                  <button
                    onClick={() => window.open(NAUTILUS_CHROME_URL, '_blank')}
                    className="w-full text-sm text-[var(--accent-cyan)] hover:underline px-3 py-2 text-left"
                  >
                    Install Nautilus Wallet →
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 border-t border-[var(--border)] bg-red-500/10">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={clearError} className="text-xs text-red-300 hover:text-red-200 mt-1">
                  Dismiss
                </button>
              </div>
            )}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => { setShowDropdown(false); setShowErgoPayInput(false); }} />
        </>
      )}
    </div>
  );
}
