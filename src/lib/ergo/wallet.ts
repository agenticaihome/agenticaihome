import { getCurrentHeight as getHeightFromExplorer, nanoErgToErg } from './explorer';
import { WALLET_CONNECT_TIMEOUT, SUPPORTED_WALLETS } from './constants';

// Wallet state interface
export interface WalletState {
  connected: boolean;
  address: string | null;        // Primary address
  addresses: string[];           // All addresses
  balance: WalletBalance;
  walletName: string | null;
  connectionType?: 'eip12' | 'ergopay'; // New: track connection type
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

// ErgoPay wallet state
let ergoPayAddress: string | null = null;
let ergoPayConnectionType: 'eip12' | 'ergopay' | null = null;

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

/**
 * Connect to ErgoPay wallet by prompting user to enter their address
 * This is used for mobile wallets that don't inject browser objects
 */
async function connectErgoPayWallet(): Promise<WalletState> {
  return new Promise((resolve, reject) => {
    // Check if we already have a stored ErgoPay address
    const storedAddress = localStorage.getItem('ergopay_address');
    if (storedAddress && isValidErgoAddress(storedAddress)) {
      ergoPayAddress = storedAddress;
      ergoPayConnectionType = 'ergopay';
      currentWalletName = 'ergopay';
      
      resolve({
        connected: true,
        address: storedAddress,
        addresses: [storedAddress],
        balance: { erg: '0', tokens: [] }, // We can't get balance without blockchain query
        walletName: 'ergopay',
        connectionType: 'ergopay',
      });
      return;
    }

    // Prompt user to enter their address
    const addressPrompt = `Please enter your Ergo wallet address for ErgoPay transactions:

This address will be used to:
• Build transactions for your mobile wallet
• Check your balance
• Store your connection preference

You can find your address in your mobile wallet (Terminus, SAFEW, etc.)`;

    const userAddress = prompt(addressPrompt);
    
    if (!userAddress) {
      reject(new WalletRejectedError());
      return;
    }

    const trimmedAddress = userAddress.trim();
    
    if (!isValidErgoAddress(trimmedAddress)) {
      reject(new WalletError('Invalid Ergo address. Please enter a valid address starting with 9 or 3.'));
      return;
    }

    // Store the address for future use
    localStorage.setItem('ergopay_address', trimmedAddress);
    
    ergoPayAddress = trimmedAddress;
    ergoPayConnectionType = 'ergopay';
    currentWalletName = 'ergopay';
    
    resolve({
      connected: true,
      address: trimmedAddress,
      addresses: [trimmedAddress],
      balance: { erg: '0', tokens: [] }, // We'll need to query balance separately
      walletName: 'ergopay',
      connectionType: 'ergopay',
    });
  });
}

/**
 * Basic Ergo address validation
 */
function isValidErgoAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // Ergo addresses start with '9' (P2PK) or '3' (P2S/P2SH)
  // and are typically 51-52 characters long (base58)
  const ergoAddressRegex = /^[39][1-9A-HJ-NP-Za-km-z]{50,51}$/;
  return ergoAddressRegex.test(address);
}

/**
 * Get balance for ErgoPay address by querying the explorer
 */
async function getErgoPayBalance(address: string): Promise<WalletBalance> {
  try {
    // Import explorer functions dynamically to avoid circular dependencies
    const { getAddressBalance } = await import('./explorer');
    
    const addressInfo = await getAddressBalance(address);
    
    // Convert the explorer response to our balance format
    const erg = nanoErgToErg(addressInfo.confirmed?.nanoErgs || '0');
    
    const tokens: TokenBalance[] = [];
    if (addressInfo.confirmed?.tokens) {
      for (const token of addressInfo.confirmed.tokens) {
        tokens.push({
          tokenId: token.tokenId,
          amount: token.amount.toString(),
          name: token.name,
          decimals: token.decimals,
        });
      }
    }
    
    return { erg, tokens };
  } catch (error) {
    console.error('Error getting ErgoPay balance:', error);
    // Return zero balance if query fails
    return { erg: '0', tokens: [] };
  }
}

export function isNautilusAvailable(): boolean {
  return isWalletAvailable() && !!window.ergoConnector?.nautilus;
}

export function isSafewAvailable(): boolean {
  return isWalletAvailable() && !!window.ergoConnector?.safew;
}

