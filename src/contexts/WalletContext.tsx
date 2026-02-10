'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  WalletState,
  connectWallet as connectErgoWallet,
  disconnectWallet as disconnectErgoWallet,
  getWalletState,
  signTransaction,
  submitTransaction,
  autoReconnectWallet,
  isWalletAvailable,
  waitForWallet,
  WalletError,
  WalletNotFoundError,
  WalletConnectionError,
  WalletRejectedError,
} from '@/lib/ergo/wallet';
import { BALANCE_REFRESH_INTERVAL } from '@/lib/ergo/constants';
import { WalletProfile, createOrUpdateWalletProfile, getWalletProfile } from '@/lib/supabaseStore';

// Wallet context types
interface WalletContextType {
  // Wallet state
  wallet: WalletState;
  connecting: boolean;
  error: string | null;
  
  // Authentication state (wallet = auth)
  isAuthenticated: boolean;
  userAddress: string | null;
  profile: WalletProfile | null;
  loading: boolean;
  
  // Connection methods
  connect: (preferredWallet?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Transaction methods
  signTx: (tx: any) => Promise<any>;
  submitTx: (tx: any) => Promise<string>;
  signMsg: (message: string, address?: string) => Promise<string>;
  
  // Profile methods
  updateProfile: (displayName: string) => Promise<WalletProfile>;
  
  // Utility methods
  refreshBalance: () => Promise<void>;
  clearError: () => void;
  
  // Wallet availability
  isAvailable: boolean;
}

// Default wallet state
const defaultWalletState: WalletState = {
  connected: false,
  address: null,
  addresses: [],
  balance: { erg: '0', tokens: [] },
  walletName: null,
};

// Default context value
const defaultContextValue: WalletContextType = {
  wallet: defaultWalletState,
  connecting: false,
  error: null,
  isAuthenticated: false,
  userAddress: null,
  profile: null,
  loading: false,
  connect: async () => {},
  disconnect: async () => {},
  signTx: async () => ({}),
  submitTx: async () => '',
  signMsg: async () => '',
  updateProfile: async () => ({ address: '', joinedAt: '' }),
  refreshBalance: async () => {},
  clearError: () => {},
  isAvailable: false,
};

// Create context
const WalletContext = createContext<WalletContextType>(defaultContextValue);

// Custom hook to use wallet context
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Wallet provider props
interface WalletProviderProps {
  children: ReactNode;
}

// Wallet provider component
export function WalletProvider({ children }: WalletProviderProps): React.JSX.Element {
  const [wallet, setWallet] = useState<WalletState>(defaultWalletState);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Balance refresh interval
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Check wallet availability on mount (wait for extension injection)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wallet extensions inject async — poll for them
      waitForWallet(5000).then((available) => {
        setIsAvailable(available);
        if (available) {
          handleAutoReconnect();
        } else {
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Auto-reconnect wallet if previously connected
  const handleAutoReconnect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      setConnecting(true);
      const reconnectedState = await autoReconnectWallet();
      
      if (reconnectedState && reconnectedState.address) {
        setWallet(reconnectedState);
        // Load or create wallet profile
        const walletProfile = await getWalletProfile(reconnectedState.address) || 
                             await createOrUpdateWalletProfile(reconnectedState.address);
        setProfile(walletProfile);
        startBalanceRefresh();
      }
    } catch (error) {
      // Don't show error for auto-reconnect failures
    } finally {
      setConnecting(false);
      setLoading(false);
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async (preferredWallet?: string) => {
    if (connecting) return;
    
    setConnecting(true);
    setError(null);
    
    try {
      const walletState = await connectErgoWallet(preferredWallet);
      setWallet(walletState);
      
      if (walletState.address) {
        // Load or create wallet profile  
        const walletProfile = await getWalletProfile(walletState.address) || 
                             await createOrUpdateWalletProfile(walletState.address);
        setProfile(walletProfile);
      }
      
      startBalanceRefresh();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      console.error('Wallet connection failed:', error);
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await disconnectErgoWallet();
      setWallet(defaultWalletState);
      setProfile(null);
      setError(null);
      stopBalanceRefresh();
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
      // Still reset state even if disconnect fails
      setWallet(defaultWalletState);
      setProfile(null);
      setError(null);
      stopBalanceRefresh();
    }
  }, []);

  // Sign transaction
  const signTx = useCallback(async (tx: any) => {
    if (!wallet.connected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await signTransaction(tx);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      throw error;
    }
  }, [wallet.connected]);

  // Submit transaction
  const submitTx = useCallback(async (tx: any) => {
    if (!wallet.connected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const txId = await submitTransaction(tx);
      // Refresh balance after successful transaction
      setTimeout(refreshBalance, 2000); // Wait 2 seconds for blockchain update
      return txId;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      throw error;
    }
  }, [wallet.connected]);

  // Sign message (not supported by EIP-12 Context API — placeholder)
  const signMsg = useCallback(async (_message: string, _address?: string) => {
    throw new Error('Message signing not supported by EIP-12 wallet API');
  }, []);

  // Refresh wallet balance
  const refreshBalance = useCallback(async () => {
    if (!wallet.connected) return;
    
    try {
      const updatedState = await getWalletState();
      setWallet(updatedState);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      // Don't show error for balance refresh failures
    }
  }, [wallet.connected]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update wallet profile
  const updateProfile = useCallback(async (displayName: string): Promise<WalletProfile> => {
    if (!wallet.address) {
      throw new Error('Wallet not connected');
    }
    
    const updatedProfile = await createOrUpdateWalletProfile(wallet.address, displayName);
    setProfile(updatedProfile);
    return updatedProfile;
  }, [wallet.address]);

  // Start balance refresh interval
  const startBalanceRefresh = useCallback(() => {
    stopBalanceRefresh(); // Clear any existing interval
    
    const interval = setInterval(() => {
      refreshBalance();
    }, BALANCE_REFRESH_INTERVAL);
    
    setRefreshInterval(interval);
  }, [refreshBalance]);

  // Stop balance refresh interval
  const stopBalanceRefresh = useCallback(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBalanceRefresh();
    };
  }, [stopBalanceRefresh]);

  // Handle wallet disconnection events (if wallet supports it)
  useEffect(() => {
    if (typeof window === 'undefined' || !wallet.connected) return;

    const handleWalletDisconnect = () => {
      setWallet(defaultWalletState);
      setProfile(null);
      stopBalanceRefresh();
    };

    // Listen for wallet disconnection events (if supported)
    // This is wallet-specific and may not be available in all wallets
    window.addEventListener('ergo_wallet_disconnected', handleWalletDisconnect);

    return () => {
      window.removeEventListener('ergo_wallet_disconnected', handleWalletDisconnect);
    };
  }, [wallet.connected, stopBalanceRefresh]);

  // Context value
  const contextValue: WalletContextType = {
    wallet,
    connecting,
    error,
    isAuthenticated: wallet.connected && !!wallet.address,
    userAddress: wallet.address,
    profile,
    loading,
    connect,
    disconnect,
    signTx,
    submitTx,
    signMsg,
    updateProfile,
    refreshBalance,
    clearError,
    isAvailable,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Helper function to extract user-friendly error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof WalletNotFoundError) {
    return 'No compatible wallet found. Please install Nautilus Wallet.';
  }
  
  if (error instanceof WalletRejectedError) {
    return 'Connection was rejected. Please try again.';
  }
  
  if (error instanceof WalletConnectionError) {
    return 'Failed to connect to wallet. Please try again.';
  }
  
  if (error instanceof WalletError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

// Hook to check if wallet is installed — polls for async extension injection
export function useWalletInstallation() {
  const [hasNautilus, setHasNautilus] = useState(false);
  const [hasSafew, setHasSafew] = useState(false);
  const [detecting, setDetecting] = useState(true);
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      setDetecting(false);
      return;
    }

    // Check immediately
    const check = () => {
      const nautilus = !!window.ergoConnector?.nautilus;
      const safew = !!window.ergoConnector?.safew;
      setHasNautilus(nautilus);
      setHasSafew(safew);
      return nautilus || safew;
    };

    if (check()) {
      setDetecting(false);
      return;
    }

    // Poll every 500ms for up to 5 seconds
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 500;
      if (check() || elapsed >= 5000) {
        clearInterval(interval);
        setDetecting(false);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);
  
  return { hasNautilus, hasSafew, detecting };
}

// Alias for useWallet that provides auth-like interface for compatibility
export function useAuth() {
  const context = useWallet();
  return {
    user: context.profile,
    loading: context.loading,
    login: () => Promise.resolve(false), // Not used in wallet auth
    signup: () => Promise.resolve(false), // Not used in wallet auth  
    logout: context.disconnect,
    getCurrentUser: () => context.profile,
    // Additional wallet-specific methods
    isAuthenticated: context.isAuthenticated,
    userAddress: context.userAddress,
    connect: context.connect,
    updateProfile: context.updateProfile
  };
}

export default WalletProvider;