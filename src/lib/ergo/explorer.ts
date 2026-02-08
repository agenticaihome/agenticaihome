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

  constructor() {
    this.baseUrl = ERGO_EXPLORER_API;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Explorer API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch from ${url}:`, error);
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
    const response = await this.request<{ items: Box[] }>(`/addresses/${address}/boxes`);
    return response.items;
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
export function nanoErgToErg(nanoErg: bigint | string): string {
  const nanoErgBigInt = typeof nanoErg === 'string' ? BigInt(nanoErg) : nanoErg;
  const erg = Number(nanoErgBigInt) / Number(NANOERG_FACTOR);
  return erg.toFixed(9).replace(/\.?0+$/, ''); // Remove trailing zeros
}

export function ergToNanoErg(erg: string | number): bigint {
  const ergNumber = typeof erg === 'string' ? parseFloat(erg) : erg;
  return BigInt(Math.floor(ergNumber * Number(NANOERG_FACTOR)));
}

export function formatErgAmount(nanoErg: bigint | string): string {
  const erg = nanoErgToErg(nanoErg);
  return `Σ${erg} ERG`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}