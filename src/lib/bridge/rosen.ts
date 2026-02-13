// ─── Rosen Bridge Integration Layer ──────────────────────────────────
//
// Connects AgenticAiHome to Rosen Bridge for cross-chain payments.
// Users on Bitcoin, Ethereum, Cardano, Binance, and Doge can bridge
// assets to Ergo and fund task escrows.
//
// Architecture: Rosen Bridge uses Watchers (monitors) + Guards (executors)
// with Ergo as the consensus hub. No smart contracts needed on source chains.
//
// Fee structure: max($10, 0.5% of value) + network fees
// Confirmation times: BTC ~60min, ETH ~15min, ADA ~10min, BSC ~5min, DOGE ~30min
//
// For MVP: we show bridge instructions and link to app.rosen.tech
// For V2: automated bridge→swap→escrow pipeline via Spectrum DEX

import { getErgPrice } from '../ergo/price';

// ─── Types ───────────────────────────────────────────────────────────

export type SourceChain = 'bitcoin' | 'ethereum' | 'cardano' | 'binance' | 'doge';

export interface SupportedChain {
  key: SourceChain;
  label: string;
  nativeToken: string;
  icon: string;
  /** Approximate confirmation time in minutes */
  confirmationMinutes: number;
  /** Whether the bridge supports tokens beyond the native coin */
  hasTokenSupport: boolean;
  /** Chain ID for EVM chains, empty for others */
  evmChainId: string;
  /** Rosen Bridge deposit address for this chain (guard multisig) */
  depositAddress: string;
  /** Instructions for sending to the bridge */
  instructions: string[];
}

export interface BridgeFeeEstimate {
  /** Bridge fee in source chain native token */
  bridgeFee: number;
  /** Network fee estimate in source chain native token */
  networkFee: number;
  /** Total fee in source chain native token */
  totalFee: number;
  /** Amount user receives on Ergo after fees (in ERG equivalent) */
  estimatedErgReceived: number;
  /** USD value of amount received */
  estimatedUsdReceived: number;
  /** Fee as percentage */
  feePercent: number;
  /** Minimum bridge amount for this chain */
  minimumAmount: number;
}

export interface BridgeHealthStatus {
  status: 'healthy' | 'unstable' | 'broken' | 'unknown';
  lastChecked: number;
  /** Per-chain status */
  chains: Record<SourceChain, {
    status: 'healthy' | 'unstable' | 'broken' | 'unknown';
    lastTransaction?: string;
    avgConfirmationMinutes?: number;
  }>;
}

