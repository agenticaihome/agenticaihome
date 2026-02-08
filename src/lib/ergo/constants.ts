// Network configuration
export type NetworkType = 'mainnet' | 'testnet';

// Default to testnet for development
export const NETWORK: NetworkType = 'testnet';

// Explorer URLs based on network
export const ERGO_EXPLORER_API = NETWORK === 'testnet'
  ? 'https://api-testnet.ergoplatform.com/api/v1'
  : 'https://api.ergoplatform.com/api/v1';

export const ERGO_EXPLORER_UI = NETWORK === 'testnet'
  ? 'https://testnet.ergoplatform.com'
  : 'https://explorer.ergoplatform.com';

export const ERGO_NODE_URL = NETWORK === 'testnet'
  ? 'https://api-testnet.ergoplatform.com'
  : 'https://api.ergoplatform.com';

export const NAUTILUS_CHROME_URL = "https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai";
export const MIN_BOX_VALUE = 1000000n; // 0.001 ERG minimum box value
export const RECOMMENDED_TX_FEE = 1100000n; // 0.0011 ERG recommended fee
export const PLATFORM_FEE_PERCENT = 2; // 2% platform fee
export const PLATFORM_FEE_ADDRESS = NETWORK === 'testnet'
  ? '3WwKzFjZGrtKAUzJBxFUzFqbFbYAMhxjNcB2gb3CPV7GKcmpaBe2' // testnet placeholder
  : '9fRAWhdxEsTcdb8PhGNrpfchHHttKK6pKnrmz6iP4wHZy4dN9vD'; // mainnet placeholder

export const NANOERG_FACTOR = 1000000000n; // 10^9

// Wallet connection timeout
export const WALLET_CONNECT_TIMEOUT = 30000; // 30 seconds

// Balance refresh interval
export const BALANCE_REFRESH_INTERVAL = 30000; // 30 seconds

// Explorer API endpoints
export const EXPLORER_ENDPOINTS = {
  BLOCKS: "/blocks",
  TRANSACTIONS: "/transactions",
  BOXES: "/boxes",
  ADDRESSES: "/addresses",
  TOKENS: "/tokens",
} as const;

// Supported wallets
export const SUPPORTED_WALLETS = {
  NAUTILUS: "nautilus",
  SAFEW: "safew",
} as const;

// Escrow contract ErgoScript source
// Simplified for testnet: client can release to agent, or reclaim after deadline
export const ESCROW_ERGOSCRIPT = `{
  val clientPk   = SELF.R4[SigmaProp].get
  val agentPk    = SELF.R5[SigmaProp].get
  val deadline   = SELF.R6[Int].get

  // Path 1: Client approves → agent receives
  val release = clientPk

  // Path 2: Deadline passed → client reclaims
  val refund = sigmaProp(HEIGHT > deadline) && clientPk

  release || refund
}`;

// Compiled contract P2S address (will be set after compilation)
// These get populated at runtime via compileContract()
export let ESCROW_CONTRACT_ADDRESS = '';

// Testnet faucet URL
export const TESTNET_FAUCET_URL = 'https://testnet.ergofaucet.org/';

// Transaction explorer link helper
export function txExplorerUrl(txId: string): string {
  return `${ERGO_EXPLORER_UI}/en/transactions/${txId}`;
}

export function addressExplorerUrl(address: string): string {
  return `${ERGO_EXPLORER_UI}/en/addresses/${address}`;
}

export function blockExplorerUrl(height: number): string {
  return `${ERGO_EXPLORER_UI}/en/blocks/${height}`;
}
