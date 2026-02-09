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

// EIP-12 types: Connection API vs Context API are SEPARATE
declare global {
  interface Window {
    ergoConnector?: {
      nautilus?: ErgoWalletConnector;
      safew?: ErgoWalletConnector;
    };
    ergo?: ErgoContextApi;
  }
}

// Connection API — only connect/disconnect/isConnected
interface ErgoWalletConnector {
  connect(params?: { createErgoObject?: boolean }): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): Promise<boolean>;
}

// Context API — injected as window.ergo AFTER connect succeeds
interface ErgoContextApi {
  get_balance(tokenId?: string): Promise<string>;
  get_used_addresses(): Promise<string[]>;
  get_unused_addresses(): Promise<string[]>;
  get_change_address(): Promise<string>;
  get_utxos(params?: { tokens?: Array<{ tokenId: string; amount?: string }> }): Promise<any[]>;
  get_current_height(): Promise<number>;
  sign_tx(tx: any): Promise<any>;
  submit_tx(tx: any): Promise<string>;
  sign_tx_input(tx: any, index: number): Promise<any>;
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

let currentConnector: ErgoWalletConnector | null = null;
let currentWalletName: string | null = null;

// Get the context API (window.ergo) — throws if not available
function getErgoContext(): ErgoContextApi {
  if (!window.ergo) {
    throw new WalletError('Ergo context not available. Wallet may have disconnected.');
  }
  return window.ergo;
}

export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ergoConnector;
}

// Wait for wallet extensions to inject (they load async after page)
export async function waitForWallet(timeoutMs = 3000): Promise<boolean> {
  if (isWalletAvailable()) return true;
  
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 100));
    if (isWalletAvailable()) return true;
  }
  return false;
}

// Wait for window.ergo to be injected after connect()
async function waitForErgoContext(timeoutMs = 3000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window.ergo) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

export function isNautilusAvailable(): boolean {
  return isWalletAvailable() && !!window.ergoConnector?.nautilus;
}

export function isSafewAvailable(): boolean {
  return isWalletAvailable() && !!window.ergoConnector?.safew;
}

export async function connectWallet(preferredWallet?: string): Promise<WalletState> {
  const available = await waitForWallet(3000);
  if (!available) {
    throw new WalletNotFoundError('No Ergo wallet extensions found. Install Nautilus Wallet.');
  }

  const walletsToTry = preferredWallet 
    ? [preferredWallet, ...Object.values(SUPPORTED_WALLETS).filter(w => w !== preferredWallet)]
    : Object.values(SUPPORTED_WALLETS);

  let lastError: Error | null = null;

  for (const walletName of walletsToTry) {
    try {
      const connector = getWalletConnector(walletName);
      if (!connector) continue;

      // Connect via Connection API
      const connected = await Promise.race([
        connector.connect({ createErgoObject: true }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), WALLET_CONNECT_TIMEOUT)
        )
      ]);

      if (connected) {
        // Wait for window.ergo (Context API) to be injected
        const contextReady = await waitForErgoContext(3000);
        if (!contextReady) {
          throw new WalletConnectionError('Wallet connected but context API not available');
        }

        currentConnector = connector;
        currentWalletName = walletName;
        
        const state = await getWalletState();
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('ergo_wallet_connected', walletName);
        }
        
        return state;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  throw lastError || new WalletConnectionError('Failed to connect to any wallet');
}

export async function disconnectWallet(): Promise<void> {
  if (currentConnector) {
    try {
      await currentConnector.disconnect();
    } catch (error) {
      // Error disconnecting wallet
    }
  }
  
  currentConnector = null;
  currentWalletName = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ergo_wallet_connected');
  }
}

export async function getWalletState(): Promise<WalletState> {
  if (!currentConnector || !currentWalletName || !window.ergo) {
    return {
      connected: false,
      address: null,
      addresses: [],
      balance: { erg: '0', tokens: [] },
      walletName: null,
    };
  }

  try {
    const ergo = getErgoContext();
    const [address, addresses, balance] = await Promise.all([
      ergo.get_change_address(),
      ergo.get_used_addresses(),
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
  const ergo = getErgoContext();

  try {
    const ergBalance = await ergo.get_balance('ERG');
    const erg = nanoErgToErg(ergBalance);

    const utxos = await ergo.get_utxos();
    const tokens: TokenBalance[] = [];
    
    if (Array.isArray(utxos)) {
      const tokenMap = new Map<string, bigint>();
      
      for (const utxo of utxos) {
        if (utxo.assets && Array.isArray(utxo.assets)) {
          for (const asset of utxo.assets) {
            const tokenId = asset.tokenId;
            const amount = BigInt(asset.amount || 0);
            const current = tokenMap.get(tokenId) || 0n;
            tokenMap.set(tokenId, current + amount);
          }
        }
      }
      
      for (const [tokenId, amount] of tokenMap.entries()) {
        tokens.push({
          tokenId,
          amount: amount.toString(),
          name: undefined,
          decimals: undefined
        });
      }
    }

    return { erg, tokens };
  } catch (error) {
    console.error('Error getting balance:', error);
    throw new WalletError('Failed to get balance');
  }
}

export async function getAddress(): Promise<string> {
  const ergo = getErgoContext();
  try {
    return await ergo.get_change_address();
  } catch (error) {
    console.error('Error getting address:', error);
    throw new WalletError('Failed to get address');
  }
}

export async function getUtxos(): Promise<any[]> {
  const ergo = getErgoContext();
  return await ergo.get_utxos();
}

export async function signTransaction(unsignedTx: any): Promise<any> {
  const ergo = getErgoContext();

  try {
    return await ergo.sign_tx(unsignedTx);
  } catch (error) {
    console.error('Error signing transaction:', error);
    if (error instanceof Error && error.message.includes('rejected')) {
      throw new WalletRejectedError();
    }
    throw new WalletError('Failed to sign transaction');
  }
}

export async function submitTransaction(signedTx: any): Promise<string> {
  const ergo = getErgoContext();

  try {
    return await ergo.submit_tx(signedTx);
  } catch (error) {
    console.error('Error submitting transaction:', error);
    throw new WalletError('Failed to submit transaction');
  }
}

export async function getCurrentHeight(): Promise<number> {
  if (window.ergo) {
    try {
      return await window.ergo.get_current_height();
    } catch (error) {
      // Failed to get height from wallet, falling back to explorer
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
    localStorage.removeItem('ergo_wallet_connected');
    return null;
  }
}

function getWalletConnector(walletName: string): ErgoWalletConnector | null {
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

export function getCurrentWalletInfo(): { name: string | null; connected: boolean } {
  return {
    name: currentWalletName,
    connected: !!currentConnector,
  };
}
