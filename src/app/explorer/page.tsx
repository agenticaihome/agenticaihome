'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';

interface NetworkStats {
  height: number;
  hashRate: number;
  difficulty: number;
  supply: number;
  lastBlockTime: string;
}

interface BlockInfo {
  id: string;
  height: number;
  timestamp: number;
  transactionsCount: number;
  minerReward: number;
  size: number;
}

export default function ExplorerPage() {
  const { wallet, userAddress } = useWallet();
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch network info
      const [infoRes, blocksRes] = await Promise.all([
        fetch('https://api.ergoplatform.com/api/v1/networkState'),
        fetch('https://api.ergoplatform.com/api/v1/blocks?limit=10&offset=0&sortBy=height&sortDirection=desc'),
      ]);

      if (infoRes.ok) {
        const info = await infoRes.json();
        setNetworkStats({
          height: info.height,
          hashRate: info.params?.hashRate || 0,
          difficulty: info.difficulty,
          supply: info.params?.circulatingSupply || 0,
          lastBlockTime: new Date(info.lastBlockTimestamp || Date.now()).toISOString(),
        });
      }

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        const blocks = (blocksData.items || []).map((b: any) => ({
          id: b.id,
          height: b.height,
          timestamp: b.timestamp,
          transactionsCount: b.transactionsCount,
          minerReward: b.minerReward / 1e9,
          size: b.size,
        }));
        setRecentBlocks(blocks);
      }
    } catch (err) {
      console.error('Failed to fetch network data:', err);
      setError('Failed to connect to Ergo network. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatHashRate = (hr: number) => {
    if (hr >= 1e15) return `${(hr / 1e15).toFixed(2)} PH/s`;
    if (hr >= 1e12) return `${(hr / 1e12).toFixed(2)} TH/s`;
    if (hr >= 1e9) return `${(hr / 1e9).toFixed(2)} GH/s`;
    return `${(hr / 1e6).toFixed(2)} MH/s`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    // Open on ergoplatform explorer
    if (searchQuery.length === 64) {
      window.open(`https://explorer.ergoplatform.com/en/transactions/${searchQuery}`, '_blank');
    } else {
      window.open(`https://explorer.ergoplatform.com/en/addresses/${searchQuery}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-[var(--text-primary)]">On-Chain </span>
            <span className="text-[var(--accent-cyan)]">Explorer</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
            Live Ergo blockchain data. All AgenticAiHome transactions will be verifiable here.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by transaction ID or address..."
                className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="px-6 py-3 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 disabled:opacity-50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Opens in Ergo Platform Explorer</p>
        </div>

        {/* Wallet Info */}
        {userAddress && (
          <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-white font-semibold mb-1">Your Wallet</h3>
                <p className="text-gray-400 text-sm font-mono break-all">{userAddress}</p>
              </div>
              <div className="flex items-center gap-4">
                {wallet.balance && (
                  <span className="text-lg font-bold text-yellow-400">
                    Σ{wallet.balance.erg} ERG
                  </span>
                )}
                <a
                  href={`https://explorer.ergoplatform.com/en/addresses/${userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-[var(--accent-cyan)]/50 hover:border-[var(--accent-cyan)] text-[var(--accent-cyan)] rounded-lg text-sm font-medium transition-all"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Network Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Network Stats</h2>
            <button
              onClick={fetchNetworkData}
              disabled={loading}
              className="text-sm text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          {loading && !networkStats ? (
            <div className="grid md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-slate-700 rounded w-32"></div>
                </div>
              ))}
            </div>
          ) : networkStats ? (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Block Height</p>
                <p className="text-2xl font-bold text-white">{networkStats.height.toLocaleString()}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Hash Rate</p>
                <p className="text-2xl font-bold text-[var(--accent-cyan)]">{formatHashRate(networkStats.hashRate)}</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Difficulty</p>
                <p className="text-2xl font-bold text-purple-400">{(networkStats.difficulty / 1e15).toFixed(2)}P</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Last Block</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatTimeAgo(new Date(networkStats.lastBlockTime).getTime())}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Recent Blocks */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Blocks</h2>
          
          {loading && recentBlocks.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading blocks from Ergo network...</p>
            </div>
          ) : recentBlocks.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="text-left p-4">Height</th>
                      <th className="text-left p-4">Age</th>
                      <th className="text-left p-4">Txns</th>
                      <th className="text-left p-4">Reward</th>
                      <th className="text-left p-4">Size</th>
                      <th className="text-left p-4">Block ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBlocks.map((block) => (
                      <tr key={block.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="p-4 text-[var(--accent-cyan)] font-mono font-medium">
                          {block.height.toLocaleString()}
                        </td>
                        <td className="p-4 text-gray-300">{formatTimeAgo(block.timestamp)}</td>
                        <td className="p-4 text-gray-300">{block.transactionsCount}</td>
                        <td className="p-4 text-emerald-400">{block.minerReward.toFixed(2)} ERG</td>
                        <td className="p-4 text-gray-400">{(block.size / 1024).toFixed(1)} KB</td>
                        <td className="p-4">
                          <a
                            href={`https://explorer.ergoplatform.com/en/blocks/${block.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent-cyan)] hover:underline font-mono text-xs"
                          >
                            {block.id.slice(0, 12)}...
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <p className="text-gray-400">Unable to load blocks. Check your connection.</p>
            </div>
          )}

          <div className="mt-4 text-center">
            <a
              href="https://explorer.ergoplatform.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent-cyan)] hover:underline"
            >
              View full explorer on ergoplatform.com →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
