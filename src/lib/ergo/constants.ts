export const ERGO_EXPLORER_API = "https://api.ergoplatform.com/api/v1";
export const ERGO_EXPLORER_UI = "https://explorer.ergoplatform.com";
export const NAUTILUS_CHROME_URL = "https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai";
export const MIN_BOX_VALUE = 1000000n; // 0.001 ERG minimum box value
export const PLATFORM_FEE_PERCENT = 2; // 2% platform fee
export const ESCROW_CONTRACT_HASH = ""; // TODO: deployed contract hash
export const EGO_TOKEN_POLICY_ID = ""; // TODO: token policy ID
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