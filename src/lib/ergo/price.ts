// ERG price feed utility

interface PriceData {
  usd: number;
  btc: number;
  timestamp: number;
}

interface CoinGeckoResponse {
  ergo: {
    usd: number;
    btc: number;
  };
}

// Cache price data for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let priceCache: PriceData | null = null;

export async function getErgPrice(): Promise<{ usd: number; btc: number }> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return {
      usd: priceCache.usd,
      btc: priceCache.btc,
    };
  }

  try {
    // Primary: CoinGecko API (free, no key required)
    const price = await fetchFromCoinGecko();
    
    // Update cache
    priceCache = {
      ...price,
      timestamp: Date.now(),
    };
    
    return price;
  } catch (error) {
    console.error('Failed to fetch ERG price from CoinGecko:', error);
    
    try {
      // Fallback: Try Spectrum DEX (placeholder for now)
      const price = await fetchFromSpectrum();
      
      // Update cache
      priceCache = {
        ...price,
        timestamp: Date.now(),
      };
      
      return price;
    } catch (fallbackError) {
      console.error('Failed to fetch ERG price from Spectrum:', fallbackError);
      
      // Return cached data if available, even if expired
      if (priceCache) {
        // Using expired price cache
        return {
          usd: priceCache.usd,
          btc: priceCache.btc,
        };
      }
      
      // Last resort: return a default price (this should rarely happen)
      console.error('No price data available, using fallback');
      return {
        usd: 1.0, // Fallback price
        btc: 0.000015,
      };
    }
  }
}

async function fetchFromCoinGecko(): Promise<{ usd: number; btc: number }> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ergo&vs_currencies=usd,btc';
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }
  
  const data: CoinGeckoResponse = await response.json();
  
  if (!data.ergo) {
    throw new Error('Invalid response from CoinGecko');
  }
  
  return {
    usd: data.ergo.usd,
    btc: data.ergo.btc,
  };
}

async function fetchFromSpectrum(): Promise<{ usd: number; btc: number }> {
  // Placeholder for Spectrum DEX price fetching
  // In a real implementation, this would query Spectrum's API or smart contracts
  // For now, we'll throw an error to indicate it's not implemented
  throw new Error('Spectrum price feed not implemented yet');
}

export function ergToUsd(ergAmount: number, pricePerErg: number): string {
  const usdValue = ergAmount * pricePerErg;
  return formatUsdAmount(usdValue);
}

export function usdToErg(usdAmount: number, pricePerErg: number): string {
  if (pricePerErg === 0) return '0';
  const ergValue = usdAmount / pricePerErg;
  return ergValue.toFixed(6).replace(/\.?0+$/, ''); // Remove trailing zeros
}

export function formatUsdAmount(amount: number): string {
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  } else if (amount < 1) {
    return `$${amount.toFixed(3)}`;
  } else {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatErgWithUsd(ergAmount: string | number, usdPrice: number): string {
  const erg = typeof ergAmount === 'string' ? parseFloat(ergAmount) : ergAmount;
  const usdValue = erg * usdPrice;
  return `Σ${erg.toFixed(6).replace(/\.?0+$/, '')} ERG (${formatUsdAmount(usdValue)})`;
}

// Hook for React components to get live price
export function useLivePrice() {
  // This would be implemented as a React hook in a real app
  // For now, it's just a placeholder
  return {
    price: null,
    loading: true,
    error: null,
    refetch: () => getErgPrice(),
  };
}

// Utility to validate and parse ERG amounts
export function parseErgAmount(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, ''); // Remove non-numeric characters except decimal
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid ERG amount');
  }
  
  return parsed;
}

// Utility to format ERG input (for form inputs)
export function formatErgInput(value: string): string {
  // Remove invalid characters
  let cleaned = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places to 9 (nanoERG precision)
  if (parts.length === 2 && parts[1].length > 9) {
    cleaned = parts[0] + '.' + parts[1].substring(0, 9);
  }
  
  return cleaned;
}