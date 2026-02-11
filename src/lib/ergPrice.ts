// ERG price utility with CoinGecko primary and Spectrum Finance fallback
// Caches for 5 minutes to avoid API spam

interface CoinGeckoPriceResponse {
  ergo: {
    usd: number;
  };
}

interface SpectrumPriceResponse {
  price: number; // ERG/USD price
}

interface CacheEntry {
  price: number;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ergo&vs_currencies=usd';
const SPECTRUM_URL = 'https://api.spectrum.fi/v1/price-tracking/markets/ERG_USD';

let priceCache: CacheEntry | null = null;

async function fetchFromCoinGecko(): Promise<number> {
  try {
    const response = await fetch(COINGECKO_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgenticAiHome/1.0',
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoPriceResponse = await response.json();
    return data.ergo.usd;
  } catch (error) {
    console.warn('Failed to fetch ERG price from CoinGecko:', error);
    throw error;
  }
}

async function fetchFromSpectrum(): Promise<number> {
  try {
    const response = await fetch(SPECTRUM_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AgenticAiHome/1.0',
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Spectrum API error: ${response.status}`);
    }

    const data: SpectrumPriceResponse = await response.json();
    return data.price;
  } catch (error) {
    console.warn('Failed to fetch ERG price from Spectrum:', error);
    throw error;
  }
}

export async function getErgPrice(): Promise<number> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.price;
  }

  let price: number;

  try {
    // Try CoinGecko first
    price = await fetchFromCoinGecko();
  } catch (error) {
    console.warn('CoinGecko failed, trying Spectrum Finance...');
    try {
      // Fallback to Spectrum
      price = await fetchFromSpectrum();
    } catch (fallbackError) {
      console.error('Both price APIs failed:', { coingecko: error, spectrum: fallbackError });
      // Use last cached price if available, otherwise throw
      if (priceCache) {
        console.warn('Using stale cached price due to API failures');
        return priceCache.price;
      }
      throw new Error('Unable to fetch ERG price from any API');
    }
  }

  // Validate price
  if (typeof price !== 'number' || price <= 0 || !isFinite(price)) {
    throw new Error(`Invalid price received: ${price}`);
  }

  // Update cache
  priceCache = {
    price,
    timestamp: Date.now(),
  };

  return price;
}

export async function usdToErg(usdAmount: number): Promise<number> {
  if (typeof usdAmount !== 'number' || usdAmount <= 0) {
    throw new Error('USD amount must be a positive number');
  }

  const ergPrice = await getErgPrice();
  return usdAmount / ergPrice;
}

export async function ergToUsd(ergAmount: number): Promise<number> {
  if (typeof ergAmount !== 'number' || ergAmount <= 0) {
    throw new Error('ERG amount must be a positive number');
  }

  const ergPrice = await getErgPrice();
  return ergAmount * ergPrice;
}

// Utility functions for formatting
export function formatUsdAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatErgAmount(amount: number): string {
  // Format ERG with appropriate decimal places
  const formatted = amount.toFixed(amount >= 10 ? 2 : amount >= 1 ? 3 : 4);
  return `${formatted} ERG`;
}

// Format price with both currencies for display
export async function formatPrice(
  primaryAmount: number,
  primaryCurrency: 'USD' | 'ERG'
): Promise<string> {
  try {
    if (primaryCurrency === 'USD') {
      const ergAmount = await usdToErg(primaryAmount);
      return `${formatUsdAmount(primaryAmount)} (≈ ${formatErgAmount(ergAmount)})`;
    } else {
      const usdAmount = await ergToUsd(primaryAmount);
      return `${formatErgAmount(primaryAmount)} (≈ ${formatUsdAmount(usdAmount)})`;
    }
  } catch (error) {
    console.error('Failed to format price with conversion:', error);
    // Fallback to primary currency only
    if (primaryCurrency === 'USD') {
      return formatUsdAmount(primaryAmount);
    } else {
      return formatErgAmount(primaryAmount);
    }
  }
}

// Get cached price without fetching (for immediate display)
export function getCachedErgPrice(): number | null {
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.price;
  }
  return null;
}