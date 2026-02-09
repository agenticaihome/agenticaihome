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

interface Transaction {
  id: string;
  blockId: string;
  height: number;
  timestamp: number;
  inputs: number;
  outputs: number;
  fee: number;
  size: number;
}

interface AddressInfo {
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
  transactionsCount: number;
  tokens: Array<{
    tokenId: string;
    name?: string;
    amount: number;
    decimals: number;
  }>;
}

interface MempoolInfo {
  size: number;
  transactions: Array<{
    id: string;
    fee: number;
    size: number;
    timestamp: number;
    inputs: number;
    outputs: number;
  }>;
}

const ERGO_API = 'https://api.ergoplatform.com/api/v1';
const CORS_PROXY = 'https://corsproxy.io/?';

async function ergoFetch(path: string): Promise<Response> {
  try {
    const res = await fetch(`${ERGO_API}${path}`);
    if (res.ok) return res;
  } catch {}
  return fetch(`${CORS_PROXY}${encodeURIComponent(`${ERGO_API}${path}`)}`);
}

export default function ExplorerPage() {
  const { wallet, userAddress } = useWallet();
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [mempoolInfo, setMempoolInfo] = useState<MempoolInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'blocks' | 'transactions' | 'mempool' | 'address'>('blocks');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<'transaction' | 'address' | 'block' | null>(null);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch network info, blocks, transactions, and mempool
      const [infoRes, blocksRes, txRes, mempoolRes] = await Promise.all([
        ergoFetch('/networkState'),
        ergoFetch('/blocks?limit=10&offset=0&sortBy=height&sortDirection=desc'),
        ergoFetch('/transactions?limit=10&offset=0&sortBy=timestamp&sortDirection=desc'),
        ergoFetch('/mempool/transactions?limit=20&offset=0').catch(() => null),
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

      if (txRes.ok) {
        const txData = await txRes.json();
        const transactions = (txData.items || []).map((tx: any) => ({
          id: tx.id,
          blockId: tx.blockId,
          height: tx.inclusionHeight,
          timestamp: tx.timestamp,
          inputs: tx.inputs?.length || 0,
          outputs: tx.outputs?.length || 0,
          fee: (tx.inputs?.[0]?.value || 0) - (tx.outputs?.reduce((sum: number, out: any) => sum + (out.value || 0), 0) || 0),
          size: tx.size || 0,
        }));
        setRecentTransactions(transactions);
      }

      if (mempoolRes && mempoolRes.ok) {
        const mempoolData = await mempoolRes.json();
        const mempoolTxs = (mempoolData.items || []).map((tx: any) => ({
          id: tx.id,
          fee: (tx.inputs?.[0]?.value || 0) - (tx.outputs?.reduce((sum: number, out: any) => sum + (out.value || 0), 0) || 0),
          size: tx.size || 0,
          timestamp: tx.creationTimestamp || Date.now(),
          inputs: tx.inputs?.length || 0,
          outputs: tx.outputs?.length || 0,
        }));
        
        setMempoolInfo({
          size: mempoolTxs.length,
          transactions: mempoolTxs,
        });
      }
    } catch (err) {
      console.error('Failed to fetch network data:', err);
      setError('Failed to connect to Ergo network. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async (address: string) => {
    setSearchLoading(true);
    try {
      const [balanceRes, txRes] = await Promise.all([
        ergoFetch(`/addresses/${address}/balance/total`),
        ergoFetch(`/addresses/${address}/transactions?limit=1`)
      ]);

      if (balanceRes.ok && txRes.ok) {
        const balanceData = await balanceRes.json();
        const txData = await txRes.json();
        
        setAddressInfo({
          address,
          balance: balanceData.confirmed?.nanoErgs / 1e9 || 0,
          totalReceived: balanceData.received?.nanoErgs / 1e9 || 0,
          totalSent: (balanceData.received?.nanoErgs - balanceData.confirmed?.nanoErgs) / 1e9 || 0,
          transactionsCount: txData.total || 0,
          tokens: balanceData.confirmed?.tokens?.map((token: any) => ({
            tokenId: token.tokenId,
            name: token.name,
            amount: token.amount,
            decimals: token.decimals || 0,
          })) || [],
        });
        setSearchResult('address');
        setActiveTab('address');
      }
    } catch (err) {
      console.error('Address search failed:', err);
      setError('Failed to fetch address information');
    } finally {
      setSearchLoading(false);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.trim();
    setError(null);
    setSearchResult(null);
    
    // Detect search type
    if (query.length === 64 && /^[a-fA-F0-9]+$/.test(query)) {
      // Transaction ID or Block ID
      try {
        setSearchLoading(true);
        const [txRes, blockRes] = await Promise.all([
          ergoFetch(`/transactions/${query}`).catch(() => null),
          ergoFetch(`/blocks/${query}`).catch(() => null)
        ]);
        
        if (txRes && txRes.ok) {
          setSearchResult('transaction');
          window.open(`https://explorer.ergoplatform.com/en/transactions/${query}`, '_blank');
        } else if (blockRes && blockRes.ok) {
          setSearchResult('block');
          window.open(`https://explorer.ergoplatform.com/en/blocks/${query}`, '_blank');
        } else {
          setError('Transaction or block not found');
        }
      } catch (err) {
        setError('Search failed. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    } else if (query.startsWith('9') && query.length >= 51) {
      // Ergo address
      await searchAddress(query);
    } else if (/^\d+$/.test(query)) {
      // Block height
      try {
        setSearchLoading(true);
        const blockRes = await ergoFetch(`/blocks/at/${query}`);
        if (blockRes.ok) {
          const blockData = await blockRes.json();
          setSearchResult('block');
          window.open(`https://explorer.ergoplatform.com/en/blocks/${blockData[0]?.id}`, '_blank');
        } else {
          setError('Block not found at this height');
        }
      } catch (err) {
        setError('Block search failed');
      } finally {
        setSearchLoading(false);
      }
    } else {
      setError('Invalid search query. Use transaction ID, block ID, address, or block height.');
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
                placeholder="Search by transaction ID, block ID, address, or block height..."
                className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searchLoading}
              className="px-6 py-3 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 disabled:opacity-50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Address lookups show detailed info here. Transactions/blocks open in Ergo Platform Explorer.
          </p>
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

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-slate-700">
            <nav className="flex gap-8">
              {[
                { key: 'blocks', label: 'Recent Blocks', icon: '📦' },
                { key: 'transactions', label: 'Recent Transactions', icon: '💸' },
                { key: 'mempool', label: 'Mempool', icon: '⏳' },
                ...(addressInfo ? [{ key: 'address', label: 'Address Info', icon: '👤' }] : [])
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === tab.key
                      ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        <div>
          {/* Recent Blocks */}
          {activeTab === 'blocks' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Recent Blocks</h2>
                <span className="text-sm text-gray-400">
                  {recentBlocks.length} blocks shown
                </span>
              </div>
          
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
          )}

          {/* Recent Transactions */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
                <span className="text-sm text-gray-400">
                  {recentTransactions.length} transactions shown
                </span>
              </div>
              
              {loading && recentTransactions.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading transactions from Ergo network...</p>
                </div>
              ) : recentTransactions.length > 0 ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-gray-400">
                          <th className="text-left p-4">Transaction ID</th>
                          <th className="text-left p-4">Age</th>
                          <th className="text-left p-4">Height</th>
                          <th className="text-left p-4">I/O</th>
                          <th className="text-left p-4">Fee</th>
                          <th className="text-left p-4">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                            <td className="p-4">
                              <a
                                href={`https://explorer.ergoplatform.com/en/transactions/${tx.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--accent-cyan)] hover:underline font-mono text-xs"
                              >
                                {tx.id.slice(0, 16)}...
                              </a>
                            </td>
                            <td className="p-4 text-gray-300">{formatTimeAgo(tx.timestamp)}</td>
                            <td className="p-4 text-[var(--accent-cyan)] font-mono">{tx.height?.toLocaleString() || 'Pending'}</td>
                            <td className="p-4 text-gray-300">{tx.inputs}/{tx.outputs}</td>
                            <td className="p-4 text-emerald-400">{(tx.fee / 1e9).toFixed(4)} ERG</td>
                            <td className="p-4 text-gray-400">{(tx.size / 1024).toFixed(1)} KB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400">Unable to load transactions. Check your connection.</p>
                </div>
              )}
            </div>
          )}

          {/* Mempool */}
          {activeTab === 'mempool' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Mempool (Pending Transactions)</h2>
                {mempoolInfo && (
                  <span className="text-sm text-gray-400">
                    {mempoolInfo.size} pending transactions
                  </span>
                )}
              </div>
              
              {loading && !mempoolInfo ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading mempool data...</p>
                </div>
              ) : mempoolInfo && mempoolInfo.transactions.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Pending Transactions</p>
                      <p className="text-2xl font-bold text-[var(--accent-cyan)]">{mempoolInfo.size}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Avg Fee</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {mempoolInfo.transactions.length > 0 
                          ? (mempoolInfo.transactions.reduce((sum, tx) => sum + tx.fee, 0) / mempoolInfo.transactions.length / 1e9).toFixed(4)
                          : '0.0000'} ERG
                      </p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total Size</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {(mempoolInfo.transactions.reduce((sum, tx) => sum + tx.size, 0) / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-gray-400">
                            <th className="text-left p-4">Transaction ID</th>
                            <th className="text-left p-4">Age</th>
                            <th className="text-left p-4">I/O</th>
                            <th className="text-left p-4">Fee</th>
                            <th className="text-left p-4">Fee Rate</th>
                            <th className="text-left p-4">Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mempoolInfo.transactions.slice(0, 15).map((tx) => (
                            <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                              <td className="p-4">
                                <a
                                  href={`https://explorer.ergoplatform.com/en/transactions/${tx.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--accent-cyan)] hover:underline font-mono text-xs"
                                >
                                  {tx.id.slice(0, 16)}...
                                </a>
                              </td>
                              <td className="p-4 text-gray-300">{formatTimeAgo(tx.timestamp)}</td>
                              <td className="p-4 text-gray-300">{tx.inputs}/{tx.outputs}</td>
                              <td className="p-4 text-emerald-400">{(tx.fee / 1e9).toFixed(4)} ERG</td>
                              <td className="p-4 text-yellow-400">
                                {tx.size > 0 ? ((tx.fee / 1e9) / (tx.size / 1024)).toFixed(2) : '0.00'} ERG/KB
                              </td>
                              <td className="p-4 text-gray-400">{(tx.size / 1024).toFixed(1)} KB</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Mempool is Empty!</h3>
                  <p className="text-gray-400">All transactions have been processed into blocks.</p>
                </div>
              )}
            </div>
          )}

          {/* Address Information */}
          {activeTab === 'address' && addressInfo && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Address Information</h2>
                <a
                  href={`https://explorer.ergoplatform.com/en/addresses/${addressInfo.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-cyan)] hover:underline"
                >
                  View on Official Explorer →
                </a>
              </div>

              {/* Address Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                  <p className="text-3xl font-bold text-[var(--accent-cyan)]">
                    {addressInfo.balance.toFixed(4)} ERG
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-gray-400 text-sm mb-1">Total Received</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {addressInfo.totalReceived.toFixed(4)} ERG
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <p className="text-gray-400 text-sm mb-1">Transactions</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {addressInfo.transactionsCount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Address Details */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Address Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Address</p>
                    <p className="text-white font-mono text-sm break-all bg-slate-900 p-2 rounded">
                      {addressInfo.address}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Total Sent</p>
                      <p className="text-white font-semibold">{addressInfo.totalSent.toFixed(4)} ERG</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Net Flow</p>
                      <p className={`font-semibold ${addressInfo.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {addressInfo.balance >= 0 ? '+' : ''}{addressInfo.balance.toFixed(4)} ERG
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tokens */}
              {addressInfo.tokens.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Token Holdings ({addressInfo.tokens.length})
                  </h3>
                  <div className="space-y-3">
                    {addressInfo.tokens.slice(0, 10).map((token) => (
                      <div key={token.tokenId} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {token.name || 'Unknown Token'}
                          </p>
                          <p className="text-gray-400 text-xs font-mono truncate">
                            {token.tokenId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[var(--accent-cyan)] font-semibold">
                            {(token.amount / Math.pow(10, token.decimals)).toLocaleString()}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {token.decimals} decimals
                          </p>
                        </div>
                      </div>
                    ))}
                    {addressInfo.tokens.length > 10 && (
                      <p className="text-center text-gray-400 text-sm pt-2">
                        And {addressInfo.tokens.length - 10} more tokens...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