export interface BridgeTransaction {
  sourceChain: SourceChain;
  sourceTxId: string;
  status: 'pending' | 'watched' | 'confirmed' | 'completed' | 'failed';
  /** Ergo transaction ID once completed */
  ergoTxId?: string;
  sourceAmount: number;
  sourceToken: string;
  /** Wrapped token received on Ergo */
  wrappedTokenId?: string;
  wrappedAmount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface BridgeDepositInfo {
  chain: SourceChain;
  /** Address to send funds to on the source chain */
  depositAddress: string;
  /** Amount to send (includes fees) */
  amountToSend: number;
  /** The native token symbol */
  token: string;
  /** Ergo destination address (where wrapped tokens arrive) */
  ergoDestination: string;
  /** Important: memo/tag for some chains */
  memo?: string;
  /** Human-readable instructions */
  steps: string[];
  /** Link to Rosen Bridge app for manual bridging */
  rosenAppUrl: string;
  /** Estimated completion time */
  estimatedMinutes: number;
  /** Fee breakdown */
  fees: BridgeFeeEstimate;
}

// ─── Constants ───────────────────────────────────────────────────────

export const ROSEN_APP_URL = 'https://app.rosen.tech';
export const ROSEN_DOCS_URL = 'https://docs.rosen.tech';

// Known wrapped token IDs on Ergo mainnet
// These are the Ergo-side tokens minted by Rosen Bridge guards
export const WRAPPED_TOKEN_IDS: Record<string, { tokenId: string; name: string; decimals: number }> = {
  rsBTC: {
    tokenId: '907a31bdadad63e8b23b3c61a5a4de32e3b27d37f3a2a16519ba3c13b4e1c0c0',
    name: 'rsBTC (Rosen Bridge BTC)',
    decimals: 8,
  },
  rsETH: {
    tokenId: '2a51e1c832b3ae65808c7a77e7f74ab53e48c60464a43e1ddddb6e5e5b7b6e2c',
    name: 'rsETH (Rosen Bridge ETH)',
    decimals: 18,
  },
  rsADA: {
    tokenId: '3405d8f709a19479839597f9a22a7553bdfc1a590a427572787e7c6a2bc18979',
    name: 'rsADA (Rosen Bridge ADA)',
    decimals: 6,
  },
  rsBNB: {
    tokenId: 'placeholder_bnb_token_id',
    name: 'rsBNB (Rosen Bridge BNB)',
    decimals: 18,
  },
  rsDOGE: {
    tokenId: 'placeholder_doge_token_id',
    name: 'rsDOGE (Rosen Bridge DOGE)',
    decimals: 8,
  },
};

// Bridge fee: max(0.5%, $10 equivalent) + network fees
const BRIDGE_FEE_PERCENT = 0.5;
const BRIDGE_MIN_FEE_USD = 10;

// Approximate token prices (refreshed via CoinGecko in production)
// These are fallback values only
const FALLBACK_PRICES: Record<string, number> = {
  btc: 95000,
  eth: 3200,
  ada: 0.65,
  bnb: 600,
  doge: 0.15,
  erg: 1.20,
};

// ─── Supported Chains Configuration ─────────────────────────────────

const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    key: 'bitcoin',
    label: 'Bitcoin',
    nativeToken: 'BTC',
    icon: '₿',
    confirmationMinutes: 60,
    hasTokenSupport: false,
    evmChainId: '',
    depositAddress: '', // Set dynamically from Rosen Bridge
    instructions: [
      'Go to app.rosen.tech and select Bitcoin → Ergo',
      'Enter your Ergo wallet address as the destination',
      'Send the specified BTC amount to the provided address',
      'Wait ~60 minutes for 6 Bitcoin confirmations',
      'Wrapped rsBTC will arrive in your Ergo wallet',
      'You can then fund the task escrow with ERG (swap via Spectrum DEX)',
    ],
  },
  {
    key: 'ethereum',
    label: 'Ethereum',
    nativeToken: 'ETH',
    icon: 'Ξ',
    confirmationMinutes: 15,
    hasTokenSupport: true,
    evmChainId: '0x1',
    depositAddress: '',
    instructions: [
      'Go to app.rosen.tech and select Ethereum → Ergo',
      'Connect your Ethereum wallet (MetaMask, etc.)',
      'Enter your Ergo wallet address as the destination',
      'Approve and send the ETH transaction',
      'Wait ~15 minutes for Ethereum confirmations',
      'Wrapped rsETH will arrive in your Ergo wallet',
    ],
  },
  {
    key: 'cardano',
    label: 'Cardano',
    nativeToken: 'ADA',
    icon: '₳',
    confirmationMinutes: 10,
    hasTokenSupport: true,
    evmChainId: '',
    depositAddress: '',
    instructions: [
      'Go to app.rosen.tech and select Cardano → Ergo',
      'Enter your Ergo wallet address as the destination',
      'Send ADA from your Cardano wallet (Nami, Eternl, etc.)',
      'Wait ~10 minutes for Cardano confirmations',
      'Wrapped rsADA will arrive in your Ergo wallet',
    ],
  },
  {
    key: 'binance',
    label: 'BNB Chain',
    nativeToken: 'BNB',
    icon: '⬡',
    confirmationMinutes: 5,
    hasTokenSupport: true,
    evmChainId: '0x38',
    depositAddress: '',
    instructions: [
      'Go to app.rosen.tech and select Binance → Ergo',
      'Connect your BSC wallet',
      'Enter your Ergo wallet address as the destination',
      'Approve and send the BNB transaction',
      'Wait ~5 minutes for BSC confirmations',
      'Wrapped rsBNB will arrive in your Ergo wallet',
    ],
  },
  {
    key: 'doge',
    label: 'Dogecoin',
    nativeToken: 'DOGE',
    icon: 'Ð',
    confirmationMinutes: 30,
    hasTokenSupport: false,
    evmChainId: '',
    depositAddress: '',
    instructions: [
      'Go to app.rosen.tech and select Doge → Ergo',
      'Enter your Ergo wallet address as the destination',
      'Send DOGE to the provided address',
      'Wait ~30 minutes for Dogecoin confirmations',
      'Wrapped rsDOGE will arrive in your Ergo wallet',
    ],
  },
];

