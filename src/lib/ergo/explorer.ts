import { ERGO_EXPLORER_API, NANOERG_FACTOR } from './constants';

// Types for Ergo Explorer API
export interface Box {
  boxId: string;
  transactionId: string;
  index: number;
  value: string;
  ergoTree: string;
  address: string;
  assets: Asset[];
  additionalRegisters: Record<string, string>;
  creationHeight: number;
  settlementHeight: number | null;
}

export interface Asset {
  tokenId: string;
  amount: string;
  name?: string;
  decimals?: number;
}

export interface Transaction {
  id: string;
  blockId: string;
  inclusionHeight: number;
  timestamp: number;
  index: number;
  globalIndex: number;
  numConfirmations: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  size: number;
}

export interface TransactionInput {
  boxId: string;
  spendingProof: string;
}

export interface TransactionOutput {
  boxId: string;
  value: string;
  ergoTree: string;
  address: string;
  assets: Asset[];
  additionalRegisters: Record<string, string>;
}

export interface TokenInfo {
  id: string;
  name: string;
  description?: string;
  type: string;
  decimals: number;
  emissionAmount: string;
}

export interface AddressBalance {
  confirmed: {
    nanoErgs: string;
    tokens: Asset[];
  };
  unconfirmed: {
    nanoErgs: string;
    tokens: Asset[];
  };
}

export interface Block {
  id: string;
  height: number;
  timestamp: number;
  transactionsCount: number;
  difficulty: string;
  size: number;
}

class ExplorerAPI {
  private baseUrl: string;
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.baseUrl = ERGO_EXPLORER_API;
  }

  private async request<T>(endpoint: string, retryCount = 0): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AgenticAiHome/1.0',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Explorer API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch from ${url} (attempt ${retryCount + 1}):`, error);
      
      // Retry logic for network errors, timeouts, and 5xx errors
      const isRetryableError = 
        error instanceof Error && (
          error.name === 'AbortError' ||
          error.name === 'TimeoutError' ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          (error.message.includes('500') || error.message.includes('502') || 
           error.message.includes('503') || error.message.includes('504'))
        );
      
      if (isRetryableError && retryCount < this.MAX_RETRIES) {
        // Retrying request with delay
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1)));
        return this.request<T>(endpoint, retryCount + 1);
      }
      
      // Transform error to be more user-friendly
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Explorer request timed out. The network may be slow. Please try again.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          throw new Error('Network error connecting to Ergo Explorer. Please check your connection.');
        } else if (error.message.includes('500') || error.message.includes('502') || 
                   error.message.includes('503') || error.message.includes('504')) {
          throw new Error('Ergo Explorer is temporarily unavailable. Please try again in a moment.');
        }
      }
      
      throw error;
    }
  }

  async getBoxById(boxId: string): Promise<Box | null> {
    try {
      return await this.request<Box>(`/boxes/${boxId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getBoxesByAddress(address: string): Promise<Box[]> {
    // Use the unspent boxes endpoint — /boxes/unspent/byAddress/{address}
    const response = await this.request<Box[]>(`/boxes/unspent/byAddress/${address}`);
    return Array.isArray(response) ? response : (response as any).items || [];
  }

  async getTxById(txId: string): Promise<Transaction | null> {
    try {
      return await this.request<Transaction>(`/transactions/${txId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getCurrentHeight(): Promise<number> {
    const response = await this.request<{ items: Block[] }>('/blocks?limit=1');
    return response.items[0]?.height || 0;
  }

  async getTokenInfo(tokenId: string): Promise<TokenInfo | null> {
    try {
      return await this.request<TokenInfo>(`/tokens/${tokenId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getAddressBalance(address: string): Promise<AddressBalance> {
    return await this.request<AddressBalance>(`/addresses/${address}/balance/total`);
  }

  async getTransactionsByAddress(address: string, offset = 0, limit = 20): Promise<Transaction[]> {
    const response = await this.request<{ items: Transaction[] }>(
      `/addresses/${address}/transactions?offset=${offset}&limit=${limit}`
    );
    return response.items;
  }

  async searchTransactions(query: string): Promise<Transaction[]> {
    const response = await this.request<{ items: Transaction[] }>(`/transactions?q=${encodeURIComponent(query)}`);
    return response.items;
  }
}

// Create singleton instance
const explorerAPI = new ExplorerAPI();

// Export main functions
export const getBoxById = explorerAPI.getBoxById.bind(explorerAPI);
export const getBoxesByAddress = explorerAPI.getBoxesByAddress.bind(explorerAPI);
export const getTxById = explorerAPI.getTxById.bind(explorerAPI);
export const getCurrentHeight = explorerAPI.getCurrentHeight.bind(explorerAPI);
export const getTokenInfo = explorerAPI.getTokenInfo.bind(explorerAPI);
export const getAddressBalance = explorerAPI.getAddressBalance.bind(explorerAPI);
export const getTransactionsByAddress = explorerAPI.getTransactionsByAddress.bind(explorerAPI);
export const searchTransactions = explorerAPI.searchTransactions.bind(explorerAPI);

// Utility functions for ERG amount formatting
export function nanoErgToErg(nanoErg: bigint | string | undefined | null): string {
  if (nanoErg === undefined || nanoErg === null || nanoErg === '') return '0';
  try {
    const nanoErgBigInt = typeof nanoErg === 'string' ? BigInt(nanoErg) : nanoErg;
    const erg = Number(nanoErgBigInt) / Number(NANOERG_FACTOR);
    return erg.toFixed(9).replace(/\.?0+$/, ''); // Remove trailing zeros
  } catch {
    return '0';
  }
}

export function ergToNanoErg(erg: string | number): bigint {
  // Use string-based math to avoid floating-point precision errors
  // e.g., 0.3 * 1e9 = 299999999.99... but should be 300000000
  const ergStr = typeof erg === 'number' ? erg.toString() : erg;
  const parts = ergStr.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').padEnd(9, '0').slice(0, 9); // 9 decimal places for nanoERG
  return BigInt(whole) * NANOERG_FACTOR + BigInt(frac);
}

export function formatErgAmount(nanoErg: bigint | string): string {
  const erg = nanoErgToErg(nanoErg);
  return `Σ${erg} ERG`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}