export async function connectWallet(preferredWallet?: string): Promise<WalletState> {
  // Handle ErgoPay connection (doesn't require browser extension)
  if (preferredWallet === 'ergopay') {
    return connectErgoPayWallet();
  }

  const available = await waitForWallet(5000); // Increased to 5 seconds
  if (!available) {
    throw new WalletNotFoundError('Nautilus Wallet not found. Please install Nautilus Wallet from the Chrome Web Store, then refresh this page.');
  }

  const walletsToTry = preferredWallet 
    ? [preferredWallet, ...Object.values(SUPPORTED_WALLETS).filter(w => w !== preferredWallet)]
    : Object.values(SUPPORTED_WALLETS);

  let lastError: Error | null = null;

  for (const walletName of walletsToTry) {
    try {
      const connector = getWalletConnector(walletName);
      if (!connector) {
        lastError = new WalletNotFoundError(walletName);
        continue;
      }

      // Always call connect() to ensure we get the CURRENT wallet
      // (user may have switched accounts in the extension)
      const connected = await Promise.race([
        connector.connect({ createErgoObject: true }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${walletName} wallet connection timeout after ${WALLET_CONNECT_TIMEOUT / 1000} seconds. Please unlock your wallet and try again.`)), WALLET_CONNECT_TIMEOUT)
        )
      ]);

      if (connected) {
        // Wait for window.ergo (Context API) to be injected with longer timeout
        const contextReady = await waitForErgoContext(5000);
        if (!contextReady) {
          throw new WalletConnectionError(`${walletName} wallet is locked or unavailable. Please unlock your wallet and refresh the page.`);
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
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      // Provide more specific error messages
      if (err.message.includes('timeout')) {
        lastError = new WalletConnectionError(`${walletName} wallet took too long to respond. Please make sure it's unlocked and try again.`);
      } else if (err.message.includes('rejected') || err.message.includes('denied')) {
        lastError = new WalletRejectedError();
      } else if (err.message.includes('not found')) {
        lastError = new WalletNotFoundError(`${walletName} wallet not found or not installed.`);
      } else {
        lastError = new WalletConnectionError(`Failed to connect to ${walletName}: ${err.message}`);
      }
    }
  }

  // Provide helpful final error message
  if (lastError instanceof WalletNotFoundError) {
    throw new WalletNotFoundError('Nautilus Wallet not found. Please install Nautilus Wallet from the Chrome Web Store and refresh this page.');
  } else if (lastError instanceof WalletRejectedError) {
    throw new WalletRejectedError();
  } else {
    throw new WalletConnectionError(`Failed to connect to Nautilus Wallet. Please make sure it's installed, unlocked, and try again. ${lastError?.message || ''}`);
  }
}

export async function disconnectWallet(): Promise<void> {
  // Handle EIP-12 wallet disconnection
  if (currentConnector) {
    try {
      await currentConnector.disconnect();
    } catch (error) {
      // Error disconnecting wallet
    }
  }
  
  // Clear all wallet state
  currentConnector = null;
  currentWalletName = null;
  ergoPayAddress = null;
  ergoPayConnectionType = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ergo_wallet_connected');
    localStorage.removeItem('ergopay_address');
    // Clear cached ergo context so reconnect gets fresh wallet
    (window as any).ergo = undefined;
  }
}

export async function getWalletState(): Promise<WalletState> {
  // Handle ErgoPay connections
  if (ergoPayConnectionType === 'ergopay' && ergoPayAddress) {
    try {
      // For ErgoPay, we need to query balance from explorer
      const balance = await getErgoPayBalance(ergoPayAddress);
      
      return {
        connected: true,
        address: ergoPayAddress,
        addresses: [ergoPayAddress],
        balance,
        walletName: 'ergopay',
        connectionType: 'ergopay',
      };
    } catch (error) {
      console.error('Error getting ErgoPay wallet state:', error);
      // Return basic state even if balance query fails
      return {
        connected: true,
        address: ergoPayAddress,
        addresses: [ergoPayAddress],
        balance: { erg: '0', tokens: [] },
        walletName: 'ergopay',
        connectionType: 'ergopay',
      };
    }
  }

  // Handle EIP-12 connections (Nautilus, SAFEW, etc.)
  if (!currentConnector || !currentWalletName || !window.ergo) {
    return {
      connected: false,
      address: null,
      addresses: [],
      balance: { erg: '0', tokens: [] },
      walletName: null,
      connectionType: undefined,
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
      connectionType: 'eip12',
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

export async function submitTransaction(signedTx: any, timeoutMs: number = 60000): Promise<string> {
  const ergo = getErgoContext();

  try {
    // Add timeout to transaction submission
    const submitPromise = ergo.submit_tx(signedTx);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Transaction submission timeout after ${timeoutMs / 1000} seconds`)), timeoutMs)
    );
    
    return await Promise.race([submitPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error submitting transaction:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new WalletError('Transaction submission timed out. The network may be slow. Please check the explorer or try again.');
      } else if (error.message.includes('rejected') || error.message.includes('denied')) {
        throw new WalletError('Transaction was rejected by the network. Please try again.');
      } else if (error.message.includes('insufficient') || error.message.includes('funds')) {
        throw new WalletError('Insufficient funds for this transaction.');
      } else if (error.message.includes('double spending') || error.message.includes('already spent')) {
        throw new WalletError('Transaction failed: One or more boxes have already been spent. Please refresh and try again.');
      } else {
        throw new WalletError(`Transaction failed: ${error.message}`);
      }
    }
    
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

  // Check for ErgoPay address first
  const ergoPayAddr = localStorage.getItem('ergopay_address');
  if (ergoPayAddr && isValidErgoAddress(ergoPayAddr)) {
    try {
      return await connectWallet('ergopay');
    } catch (error) {
      localStorage.removeItem('ergopay_address');
    }
  }

  // Then check for EIP-12 wallet connection
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

export function getCurrentWalletInfo(): { name: string | null; connected: boolean; connectionType?: 'eip12' | 'ergopay' } {
  return {
    name: currentWalletName,
    connected: !!currentConnector || !!ergoPayAddress,
    connectionType: ergoPayConnectionType || (currentConnector ? 'eip12' : undefined),
  };
}
