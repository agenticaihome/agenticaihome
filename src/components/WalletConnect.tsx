'use client';

import { useState } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { formatErgAmount, truncateAddress } from '@/lib/ergo/explorer';
import { isValidErgoAddress } from '@/lib/ergo/wallet';
import { createPortal } from 'react-dom';
import { WalletSelector, WalletType } from './WalletSelector';
import { ClipboardList } from 'lucide-react';

interface WalletConnectProps {
  inline?: boolean;
  onConnect?: () => void;
}

export default function WalletConnect({ inline, onConnect }: WalletConnectProps) {
  const { wallet, connecting, error, connect, disconnect, clearError } = useWallet();
  const { detecting } = useWalletInstallation();
  const [showSelector, setShowSelector] = useState(false);
  const [showErgoPayInput, setShowErgoPayInput] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState('');
  const [showConnectedMenu, setShowConnectedMenu] = useState(false);

  const handleWalletSelect = async (walletType: WalletType) => {
    clearError();
    if (walletType === 'ergopay') {
      setShowErgoPayInput(true);
      return;
    }
    await connect(walletType);
    onConnect?.();
  };

  const handleErgoPayConnect = async () => {
    const trimmed = addressInput.trim();
    if (!trimmed) { setAddressError('Please enter your Ergo address'); return; }
    if (!isValidErgoAddress(trimmed)) { setAddressError('Invalid address. Must start with 9 or 3.'); return; }
    setAddressError('');
    clearError();
    await connect('ergopay', trimmed);
    setShowErgoPayInput(false);
    setAddressInput('');
    onConnect?.();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddressInput(text.trim());
      setAddressError('');
    } catch { setAddressError('Unable to read clipboard.'); }
  };

  // ErgoPay address input modal
  const ergoPayModal = showErgoPayInput && typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowErgoPayInput(false)} />
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/40">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] text-center mb-2">ErgoPay Connect</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-4">
            Open your wallet app and paste your Ergo address below.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => { setAddressInput(e.target.value); setAddressError(''); }}
              placeholder="9f... or 3..."
              className="flex-1 px-3 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/50 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleErgoPayConnect()}
              autoFocus
            />
            <button
              onClick={handlePaste}
              className="px-3 py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Paste from clipboard"
            >
              <ClipboardList className="w-4 h-4" />
            </button>
          </div>
          {addressError && <p className="text-xs text-red-400 mb-3">{addressError}</p>}
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button
            onClick={handleErgoPayConnect}
            disabled={connecting || !addressInput.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
        <div className="px-6 pb-6 text-center">
          <button
            onClick={() => { setShowErgoPayInput(false); setAddressError(''); }}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  // Inline mode (mobile menu)
  if (inline) {
    if (wallet.connected) return null;
    return (
      <>
        <button
          onClick={() => setShowSelector(true)}
          disabled={connecting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)]/20 to-blue-500/20 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]/50 transition-all text-sm font-medium"
        >
          {connecting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              Connecting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/></svg>
              Connect Wallet
            </>
          )}
        </button>
        <WalletSelector isOpen={showSelector} onClose={() => setShowSelector(false)} onSelect={handleWalletSelect} />
        {ergoPayModal}
      </>
    );
  }

  // Detecting state
  if (detecting) {
    return (
      <button disabled className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium opacity-50 flex items-center gap-2">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
        Detecting...
      </button>
    );
  }

  // Connected state
  if (wallet.connected) {
    const displayAddress = wallet.address ? truncateAddress(wallet.address) : '';
    const ergBalance = parseFloat(wallet.balance.erg).toFixed(3);

    return (
      <div className="relative">
        <button
          onClick={() => setShowConnectedMenu(!showConnectedMenu)}
          className="px-4 py-2 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-sm font-medium hover:bg-[var(--accent-green)]/20 transition-all flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
          <span className="font-mono text-xs">{displayAddress}</span>
          <span className="text-xs opacity-75">Σ{ergBalance}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={`transform transition-transform ${showConnectedMenu ? 'rotate-180' : ''}`}><path d="M7 10l5 5 5-5z"/></svg>
        </button>

        {showConnectedMenu && (
          <>
            <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50">
              <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--text-secondary)]">Wallet</span>
                  <span className="text-xs px-2 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded capitalize">{wallet.walletName}</span>
                </div>
                <div className="font-mono text-xs text-[var(--text-primary)] mb-2 break-all">{wallet.address}</div>
                <div className="text-lg font-semibold text-[var(--text-primary)]">{formatErgAmount(wallet.balance.erg)}</div>
                {wallet.balance.tokens.length > 0 && (
                  <div className="text-xs text-[var(--text-secondary)] mt-1">+{wallet.balance.tokens.length} token{wallet.balance.tokens.length !== 1 ? 's' : ''}</div>
                )}
              </div>
              <div className="p-2">
                <button
                  onClick={() => { if (wallet.address) window.open(`https://explorer.ergoplatform.com/addresses/${wallet.address}`, '_blank'); setShowConnectedMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >View on Explorer</button>
                <button
                  onClick={() => { if (wallet.address) navigator.clipboard.writeText(wallet.address); setShowConnectedMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                >Copy Address</button>
                <button
                  onClick={() => { disconnect(); setShowConnectedMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                >Disconnect</button>
              </div>
            </div>
            <div className="fixed inset-0 z-40" onClick={() => setShowConnectedMenu(false)} />
          </>
        )}
      </div>
    );
  }

  // Disconnected state — clean button → opens modal
  return (
    <>
      <button
        onClick={() => setShowSelector(true)}
        disabled={connecting}
        className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        {connecting ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none"/><path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            Connecting...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/></svg>
            Connect Wallet
          </>
        )}
      </button>
      <WalletSelector isOpen={showSelector} onClose={() => setShowSelector(false)} onSelect={handleWalletSelect} />
      {ergoPayModal}
    </>
  );
}
