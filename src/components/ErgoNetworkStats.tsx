'use client';

import { useState, useEffect } from 'react';

interface StatsData {
  price: number | null;
  priceChange24h: number | null;
  blockHeight: number | null;
  difficulty: number | null;
  lastBlockTime: number | null;
  isLoading: boolean;
}

export default function ErgoNetworkStats() {
  const [stats, setStats] = useState<StatsData>({
    price: null,
    priceChange24h: null,
    blockHeight: null,
    difficulty: null,
    lastBlockTime: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ergo&vs_currencies=usd&include_24hr_change=true')
          .then(r => r.ok ? r.json() : Promise.reject()),
        fetch('https://api.ergoplatform.com/api/v1/blocks?limit=1&sortBy=height&sortDirection=desc')
          .then(r => r.ok ? r.json() : Promise.reject()),
      ]);

      const [priceRes, blockRes] = results;
      const priceData = priceRes.status === 'fulfilled' ? priceRes.value : null;
      const blockData = blockRes.status === 'fulfilled' ? blockRes.value : null;
      const block = blockData?.items?.[0];

      setStats({
        price: priceData?.ergo?.usd ?? null,
        priceChange24h: priceData?.ergo?.usd_24h_change ?? null,
        blockHeight: block?.height ?? null,
        difficulty: block?.difficulty ?? null,
        lastBlockTime: block?.timestamp ?? null,
        isLoading: false,
      });
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDifficulty = (d: number) => {
    if (d >= 1e15) return `${(d / 1e15).toFixed(2)} PH`;
    if (d >= 1e12) return `${(d / 1e12).toFixed(2)} TH`;
    if (d >= 1e9) return `${(d / 1e9).toFixed(2)} GH`;
    return `${(d / 1e6).toFixed(2)} MH`;
  };

  const timeAgo = (ts: number) => {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const changeColor = stats.priceChange24h && stats.priceChange24h > 0
    ? 'text-green-400' : stats.priceChange24h && stats.priceChange24h < 0
    ? 'text-red-400' : 'text-gray-400';

  const changeArrow = stats.priceChange24h && stats.priceChange24h > 0 ? '▲' : stats.priceChange24h && stats.priceChange24h < 0 ? '▼' : '';

  if (stats.isLoading) {
    return (
      <div className="w-full bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)] py-2 px-4">
        <div className="container container-xl flex items-center justify-center gap-8 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
            Loading network data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)] py-2.5 px-4">
      <div className="container container-xl flex flex-wrap items-center justify-center gap-x-8 gap-y-1 text-sm">
        {stats.price !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">ERG</span>
            <span className="font-semibold text-[var(--text-primary)]">${stats.price.toFixed(4)}</span>
            {stats.priceChange24h !== null && (
              <span className={`text-xs font-medium ${changeColor}`}>
                {changeArrow} {Math.abs(stats.priceChange24h).toFixed(2)}%
              </span>
            )}
          </div>
        )}
        {stats.blockHeight !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Block</span>
            <span className="font-semibold text-[var(--accent-cyan)]">#{stats.blockHeight.toLocaleString()}</span>
          </div>
        )}
        {stats.difficulty !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Difficulty</span>
            <span className="font-semibold text-[var(--accent-purple)]">{formatDifficulty(stats.difficulty)}</span>
          </div>
        )}
        {stats.lastBlockTime !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Last Block</span>
            <span className="font-medium text-[var(--accent-green)]">{timeAgo(stats.lastBlockTime)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-[var(--text-muted)]">Live</span>
        </div>
      </div>
    </div>
  );
}
