import { getCurrentHeight as getHeightFromExplorer, nanoErgToErg } from './explorer';
import { WALLET_CONNECT_TIMEOUT, SUPPORTED_WALLETS } from './constants';

// Wallet state interface
export interface WalletState {
  connected: boolean;
  address: string | null;        // Primary address
  addresses: string[];           // All addresses
  balance: WalletBalance;
  walletName: string | null;
}

export interface WalletBalance {
  erg: string;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  tokenId: string;
  amount: string;
  name?: string;
  decimals?: number;
}

// Ergo connector types (from EIP-12)
declare global {
  interface Window {
    ergoConnector?: {
      nautilus?: ErgoConnector;
      safew?: ErgoConnector;
    };
  }
}

interface ErgoConnector {
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  get_used_addresses(): Promise<string[]>;
  get_unused_addresses(): Promise<string[]>;
  get_change_address(): Promise<string>;
  get_balance(token?: string): Promise<string>;
  get_utxos(amount?: string, token?: string): Promise<any[]>;
  sign_tx(tx: any): Promise<any>;
  submit_tx(tx: any): Promise<string>;
  get_current_height(): Promise<number>;
  auth(address: string, message: string): Promise<string>;
}

// Wallet error types
export class WalletError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export class WalletNotFoundError extends WalletError {
  constructor(walletName: string) {
    super(`${walletName} wallet not found`);
    this.code = 'WALLET_NOT_FOUND';
  }
}

export class WalletConnectionError extends WalletError {
  constructor(message: string) {
    super(message);
    this.code = 'CONNECTION_ERROR';
  }
}

export class WalletRejectedError extends WalletError {
  constructor() {
    super('User rejected wallet connection');
    this.code = 'USER_REJECTED';
  }
}

let currentWallet: ErgoConnector | null = null;
let currentWalletName: string | null = null;

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ergoConnector;
}

export function isNautilusAvailable(): boolean {
  return isWalletAvailable() && !!window.ergoConnector?.nautilus;
}

export function isSafewAvailable(): boolean {
  return isWalletAvailable() && !!window.ergoConnector?.safew;
}

