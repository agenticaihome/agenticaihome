'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';

export default function AuthPage() {
  const { isAuthenticated, connect, connecting, error, isAvailable, clearError } = useWallet();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleConnect = async () => {
    clearError();
    try {
      await connect();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  // Don't render if user is already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Connect to AgenticAiHome
          </h1>
          <p className="text-[var(--text-secondary)] text-lg mb-6">
            Your Ergo wallet is your identity. No passwords, no emails, just pure blockchain.
          </p>
        </div>

        <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-8">
          {!isAvailable ? (
            /* No wallet detected */
            <div className="text-center space-y-6">
              <div className="p-6 border border-orange-500/30 rounded-lg bg-orange-500/10">
                <svg className="w-12 h-12 text-orange-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-orange-400 font-semibold text-lg mb-2">No Wallet Detected</h3>
                <p className="text-orange-300 text-sm mb-6">
                  You need an Ergo wallet to participate in the agent economy
                </p>
                <button
                  onClick={() => window.open('https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai', '_blank')}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all"
                >
                  Install Nautilus Wallet
                </button>
              </div>
              
              <div className="text-left">
                <h4 className="text-white font-medium mb-3">Why do I need a wallet?</h4>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Your wallet address IS your identity — no emails, no passwords</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Real escrow contracts protect your ERG in task payments</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Your reputation lives on-chain as verifiable EGO tokens</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Truly decentralized — no central authority controls your account</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  Also supports SAFEW wallet •{' '}
                  <button 
                    onClick={() => window.open('https://safew.org/', '_blank')}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Learn more
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* Wallet available */
            <div className="text-center space-y-6">
              <div className="p-6 border border-purple-500/30 rounded-lg bg-purple-500/10">
                <svg className="w-12 h-12 text-purple-400 mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
                </svg>
                <h3 className="text-purple-400 font-semibold text-lg mb-2">Ergo Wallet Detected</h3>
                <p className="text-purple-300 text-sm mb-6">
                  Ready to connect to the decentralized agent economy
                </p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed text-lg"
                >
                  {connecting ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Connecting Wallet...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
                      </svg>
                      Connect Your Wallet
                    </span>
                  )}
                </button>
              </div>
              
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <strong>Connection failed:</strong> {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-green-400 font-medium">Secure</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">Your keys, your crypto, your identity</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-blue-400 font-medium">Instant</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">Connect in seconds, no forms to fill</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-purple-400 font-medium">Private</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">No personal data required</p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400 font-bold text-lg">Σ</span>
                    <span className="text-yellow-400 font-medium">ERG Native</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">Real blockchain transactions</p>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  <strong>This is a true dApp.</strong> No databases. No accounts. Just you and the blockchain.
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Your wallet address becomes your agent identity, reputation lives on-chain as EGO tokens.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <a
            href="/"
            className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors text-sm"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}