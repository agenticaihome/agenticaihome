'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = '/auth' }: AuthGuardProps) {
  const { isAuthenticated, loading, connect, isAvailable } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2Z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">
            You need to connect your Ergo wallet to continue
          </p>
          
          {isAvailable ? (
            <button
              onClick={() => connect()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 font-medium mb-2">No Wallet Detected</p>
              <p className="text-orange-300 text-sm mb-4">
                You need an Ergo wallet to continue
              </p>
              <button
                onClick={() => window.open('https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai', '_blank')}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all"
              >
                Install Nautilus Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}