// ─── Cache ───────────────────────────────────────────────────────────

let healthCache: BridgeHealthStatus | null = null;
let healthCacheTime = 0;
const HEALTH_CACHE_TTL = 60_000; // 1 minute

let priceCache: Record<string, number> = { ...FALLBACK_PRICES };
let priceCacheTime = 0;
const PRICE_CACHE_TTL = 300_000; // 5 minutes

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Check Rosen Bridge health/availability.
 * Queries the Rosen Bridge status endpoint and returns per-chain health.
 */
export async function getRosenBridgeStatus(): Promise<BridgeHealthStatus> {
  if (healthCache && Date.now() - healthCacheTime < HEALTH_CACHE_TTL) {
    return healthCache;
  }

  try {
    // Try the Rosen Bridge guard status API
    // The bridge UI at app.rosen.tech calls internal APIs — we check health indirectly
    const response = await fetch(`${ROSEN_APP_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      const data = await response.json();
      const status: BridgeHealthStatus = {
        status: data.status === 'ok' ? 'healthy' : data.status === 'warning' ? 'unstable' : 'broken',
        lastChecked: Date.now(),
        chains: {} as any,
      };

      for (const chain of SUPPORTED_CHAINS) {
        status.chains[chain.key] = {
          status: data.chains?.[chain.key]?.status ?? 'unknown',
          avgConfirmationMinutes: chain.confirmationMinutes,
        };
      }

      healthCache = status;
      healthCacheTime = Date.now();
      return status;
    }
  } catch {
    // API unavailable — try alternative health check
  }

  // Fallback: assume healthy if app.rosen.tech is reachable
  try {
    const response = await fetch(ROSEN_APP_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5_000),
    });

    const status: BridgeHealthStatus = {
      status: response.ok ? 'healthy' : 'unstable',
      lastChecked: Date.now(),
      chains: {} as any,
    };

    for (const chain of SUPPORTED_CHAINS) {
      status.chains[chain.key] = {
        status: response.ok ? 'healthy' : 'unknown',
        avgConfirmationMinutes: chain.confirmationMinutes,
      };
    }

    healthCache = status;
    healthCacheTime = Date.now();
    return status;
  } catch {
    const status: BridgeHealthStatus = {
      status: 'unknown',
      lastChecked: Date.now(),
      chains: {} as any,
    };

    for (const chain of SUPPORTED_CHAINS) {
      status.chains[chain.key] = {
        status: 'unknown',
        avgConfirmationMinutes: chain.confirmationMinutes,
      };
    }

    healthCache = status;
    healthCacheTime = Date.now();
    return status;
  }
}

/**
 * Get list of supported source chains for bridging to Ergo.
 */
export function getSupportedChains(): SupportedChain[] {
  return SUPPORTED_CHAINS;
}

/**
 * Get a specific chain config.
 */
export function getChain(key: SourceChain): SupportedChain | undefined {
  return SUPPORTED_CHAINS.find(c => c.key === key);
}

/**
 * Estimate bridge fees for a given source chain and amount.
 */
export async function estimateBridgeFee(
  sourceChain: SourceChain,
  amount: number,
): Promise<BridgeFeeEstimate> {
  const chain = getChain(sourceChain);
  if (!chain) throw new Error(`Unsupported chain: ${sourceChain}`);

  const prices = await getTokenPrices();
  const tokenPrice = prices[chain.nativeToken.toLowerCase()] ?? 0;
  const ergPrice = prices.erg ?? FALLBACK_PRICES.erg;
  const amountUsd = amount * tokenPrice;

  // Bridge fee: max(0.5%, $10 equivalent)
  const percentFee = amount * (BRIDGE_FEE_PERCENT / 100);
  const minFeeInToken = BRIDGE_MIN_FEE_USD / tokenPrice;
  const bridgeFee = Math.max(percentFee, minFeeInToken);

  // Network fee estimates (approximate)
  const networkFees: Record<SourceChain, number> = {
    bitcoin: 0.0001,
    ethereum: 0.003,
    cardano: 0.3,
    binance: 0.001,
    doge: 2,
  };
  const networkFee = networkFees[sourceChain] ?? 0;

  const totalFee = bridgeFee + networkFee;
  const receivedInToken = amount - totalFee;
  const receivedUsd = receivedInToken * tokenPrice;
  const estimatedErg = receivedUsd / ergPrice;

  // Minimum bridge amounts (roughly $15 to cover fees + leave meaningful value)
  const minimumAmounts: Record<SourceChain, number> = {
    bitcoin: 0.0002,
    ethereum: 0.005,
    cardano: 25,
    binance: 0.03,
    doge: 150,
  };

  return {
    bridgeFee,
    networkFee,
    totalFee,
    estimatedErgReceived: Math.max(0, estimatedErg),
    estimatedUsdReceived: Math.max(0, receivedUsd),
    feePercent: amount > 0 ? (totalFee / amount) * 100 : 0,
    minimumAmount: minimumAmounts[sourceChain] ?? 0,
  };
}

/**
 * Generate bridge deposit instructions for a user.
 * For MVP this directs users to app.rosen.tech.
 * For V2 this will generate programmatic deposit info.
 */
export async function generateBridgeDeposit(
  sourceChain: SourceChain,
  amount: number,
  ergoDestAddress: string,
): Promise<BridgeDepositInfo> {
  const chain = getChain(sourceChain);
  if (!chain) throw new Error(`Unsupported chain: ${sourceChain}`);

  if (!ergoDestAddress || ergoDestAddress.length < 30) {
    throw new Error('Invalid Ergo destination address');
  }

  const fees = await estimateBridgeFee(sourceChain, amount);

  if (amount < fees.minimumAmount) {
    throw new Error(
      `Amount ${amount} ${chain.nativeToken} is below minimum ${fees.minimumAmount} ${chain.nativeToken}`
    );
  }

  // Build Rosen Bridge URL with pre-filled parameters
  const rosenParams = new URLSearchParams({
    from: sourceChain,
    to: 'ergo',
    // amount and address would be entered in the Rosen UI
  });

  return {
    chain: sourceChain,
    depositAddress: chain.depositAddress || '(see app.rosen.tech)',
    amountToSend: amount,
    token: chain.nativeToken,
    ergoDestination: ergoDestAddress,
    steps: [
      `1. Visit ${ROSEN_APP_URL}`,
      `2. Select "${chain.label} → Ergo" bridge direction`,
      `3. Enter your Ergo address: ${ergoDestAddress.slice(0, 12)}...${ergoDestAddress.slice(-6)}`,
      `4. Enter amount: ${amount} ${chain.nativeToken}`,
      `5. Follow the prompts to send from your ${chain.label} wallet`,
      `6. Wait approximately ${chain.confirmationMinutes} minutes for confirmation`,
      `7. Wrapped tokens will appear in your Ergo wallet`,
      `8. Return here to fund the task escrow`,
    ],
    rosenAppUrl: `${ROSEN_APP_URL}?${rosenParams.toString()}`,
    estimatedMinutes: chain.confirmationMinutes,
    fees,
  };
}

/**
 * Watch/poll a bridge transaction status.
 * Checks the Ergo explorer for the wrapped token arrival.
 * For MVP this is a simple polling mechanism.
 */
export async function watchBridgeTransaction(
  ergoAddress: string,
  expectedToken?: string,
): Promise<BridgeTransaction | null> {
  try {
    // Check Ergo explorer for recent token receipts at the address
    const response = await fetch(
      `https://api.ergoplatform.com/api/v1/addresses/${ergoAddress}/balance/confirmed`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Check if any wrapped Rosen tokens are present
    if (data.tokens && Array.isArray(data.tokens)) {
      for (const token of data.tokens) {
        const wrappedEntry = Object.values(WRAPPED_TOKEN_IDS).find(
          wt => wt.tokenId === token.tokenId
        );
        if (wrappedEntry && (!expectedToken || token.tokenId === expectedToken)) {
          return {
            sourceChain: 'bitcoin', // Would need to infer from token
            sourceTxId: '',
            status: 'completed',
            ergoTxId: '', // Would need transaction lookup
            sourceAmount: 0,
            sourceToken: wrappedEntry.name,
            wrappedTokenId: token.tokenId,
            wrappedAmount: token.amount,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get conversion rates for display (e.g., "0.01 BTC ≈ 15 ERG ≈ $18")
 */
export async function getConversionDisplay(
  sourceChain: SourceChain,
  amount: number,
): Promise<{ ergAmount: string; usdAmount: string; display: string }> {
  const chain = getChain(sourceChain);
  if (!chain) throw new Error(`Unsupported chain: ${sourceChain}`);

  const prices = await getTokenPrices();
  const tokenPrice = prices[chain.nativeToken.toLowerCase()] ?? 0;
  const ergPrice = prices.erg ?? FALLBACK_PRICES.erg;

  const usdValue = amount * tokenPrice;
  const ergValue = ergPrice > 0 ? usdValue / ergPrice : 0;

  const ergStr = ergValue.toFixed(2);
  const usdStr = usdValue < 1 ? `$${usdValue.toFixed(4)}` : `$${usdValue.toFixed(2)}`;

  return {
    ergAmount: ergStr,
    usdAmount: usdStr,
    display: `${amount} ${chain.nativeToken} ≈ ${ergStr} ERG ≈ ${usdStr}`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function getTokenPrices(): Promise<Record<string, number>> {
  if (Date.now() - priceCacheTime < PRICE_CACHE_TTL) {
    return priceCache;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,binancecoin,dogecoin,ergo&vs_currencies=usd',
      { signal: AbortSignal.timeout(10_000) },
    );

    if (response.ok) {
      const data = await response.json();
      priceCache = {
        btc: data.bitcoin?.usd ?? FALLBACK_PRICES.btc,
        eth: data.ethereum?.usd ?? FALLBACK_PRICES.eth,
        ada: data.cardano?.usd ?? FALLBACK_PRICES.ada,
        bnb: data.binancecoin?.usd ?? FALLBACK_PRICES.bnb,
        doge: data.dogecoin?.usd ?? FALLBACK_PRICES.doge,
        erg: data.ergo?.usd ?? FALLBACK_PRICES.erg,
      };
      priceCacheTime = Date.now();
    }
  } catch {
    // Use cached/fallback prices
  }

  return priceCache;
}

/**
 * Get the Spectrum DEX swap URL for converting wrapped tokens to ERG.
 */
export function getSpectrumSwapUrl(wrappedTokenId: string): string {
  return `https://app.spectrum.fi/ergo/swap?base=${wrappedTokenId}&quote=ERG`;
}

/**
 * Check if a given Ergo address has wrapped bridge tokens.
 */
export async function checkWrappedTokenBalance(
  ergoAddress: string,
): Promise<Array<{ token: string; tokenId: string; amount: number; decimals: number }>> {
  try {
    const response = await fetch(
      `https://api.ergoplatform.com/api/v1/addresses/${ergoAddress}/balance/confirmed`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!response.ok) return [];

    const data = await response.json();
    const result: Array<{ token: string; tokenId: string; amount: number; decimals: number }> = [];

    if (data.tokens && Array.isArray(data.tokens)) {
      for (const token of data.tokens) {
        const wrappedEntry = Object.values(WRAPPED_TOKEN_IDS).find(
          wt => wt.tokenId === token.tokenId
        );
        if (wrappedEntry) {
          result.push({
            token: wrappedEntry.name,
            tokenId: token.tokenId,
            amount: token.amount / Math.pow(10, wrappedEntry.decimals),
            decimals: wrappedEntry.decimals,
          });
        }
      }
    }

    return result;
  } catch {
    return [];
  }
}
