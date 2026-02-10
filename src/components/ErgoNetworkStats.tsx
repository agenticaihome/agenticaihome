'use client';

import { useState, useEffect } from 'react';

interface ErgoPrice {
  usd: number;
  usd_24h_change: number;
}

interface NetworkState {
  network: {
    blockHeight: number;
    networkHashRate: number;
    difficulty: number;
  };
  supply: {
    totalCoinsIssued: number;
  };
}

interface ErgoStats {
  price: ErgoPrice | null;
  network: NetworkState | null;
  lastUpdated: Date | null;
  isLoading: boolean;
  priceError: boolean;
  networkError: boolean;
}

export default function ErgoNetworkStats() {
  const [stats, setStats] = useState<ErgoStats>({
    price: null,
    network: null,
    lastUpdated: null,
    isLoading: true,
    priceError: false,
    networkError: false,
  });

  const fetchPriceData = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ergo&vs_currencies=usd&include_24hr_change=true',
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ergo) {
        return {
          usd: data.ergo.usd,
          usd_24h_change: data.ergo.usd_24h_change || 0,
        };
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Price fetch error:', error);
      throw error;
    }
  };

  const fetchNetworkData = async () => {
    try {
      const response = await fetch('https://api.ergoplatform.com/api/v1/networkState');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Network fetch error:', error);
      throw error;
    }
  };

  const fetchAllData = async () => {
    setStats(prev => ({ ...prev, isLoading: true }));

    const results = await Promise.allSettled([
      fetchPriceData(),
      fetchNetworkData(),
    ]);

    const [priceResult, networkResult] = results;

    setStats({
      price: priceResult.status === 'fulfilled' ? priceResult.value : null,
      network: networkResult.status === 'fulfilled' ? networkResult.value : null,
      lastUpdated: new Date(),
      isLoading: false,
      priceError: priceResult.status === 'rejected',
      networkError: networkResult.status === 'rejected',
    });
  };

  useEffect(() => {
    fetchAllData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(price);
  };

  const formatHashrate = (hashrate: number) => {
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
    let value = hashrate;
    let unitIndex = 0;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatSupply = (supply: number) => {
    const millions = supply / 1000000;
    return `${millions.toFixed(2)}M ERG`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-[var(--accent-green)]';
    if (change < 0) return 'text-[var(--accent-red)]';
    return 'text-[var(--text-secondary)]';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <section className="py-6 px-4 bg-[var(--bg-secondary)]/30 backdrop-blur-sm border-b border-[var(--border-color)]">
      <div className="container container-xl">
        <div className="glass-card rounded-xl p-4 lg:p-6 relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)]/5 via-transparent to-[var(--accent-green)]/5"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-[var(--accent-green)]">Σ</span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Ergo Network</h3>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                {stats.isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse"></div>
                    <span>Updating...</span>
                  </div>
                ) : stats.lastUpdated ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></div>
                    <span>Updated {stats.lastUpdated.toLocaleTimeString()}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* ERG Price */}
              <div className="text-center lg:text-left">
                <div className="text-xs text-[var(--text-muted)] mb-1">ERG Price</div>
                {stats.priceError ? (
                  <div className="text-[var(--text-muted)] text-sm">Price unavailable</div>
                ) : stats.price ? (
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-[var(--text-primary)]">
                      {formatPrice(stats.price.usd)}
                    </div>
                    <div className={`text-sm font-medium flex items-center gap-1 ${getPriceChangeColor(stats.price.usd_24h_change)}`}>
                      <span>{getPriceChangeIcon(stats.price.usd_24h_change)}</span>
                      <span>{Math.abs(stats.price.usd_24h_change).toFixed(2)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-6 bg-[var(--bg-card)] rounded mb-1"></div>
                    <div className="h-4 bg-[var(--bg-card)] rounded w-16"></div>
                  </div>
                )}
              </div>

              {/* Block Height */}
              <div className="text-center lg:text-left">
                <div className="text-xs text-[var(--text-muted)] mb-1">Block Height</div>
                {stats.networkError ? (
                  <div className="text-[var(--text-muted)] text-sm">Unavailable</div>
                ) : stats.network?.network?.blockHeight ? (
                  <div className="text-xl font-bold text-[var(--accent-cyan)]">
                    {formatNumber(stats.network.network.blockHeight)}
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-6 bg-[var(--bg-card)] rounded"></div>
                  </div>
                )}
              </div>

              {/* Network Hashrate */}
              <div className="text-center lg:text-left">
                <div className="text-xs text-[var(--text-muted)] mb-1">Network Hashrate</div>
                {stats.networkError ? (
                  <div className="text-[var(--text-muted)] text-sm">Unavailable</div>
                ) : stats.network?.network?.networkHashRate ? (
                  <div className="text-xl font-bold text-[var(--accent-purple)]">
                    {formatHashrate(stats.network.network.networkHashRate)}
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-6 bg-[var(--bg-card)] rounded"></div>
                  </div>
                )}
              </div>

              {/* ERG Supply */}
              <div className="text-center lg:text-left">
                <div className="text-xs text-[var(--text-muted)] mb-1">ERG Supply</div>
                {stats.networkError ? (
                  <div className="text-[var(--text-muted)] text-sm">Unavailable</div>
                ) : stats.network?.supply?.totalCoinsIssued ? (
                  <div className="text-xl font-bold text-[var(--accent-green)]">
                    {formatSupply(stats.network.supply.totalCoinsIssued)}
                  </div>
                ) : (
                  <div className="animate-pulse">
                    <div className="h-6 bg-[var(--bg-card)] rounded"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Error indicator if both sources failed */}
            {stats.priceError && stats.networkError && !stats.isLoading && (
              <div className="mt-4 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-lg">
                <div className="text-xs text-[var(--accent-red)] text-center">
                  Unable to fetch network data. Please check your connection or try again later.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}