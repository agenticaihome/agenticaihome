'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StatsData {
  price: number | null;
  priceChange24h: number | null;
  blockHeight: number | null;
  difficulty: number | null;
  lastBlockTime: number | null;
  // Platform stats
  totalTasks: number | null;
  totalAgents: number | null;
  totalEscrowErg: number | null;
  activeTasks: number | null;
  isLoading: boolean;
}

// Cache network stats for 3 minutes to reduce external API calls
let networkStatsCache: { data: StatsData | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

export default function ErgoNetworkStats() {
  const [stats, setStats] = useState<StatsData>({
    price: null,
    priceChange24h: null,
    blockHeight: null,
    difficulty: null,
    lastBlockTime: null,
    totalTasks: null,
    totalAgents: null,
    totalEscrowErg: null,
    activeTasks: null,
    isLoading: true,
  });

  const fetchData = async () => {
    // Check cache first
    const now = Date.now();
    if (networkStatsCache.data && (now - networkStatsCache.timestamp) < CACHE_DURATION) {
      setStats(networkStatsCache.data);
      return;
    }

    // Fetch blockchain and platform data in parallel
    const results = await Promise.allSettled([
      // ERG price from CoinGecko
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ergo&vs_currencies=usd&include_24hr_change=true', { 
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .catch(() => 
          // Fallback: try Spectrum DEX API for ERG price
          fetch('https://api.spectrum.fi/v1/price-tracking/ergo/tokens', {
            signal: AbortSignal.timeout(5000)
          })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(tokens => {
              const sigUsd = tokens?.find((t: { ticker: string }) => t.ticker === 'SigUSD');
              if (sigUsd?.price) return { ergo: { usd: 1 / sigUsd.price, usd_24h_change: 0 } };
              return Promise.reject();
            })
        ),
      // Latest block data
      fetch('https://api.ergoplatform.com/api/v1/blocks?limit=1&sortBy=height&sortDirection=desc', {
        signal: AbortSignal.timeout(5000)
      })
        .then(r => r.ok ? r.json() : Promise.reject()),
      // Platform stats from Supabase
      fetchPlatformStats(),
    ]);

    const [priceRes, blockRes, platformRes] = results;
    const priceData = priceRes.status === 'fulfilled' ? priceRes.value : null;
    const blockData = blockRes.status === 'fulfilled' ? blockRes.value : null;
    const platformData = platformRes.status === 'fulfilled' ? platformRes.value : null;
    const block = blockData?.items?.[0];

    const newStats: StatsData = {
      price: priceData?.ergo?.usd ?? null,
      priceChange24h: priceData?.ergo?.usd_24h_change ?? null,
      blockHeight: block?.height ?? null,
      difficulty: block?.difficulty ?? null,
      lastBlockTime: block?.timestamp ?? null,
      totalTasks: platformData?.totalTasks ?? null,
      totalAgents: platformData?.totalAgents ?? null,
      totalEscrowErg: platformData?.totalEscrowErg ?? null,
      activeTasks: platformData?.activeTasks ?? null,
      isLoading: false,
    };

    setStats(newStats);
    networkStatsCache = { data: newStats, timestamp: now };
  };

  // Helper function to fetch platform stats from Supabase
  const fetchPlatformStats = async () => {
    try {
      const [tasksRes, agentsRes, escrowRes] = await Promise.allSettled([
        // Total tasks
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        // Total agents
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        // Active tasks (funded, in_progress, review)
        supabase.from('tasks')
          .select('id, budgetErg, status')
          .in('status', ['funded', 'in_progress', 'review']),
      ]);

      const totalTasks = tasksRes.status === 'fulfilled' ? tasksRes.value.count || 0 : 0;
      const totalAgents = agentsRes.status === 'fulfilled' ? agentsRes.value.count || 0 : 0;
      
      let activeTasks = 0;
      let totalEscrowErg = 0;
      
      if (escrowRes.status === 'fulfilled' && escrowRes.value.data) {
        activeTasks = escrowRes.value.data.length;
        totalEscrowErg = escrowRes.value.data.reduce((sum, task) => {
          return sum + (task.budgetErg || 0);
        }, 0);
      }

      return {
        totalTasks,
        totalAgents,
        totalEscrowErg,
        activeTasks,
      };
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      return {
        totalTasks: null,
        totalAgents: null,
        totalEscrowErg: null,
        activeTasks: null,
      };
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 60 seconds as requested
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

  // Show error state if all values are null (failed to fetch)
  if (stats.price === null && stats.blockHeight === null && stats.difficulty === null && stats.totalTasks === null) {
    return (
      <div className="w-full bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)] py-2.5 px-4">
        <div className="container container-xl flex items-center justify-center gap-8 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            Network stats unavailable
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)] py-1.5 md:py-2 px-4">
      <div className="container container-xl">
        {/* Mobile: single compact line */}
        <div className="flex md:hidden items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {stats.price !== null ? (
              <span className="font-medium text-[var(--text-primary)]">
                ERG ${stats.price.toFixed(2)}
                {stats.priceChange24h !== null && (
                  <span className={`ml-1 ${changeColor}`}>
                    {changeArrow}{Math.abs(stats.priceChange24h).toFixed(1)}%
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[var(--text-secondary)]">ERG —</span>
            )}
          </div>
          <span className="text-[var(--border-color)]">·</span>
          {stats.blockHeight !== null && (
            <span className="text-[var(--text-muted)]">
              Block <span className="text-[var(--accent-cyan)]">#{stats.blockHeight.toLocaleString()}</span>
            </span>
          )}
          <span className="text-[var(--border-color)]">·</span>
          {stats.totalTasks !== null && (
            <span className="text-[var(--text-muted)]">
              <span className="text-[var(--text-primary)]">{stats.totalTasks}</span> Tasks
            </span>
          )}
        </div>

        {/* Desktop: full two rows */}
        <div className="hidden md:block">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">ERG</span>
              {stats.price !== null ? (
                <>
                  <span className="font-semibold text-[var(--text-primary)]">${stats.price.toFixed(4)}</span>
                  {stats.priceChange24h !== null && (
                    <span className={`text-xs font-medium ${changeColor}`}>
                      {changeArrow} {Math.abs(stats.priceChange24h).toFixed(2)}%
                    </span>
                  )}
                </>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Block</span>
              {stats.blockHeight !== null ? (
                <span className="font-semibold text-[var(--accent-cyan)]">#{stats.blockHeight.toLocaleString()}</span>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Difficulty</span>
              {stats.difficulty !== null ? (
                <span className="font-semibold text-[var(--accent-purple)]">{formatDifficulty(stats.difficulty)}</span>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Last Block</span>
              {stats.lastBlockTime !== null ? (
                <span className="font-medium text-[var(--accent-green)]">{timeAgo(stats.lastBlockTime)}</span>
              ) : (
                <span className="font-medium text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-[var(--text-muted)]">Live</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm border-t border-[var(--border-color)]/30 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Tasks</span>
              {stats.totalTasks !== null ? (
                <span className="font-semibold text-[var(--accent-cyan)]">{stats.totalTasks.toLocaleString()}</span>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Active</span>
              {stats.activeTasks !== null ? (
                <span className="font-semibold text-[var(--accent-green)]">{stats.activeTasks.toLocaleString()}</span>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Agents</span>
              {stats.totalAgents !== null ? (
                <span className="font-semibold text-[var(--accent-purple)]">{stats.totalAgents.toLocaleString()}</span>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Escrow</span>
              {stats.totalEscrowErg !== null ? (
                <span className="font-semibold text-[var(--accent-amber)]">
                  {stats.totalEscrowErg.toFixed(2)} ERG
                  {stats.price && (
                    <span className="text-xs text-[var(--text-muted)] ml-1">
                      (${(stats.totalEscrowErg * stats.price).toFixed(0)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-semibold text-[var(--text-secondary)]">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}