export async function connectWallet(preferredWallet?: string): Promise<WalletState> {
  if (!isWalletAvailable()) {
    throw new WalletNotFoundError('No Ergo wallet extensions found');
  }

  // Try to connect to preferred wallet first, then fallback
  const walletsToTry = preferredWallet 
    ? [preferredWallet, ...Object.values(SUPPORTED_WALLETS).filter(w => w !== preferredWallet)]
    : Object.values(SUPPORTED_WALLETS);

  let lastError: Error | null = null;

  for (const walletName of walletsToTry) {
    try {
      const connector = getWalletConnector(walletName);
      if (!connector) continue;

      // Try to connect with timeout
      const connected = await Promise.race([
        connector.connect(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), WALLET_CONNECT_TIMEOUT)
        )
      ]);

      if (connected) {
        currentWallet = connector;
        currentWalletName = walletName;
        
        // Get wallet state
        const state = await getWalletState();
        
        // Store connection preference
        if (typeof window !== 'undefined') {
          localStorage.setItem('ergo_wallet_connected', walletName);
        }
        
        return state;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Failed to connect to ${walletName}:`, error);
    }
  }

  throw lastError || new WalletConnectionError('Failed to connect to any wallet');
}

export async function disconnectWallet(): Promise<void> {
  if (currentWallet) {
    try {
      await currentWallet.disconnect();
    } catch (error) {
      console.warn('Error disconnecting wallet:', error);
    }
  }
  
  currentWallet = null;
  currentWalletName = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ergo_wallet_connected');
  }
}

export async function getWalletState(): Promise<WalletState> {
  if (!currentWallet || !currentWalletName) {
    return {
      connected: false,
      address: null,
      addresses: [],
      balance: { erg: '0', tokens: [] },
      walletName: null,
    };
  }

  try {
    const [address, addresses, balance] = await Promise.all([
      currentWallet.get_change_address(),
      currentWallet.get_used_addresses(),
      getBalance(),
    ]);

    return {
      connected: true,
      address,
      addresses,
      balance,
      walletName: currentWalletName,
    };
  } catch (error) {
    console.error('Error getting wallet state:', error);
    throw new WalletError('Failed to get wallet state');
  }
}

export async function getBalance(): Promise<WalletBalance> {
  if (!currentWallet) {
    throw new WalletError('No wallet connected');
  }

  try {
    // Get ERG balance
    const ergBalance = await currentWallet.get_balance('ERG');
    const erg = nanoErgToErg(ergBalance);

    // Get all balances to find tokens
    const allBalances = await currentWallet.get_balance('all');
    
    // Parse token balances (this would need to be adapted based on actual wallet response format)
    const tokens: TokenBalance[] = [];
    
    // Note: The actual format of 'all' response may vary by wallet
    // This is a placeholder implementation
    if (typeof allBalances === 'object' && allBalances !== null) {
      // Implementation would depend on actual wallet response format
    }

    return { erg, tokens };
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new WalletError('Failed to get balance');
  }
}

export async function getAddress(): Promise<string> {
  if (!currentWallet) {
    throw new WalletError('No wallet connected');
  }

  try {
    return await currentWallet.get_change_address();
  } catch (error) {
    console.error('Error getting address:', error);
    throw new WalletError('Failed to get address');
  }
}

export async function signTransaction(unsignedTx: any): Promise<any> {
  if (!currentWallet) {
    throw new WalletError('No wallet connected');
  }

  try {
    return await currentWallet.sign_tx(unsignedTx);
  } catch (error) {
    console.error('Error signing transaction:', error);
    
    if (error instanceof Error && error.message.includes('rejected')) {
      throw new WalletRejectedError();
    }
    
    throw new WalletError('Failed to sign transaction');
  }
}

export async function submitTransaction(signedTx: any): Promise<string> {
  if (!currentWallet) {
    throw new WalletError('No wallet connected');
  }

  try {
    return await currentWallet.submit_tx(signedTx);
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw new WalletError('Failed to submit transaction');
  }
}

export async function signMessage(message: string, address?: string): Promise<string> {
  if (!currentWallet) {
    throw new WalletError('No wallet connected');
  }

  try {
    const addr = address || await getAddress();
    return await currentWallet.auth(addr, message);
  } catch (error) {
    console.error('Error signing message:', error);
    
    if (error instanceof Error && error.message.includes('rejected')) {
      throw new WalletRejectedError();
    }
    
    throw new WalletError('Failed to sign message');
  }
}

export async function getCurrentHeight(): Promise<number> {
  if (currentWallet) {
    try {
      return await currentWallet.get_current_height();
    } catch (error) {
      console.warn('Failed to get height from wallet, falling back to explorer:', error);
    }
  }
  
  return await getHeightFromExplorer();
}

export async function autoReconnectWallet(): Promise<WalletState | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const lastConnectedWallet = localStorage.getItem('ergo_wallet_connected');
  if (!lastConnectedWallet) {
    return null;
  }

  try {
    return await connectWallet(lastConnectedWallet);
  } catch (error) {
    console.warn('Failed to auto-reconnect wallet:', error);
    localStorage.removeItem('ergo_wallet_connected');
    return null;
  }
}

function getWalletConnector(walletName: string): ErgoConnector | null {
  if (!window.ergoConnector) return null;
  
  switch (walletName) {
    case SUPPORTED_WALLETS.NAUTILUS:
      return window.ergoConnector.nautilus || null;
    case SUPPORTED_WALLETS.SAFEW:
      return window.ergoConnector.safew || null;
    default:
      return null;
  }
}

// Export current wallet info for debugging
export function getCurrentWalletInfo(): { name: string | null; connected: boolean } {
  return {
    name: currentWalletName,
    connected: !!currentWallet,
  };
}