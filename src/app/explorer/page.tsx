'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ErgoNetworkStats from '@/components/ErgoNetworkStats';

interface Transaction {
  id: string;
  task_id: string | null;
  task_title: string | null;
  amount_erg: string;
  type: string;
  date: string;
  tx_id: string;
}

interface PlatformStats {
  totalTransactions: number;
  totalVolume: number;
}

export default function ExplorerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const escrowContractAddress = '29yJts3zALmvcVeYTVqzyXqzrwviZRDTGCCNzX7aLTKxYzP7TXoX6LNvR2w7nRhBWsk86dP3fMHnLvUn5TqwQVvf2ffFPrHZ1bN7hzuGgy6VS4XAmXgpZv3rGu7AA7BeQE47ASQSwLWA9UJzDh';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (txError) throw txError;

      setTransactions(txData || []);

      // Calculate stats
      const totalTransactions = txData?.length || 0;
      const totalVolume = txData?.reduce((sum, tx) => {
        return sum + (parseFloat(tx.amount_erg) / 1e9);
      }, 0) || 0;

      setStats({
        totalTransactions,
        totalVolume
      });

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amountStr: string) => {
    const amount = parseFloat(amountStr) / 1e9;
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-[var(--text-primary)]">Transaction </span>
            <span className="text-[var(--accent-cyan)]">Explorer</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
            All AgenticAiHome platform transactions are recorded on the Ergo blockchain for complete transparency.
          </p>
        </div>

        {/* Ergo Network Stats */}
        <ErgoNetworkStats />

        {/* Platform Stats */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Platform Statistics</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {stats.totalTransactions}
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Total Volume</p>
                <p className="text-2xl font-bold text-emerald-400">
                  Σ{stats.totalVolume.toFixed(2)} ERG
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Escrow Contract</p>
                <p className="text-sm font-mono text-purple-400 break-all">
                  {escrowContractAddress.slice(0, 20)}...
                </p>
                <a
                  href={`https://explorer.ergoplatform.com/en/addresses/${escrowContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent-cyan)] hover:underline"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-sm text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="text-left p-4">TX Hash</th>
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Amount (ERG)</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="p-4">
                          <a
                            href={`https://explorer.ergoplatform.com/en/transactions/${tx.tx_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent-cyan)] hover:underline font-mono text-xs"
                          >
                            {tx.tx_id.slice(0, 16)}...{tx.tx_id.slice(-8)}
                          </a>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'escrow_fund' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : tx.type === 'escrow_release'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.type === 'genesis'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {tx.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-emerald-400 font-medium">
                            Σ{formatAmount(tx.amount_erg)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300">
                          {formatDate(tx.date)}
                        </td>
                        <td className="p-4">
                          {tx.task_title ? (
                            <div>
                              <p className="text-white text-sm">{tx.task_title}</p>
                              {tx.task_id && (
                                <p className="text-gray-400 text-xs">ID: {tx.task_id}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-sm">No task</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Transactions Yet</h3>
              <p className="text-gray-400">Platform transactions will appear here as the system is used.</p>
            </div>
          )}
        </div>

        {/* Contract Info */}
        <div className="mt-8 p-6 bg-slate-800/30 border border-slate-700 rounded-lg">
          <h3 className="text-white font-medium mb-4">Smart Contract Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-gray-400 whitespace-nowrap">Escrow Contract:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--accent-cyan)] text-xs break-all">
                  {escrowContractAddress}
                </span>
                <a
                  href={`https://explorer.ergoplatform.com/en/addresses/${escrowContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-cyan)] hover:underline whitespace-nowrap"
                >
                  View →
                </a>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-gray-400 whitespace-nowrap">Protocol Treasury:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-purple-400 text-xs break-all">
                  9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK
                </span>
                <a
                  href="https://explorer.ergoplatform.com/en/addresses/9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-cyan)] hover:underline whitespace-nowrap"
                >
                  View →
                </a>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              All transactions are cryptographically secured on the Ergo blockchain. Click any transaction hash to verify on the official Ergo explorer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}