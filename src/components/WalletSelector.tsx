'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { isMobileDevice } from '@/lib/ergo/ergopay';
import { isNautilusAvailable } from '@/lib/ergo/wallet';

export type WalletType = 'nautilus' | 'ergopay' | 'safew';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (walletType: WalletType) => void;
  title?: string;
}

export function WalletSelector({ 
  isOpen, 
  onClose, 
  onSelect,
  title = "Select Wallet"
}: WalletSelectorProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hasNautilus, setHasNautilus] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setHasNautilus(isNautilusAvailable());
  }, []);

  const handleSelect = useCallback((walletType: WalletType) => {
    localStorage.setItem('ergo_wallet_preference', walletType);
    onSelect(walletType);
    onClose();
  }, [onSelect, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal — clean, centered, simple */}
      <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
        </div>

        {/* Wallet buttons */}
        <div className="px-6 pb-4 space-y-3">
          {/* Nautilus — show on desktop, or if installed */}
          {(!isMobile || hasNautilus) && (
            <button
              onClick={() => handleSelect('nautilus')}
              disabled={!hasNautilus}
              className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-base font-semibold transition-all ${
                hasNautilus
                  ? 'bg-gradient-to-r from-[var(--accent-cyan)]/20 to-blue-500/20 border-2 border-[var(--accent-cyan)]/40 text-[var(--text-primary)] hover:border-[var(--accent-cyan)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-[0.98]'
                  : 'bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span>NAUTILUS</span>
              {!hasNautilus && !isMobile && (
                <span className="text-xs text-[var(--text-muted)] font-normal ml-1">(not installed)</span>
              )}
            </button>
          )}

          {/* ErgoPay — always available */}
          <button
            onClick={() => handleSelect('ergopay')}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-base font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 text-[var(--text-primary)] hover:border-purple-500/70 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] active:scale-[0.98] transition-all"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <span>ERGOPAY</span>
          </button>
        </div>

        {/* Install hint for desktop without Nautilus */}
        {!isMobile && !hasNautilus && (
          <div className="px-6 pb-4">
            <a
              href="https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--accent-cyan)] hover:underline"
            >
              Install Nautilus Wallet →
            </a>
          </div>
        )}

        {/* Close */}
        <div className="px-6 pb-6 text-center">
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// Hooks
export function useWalletPreference(): WalletType | null {
  const [preference, setPreference] = useState<WalletType | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPreference(localStorage.getItem('ergo_wallet_preference') as WalletType);
    }
  }, []);
  return preference;
}

export function useWalletRecommendation(): WalletType {
  const [rec, setRec] = useState<WalletType>('nautilus');
  useEffect(() => {
    setRec(isMobileDevice() ? 'ergopay' : 'nautilus');
  }, []);
  return rec;
}
