'use client';

import { useState, useEffect } from 'react';
import { isMobileDevice } from '@/lib/ergo/ergopay';
import { isNautilusAvailable } from '@/lib/ergo/wallet';
import { Monitor, Smartphone } from 'lucide-react';

export type WalletType = 'nautilus' | 'ergopay';

interface WalletOption {
  id: WalletType;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  recommended?: boolean;
}

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
  title = "Connect Wallet"
}: WalletSelectorProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [hasNautilus, setHasNautilus] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setHasNautilus(isNautilusAvailable());
  }, []);

  const walletOptions: WalletOption[] = [
    {
      id: 'nautilus',
      name: 'Nautilus Wallet',
      description: 'Chrome extension for desktop',
      icon: '◎',
      available: hasNautilus,
      recommended: !isMobile,
    },
    {
      id: 'ergopay',
      name: 'Mobile Wallet',
      description: 'Terminus, SAFEW or other ErgoPay wallet',
      icon: '▫',
      available: true, // ErgoPay is always "available" as a protocol
      recommended: isMobile,
    },
  ];

  // Auto-select based on device type and availability
  useEffect(() => {
    if (isOpen) {
      // Store the user's preference
      const savedPreference = localStorage.getItem('ergo_wallet_preference') as WalletType;
      
      // If user has no saved preference, make a recommendation
      if (!savedPreference) {
        if (isMobile) {
          // On mobile, prefer ErgoPay unless they specifically want desktop
        } else if (hasNautilus) {
          // On desktop with Nautilus available, prefer Nautilus
        }
        // Don't auto-select, let user choose
      }
    }
  }, [isOpen, isMobile, hasNautilus]);

  const handleSelect = (walletType: WalletType) => {
    // Save user preference
    localStorage.setItem('ergo_wallet_preference', walletType);
    onSelect(walletType);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-2xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Wallet Options */}
        <div className="space-y-3">
          {walletOptions.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleSelect(wallet.id)}
              disabled={!wallet.available}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                wallet.available
                  ? 'border-[var(--border-secondary)] hover:border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 cursor-pointer'
                  : 'border-[var(--border-secondary)]/30 opacity-50 cursor-not-allowed'
              } ${
                wallet.recommended
                  ? 'ring-2 ring-[var(--accent-cyan)]/30'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{wallet.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      {wallet.name}
                    </h3>
                    {wallet.recommended && (
                      <span className="text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {wallet.description}
                  </p>
                  {!wallet.available && wallet.id === 'nautilus' && (
                    <p className="text-xs text-amber-400 mt-2">
                      Install Nautilus from Chrome Web Store
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 rounded-lg">
          <p className="text-xs text-[var(--text-secondary)]">
            {isMobile ? (
              <>
                <Smartphone className="w-4 h-4 text-slate-400 inline" /> <strong>Mobile:</strong> Use QR codes or deep links to connect your mobile wallet
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 text-slate-400 inline" /> <strong>Desktop:</strong> Browser extension wallets offer the smoothest experience
              </>
            )}
          </p>
        </div>

        {/* Alternative connection methods */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to get the preferred wallet type
export function useWalletPreference(): WalletType | null {
  const [preference, setPreference] = useState<WalletType | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ergo_wallet_preference') as WalletType;
      setPreference(saved);
    }
  }, []);

  return preference;
}

// Hook to get wallet recommendation based on device
export function useWalletRecommendation(): WalletType {
  const [recommendation, setRecommendation] = useState<WalletType>('nautilus');

  useEffect(() => {
    const mobile = isMobileDevice();
    const hasNautilus = isNautilusAvailable();
    
    if (mobile) {
      setRecommendation('ergopay');
    } else if (hasNautilus) {
      setRecommendation('nautilus');
    } else {
      // Desktop without Nautilus - still prefer Nautilus (user needs to install)
      setRecommendation('nautilus');
    }
  }, []);

  return recommendation;
}