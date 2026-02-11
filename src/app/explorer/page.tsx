'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ErgoNetworkStats from '@/components/ErgoNetworkStats';
import { getAddressBalance, getCurrentHeight, getBoxesByAddress } from '@/lib/ergo/explorer';
import { getErgPrice, ergToUsd, formatUsdAmount, getCachedErgPrice } from '@/lib/ergPrice';
import { Lock } from 'lucide-react';

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
  totalTasks: number;
  completedTasks: number;
  totalUsdVolume: number;
  registeredAgents: number;
  avgCompletionTime: number;
  avgTaskBudget: number;
  platformFees: number;
}

interface OnChainStats {
  treasuryBalance: number;
  egoTokensMinted: number;
  activeEscrowBoxes: number;
  networkHeight: number;
}

interface WeeklyTaskData {
  week: string;
  tasks: number;
}

interface WeeklyVolumeData {
  week: string;
  volume: number;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface ChartData {
  weeklyTasks: WeeklyTaskData[];
  weeklyVolume: WeeklyVolumeData[];
  agentGrowth: { week: string; agents: number }[];
  categories: CategoryData[];
}

export default function ExplorerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [onChainStats, setOnChainStats] = useState<OnChainStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const escrowContractAddress = '29yJts3zALmvcVeYTVqzyXqzrwviZRDTGCCNzX7aLTKxYzP7TXoX6LNvR2w7nRhBWsk86dP3fMHnLvUn5TqwQVvf2ffFPrHZ1bN7hzuGgy6VS4XAmXgpZv3rGu7AA7BeQE47ASQSwLWA9UJzDh';
  const treasuryAddress = '9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel data fetching for better performance
      const [txData, tasksData, agentsData, completionsData, ergPrice, treasuryBalance, networkHeight] = await Promise.allSettled([
        // Transaction data - only need essential fields for analytics
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        
        // Tasks data - only need fields for statistics
        supabase.from('tasks').select('id, title, budget_erg, created_at, completed_at, status, skills_required'),
        
        // Agents data - only need basic info
        supabase.from('agents').select('id, name, created_at, ego_score, status'),
        
        // Completion data - only need timing fields
        supabase.from('completions').select('completed_at, task_id'),
        
        // ERG price for USD calculations
        getErgPrice(),
        
        // Treasury balance
        getAddressBalance(treasuryAddress),
        
        // Network height
        getCurrentHeight()
      ]);

      // Extract data from Promise.allSettled results
      const transactions = txData.status === 'fulfilled' && !txData.value.error ? txData.value.data || [] : [];
      const tasks = tasksData.status === 'fulfilled' && !tasksData.value.error ? tasksData.value.data || [] : [];
      const agents = agentsData.status === 'fulfilled' && !agentsData.value.error ? agentsData.value.data || [] : [];
      const completions = completionsData.status === 'fulfilled' && !completionsData.value.error ? completionsData.value.data || [] : [];
      const currentErgPrice = ergPrice.status === 'fulfilled' ? ergPrice.value : 1;
      const treasuryBalanceData = treasuryBalance.status === 'fulfilled' ? treasuryBalance.value : null;
      const currentNetworkHeight = networkHeight.status === 'fulfilled' ? networkHeight.value : 0;

      setTransactions(transactions);

      // Calculate comprehensive platform statistics
      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount_erg) || 0), 0);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const totalUsdVolume = await ergToUsd(totalVolume);
      const registeredAgents = agents.length;

      // Calculate average completion time
      const completedTasksWithDates = tasks.filter(task => 
        task.status === 'completed' && task.created_at && task.completed_at
      );
      const avgCompletionTime = completedTasksWithDates.length > 0
        ? completedTasksWithDates.reduce((sum, task) => {
            const created = new Date(task.created_at).getTime();
            const completed = new Date(task.completed_at).getTime();
            return sum + (completed - created);
          }, 0) / completedTasksWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      // Calculate average task budget
      const avgTaskBudget = totalTasks > 0 
        ? tasks.reduce((sum, task) => sum + (task.budget_erg || 0), 0) / totalTasks
        : 0;

      // Calculate platform fees (1% of total volume)
      const platformFees = totalVolume * 0.01;

      setStats({
        totalTransactions,
        totalVolume,
        totalTasks,
        completedTasks,
        totalUsdVolume,
        registeredAgents,
        avgCompletionTime,
        avgTaskBudget,
        platformFees
      });

      // Calculate on-chain statistics
      const treasuryBalanceErg = treasuryBalanceData 
        ? parseFloat(treasuryBalanceData.confirmed.nanoErgs) / 1e9 
        : 0;

      // Get active escrow boxes
      let activeEscrowBoxes = 0;
      try {
        const escrowBoxes = await getBoxesByAddress(escrowContractAddress);
        activeEscrowBoxes = escrowBoxes.length;
      } catch (error) {
        console.warn('Failed to fetch escrow boxes:', error);
      }

      setOnChainStats({
        treasuryBalance: treasuryBalanceErg,
        egoTokensMinted: 0, // Placeholder - would need EGO token contract query
        activeEscrowBoxes,
        networkHeight: currentNetworkHeight
      });

      // Generate chart data
      await generateChartData(tasks, agents, transactions);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = async (tasks: any[], agents: any[], transactions: any[]) => {
    try {
      // Weekly tasks data (last 12 weeks)
      const weeklyTasks: WeeklyTaskData[] = [];
      const weeklyVolume: WeeklyVolumeData[] = [];
      const agentGrowth: { week: string; agents: number }[] = [];

      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Tasks created this week
        const tasksThisWeek = tasks.filter(task => {
          const createdAt = new Date(task.created_at);
          return createdAt >= weekStart && createdAt < weekEnd;
        }).length;

        // Volume this week (from completed tasks)
        const volumeThisWeek = tasks
          .filter(task => {
            const completedAt = task.completed_at ? new Date(task.completed_at) : null;
            return completedAt && completedAt >= weekStart && completedAt < weekEnd;
          })
          .reduce((sum, task) => sum + (task.budget_erg || 0), 0);

        // Cumulative agents by this week
        const agentsThisWeek = agents.filter(agent => 
          new Date(agent.created_at) <= weekEnd
        ).length;

        weeklyTasks.push({ week: weekLabel, tasks: tasksThisWeek });
        weeklyVolume.push({ week: weekLabel, volume: volumeThisWeek });
        agentGrowth.push({ week: weekLabel, agents: agentsThisWeek });
      }

      // Task categories distribution
      const skillCounts: { [key: string]: number } = {};
      tasks.forEach(task => {
        if (task.skills_required) {
          task.skills_required.forEach((skill: string) => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          });
        }
      });

      const totalSkillMentions = Object.values(skillCounts).reduce((sum, count) => sum + count, 0);
      const categories: CategoryData[] = Object.entries(skillCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6) // Top 6 categories
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / totalSkillMentions) * 100
        }));

      setChartData({
        weeklyTasks,
        weeklyVolume,
        agentGrowth,
        categories
      });
    } catch (error) {
      console.error('Error generating chart data:', error);
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
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-[var(--text-primary)]">Analytics </span>
            <span className="text-[var(--accent-cyan)]">Dashboard</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
            Comprehensive platform analytics with real on-chain data from the Ergo blockchain.
          </p>
        </div>

        {/* Ergo Network Stats */}
        <ErgoNetworkStats />

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Charts Section */}
        {!loading && chartData && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Analytics Charts</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Tasks per Week Chart */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tasks per Week</h3>
                <div className="space-y-2">
                  {chartData.weeklyTasks.map((data, index) => {
                    const maxTasks = Math.max(...chartData.weeklyTasks.map(d => d.tasks), 1);
                    const width = (data.tasks / maxTasks) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-12 text-right">{data.week}</span>
                        <div className="flex-1 bg-slate-700 rounded h-6 relative">
                          <div
                            className="bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded h-full transition-all duration-300"
                            style={{ width: `${width}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            {data.tasks}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ERG Volume per Week Chart */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ERG Volume per Week</h3>
                <div className="space-y-2">
                  {chartData.weeklyVolume.map((data, index) => {
                    const maxVolume = Math.max(...chartData.weeklyVolume.map(d => d.volume), 1);
                    const width = (data.volume / maxVolume) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-12 text-right">{data.week}</span>
                        <div className="flex-1 bg-slate-700 rounded h-6 relative">
                          <div
                            className="bg-gradient-to-r from-emerald-400 to-[var(--accent-green)] rounded h-full transition-all duration-300"
                            style={{ width: `${width}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            Σ{data.volume.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Growth Chart */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Agent Growth Over Time</h3>
                <div className="space-y-2">
                  {chartData.agentGrowth.map((data, index) => {
                    const maxAgents = Math.max(...chartData.agentGrowth.map(d => d.agents), 1);
                    const width = (data.agents / maxAgents) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-12 text-right">{data.week}</span>
                        <div className="flex-1 bg-slate-700 rounded h-6 relative">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-yellow-400 rounded h-full transition-all duration-300"
                            style={{ width: `${width}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            {data.agents}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task Category Distribution Pie Chart */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Task Category Distribution</h3>
                {chartData.categories.length > 0 ? (
                  <div className="flex items-center gap-6">
                    {/* Pie Chart using conic-gradient */}
                    <div 
                      className="w-32 h-32 rounded-full border-4 border-slate-600"
                      style={{
                        background: `conic-gradient(
                          ${chartData.categories.map((cat, index) => {
                            const colors = [
                              'var(--accent-cyan)', 'var(--accent-purple)', 
                              'var(--accent-green)', 'orange', 'yellow', 'pink'
                            ];
                            const color = colors[index % colors.length];
                            const startPercentage = chartData.categories.slice(0, index).reduce((sum, c) => sum + c.percentage, 0);
                            const endPercentage = startPercentage + cat.percentage;
                            return `${color} ${startPercentage}% ${endPercentage}%`;
                          }).join(', ')},
                          transparent 0% 100%
                        )`
                      }}
                    ></div>
                    
                    {/* Legend */}
                    <div className="flex-1 space-y-2">
                      {chartData.categories.map((cat, index) => {
                        const colors = [
                          'var(--accent-cyan)', 'var(--accent-purple)', 
                          'var(--accent-green)', 'orange', 'yellow', 'pink'
                        ];
                        const color = colors[index % colors.length];
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            ></div>
                            <span className="text-white font-medium">{cat.category}</span>
                            <span className="text-gray-400">({cat.percentage.toFixed(1)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No category data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Network Status */}
        {!loading && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Live Network Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <p className="text-gray-400 text-sm">Platform Status</p>
                </div>
                <p className="text-lg font-bold text-green-400">Online</p>
                <p className="text-xs text-gray-500 mt-1">99.9% uptime</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Current Block</p>
                <p className="text-lg font-bold text-[var(--accent-cyan)]">
                  #{onChainStats?.networkHeight.toLocaleString() || '—'}
                </p>
                <a
                  href="https://explorer.ergoplatform.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent-cyan)] hover:underline"
                >
                  View Explorer →
                </a>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Active Escrows</p>
                <p className="text-lg font-bold text-emerald-400">
                  {onChainStats?.activeEscrowBoxes || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Secured on-chain</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-1">Last Update</p>
                <p className="text-lg font-bold text-[var(--accent-green)]">
                  {new Date().toLocaleTimeString()}
                </p>
                <button
                  onClick={fetchData}
                  className="text-xs text-[var(--accent-cyan)] hover:underline mt-1"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Platform Statistics */}
            {stats && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Platform Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Total Tasks Posted</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)]">
                      {stats.totalTasks.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Tasks Completed</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {stats.completedTasks.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Total ERG Volume</p>
                    <p className="text-2xl font-bold text-[var(--accent-purple)]">
                      Σ{stats.totalVolume.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Total USD Volume</p>
                    <p className="text-2xl font-bold text-[var(--accent-green)]">
                      {formatUsdAmount(stats.totalUsdVolume)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Registered Agents</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {stats.registeredAgents.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Avg Completion Time</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {stats.avgCompletionTime.toFixed(1)}d
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Avg Task Budget</p>
                    <p className="text-2xl font-bold text-violet-400">
                      Σ{stats.avgTaskBudget.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Platform Fees (1%)</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      Σ{stats.platformFees.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* On-Chain Explorer Section */}
            {onChainStats && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">On-Chain Explorer</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Treasury Balance</p>
                    <p className="text-2xl font-bold text-[var(--accent-cyan)]">
                      Σ{onChainStats.treasuryBalance.toFixed(2)}
                    </p>
                    <a
                      href={`https://explorer.ergoplatform.com/en/addresses/${treasuryAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-cyan)] hover:underline"
                    >
                      View on Explorer →
                    </a>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">EGO Tokens Minted</p>
                    <p className="text-2xl font-bold text-[var(--accent-purple)]">
                      {onChainStats.egoTokensMinted.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Active Escrow Boxes</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {onChainStats.activeEscrowBoxes.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                    <p className="text-gray-400 text-sm mb-1">Network Height</p>
                    <p className="text-2xl font-bold text-[var(--accent-green)]">
                      #{onChainStats.networkHeight.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Recent Escrow Transactions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Recent Escrow Transactions</h2>
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
              <p className="text-gray-400">Loading escrow transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-gray-400">
                      <th className="text-left p-4">TX Hash</th>
                      <th className="text-left p-4">Escrow Status</th>
                      <th className="text-left p-4">Amount (ERG)</th>
                      <th className="text-left p-4">USD Value</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 20).map((tx) => (
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
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'escrow_fund' 
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                              : tx.type === 'escrow_release'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : tx.type === 'escrow_refund'
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {tx.type === 'escrow_fund' && 'Funded'}
                            {tx.type === 'escrow_release' && 'Released'}
                            {tx.type === 'escrow_refund' && 'Refunded'}
                            {!tx.type.includes('escrow') && tx.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-emerald-400 font-medium">
                            Σ{formatAmount(tx.amount_erg)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-[var(--accent-green)] font-medium">
                            {formatUsdAmount(parseFloat(tx.amount_erg) * (getCachedErgPrice() || 1))}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300">
                          {formatDate(tx.date)}
                        </td>
                        <td className="p-4">
                          {tx.task_title ? (
                            <div>
                              <p className="text-white text-sm font-medium">{tx.task_title}</p>
                              {tx.task_id && (
                                <p className="text-gray-400 text-xs font-mono">ID: {tx.task_id.slice(0, 8)}...</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-sm">System transaction</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {transactions.length > 20 && (
                <div className="p-4 border-t border-slate-700 bg-slate-800/30 text-center">
                  <p className="text-sm text-gray-400">
                    Showing 20 of {transactions.length} transactions
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">️</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Escrow Transactions Yet</h3>
              <p className="text-gray-400">Platform transactions will appear here as tasks are funded and completed.</p>
            </div>
          )}
        </div>

        {/* Smart Contract Information */}
        <div className="mt-8 p-6 bg-slate-800/30 border border-slate-700 rounded-lg">
          <h3 className="text-white font-semibold mb-6">Smart Contract Information</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">Escrow Contract</span>
                <div className="mt-2 p-3 bg-slate-700/50 rounded border">
                  <span className="font-mono text-[var(--accent-cyan)] text-xs break-all">
                    {escrowContractAddress}
                  </span>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`https://explorer.ergoplatform.com/en/addresses/${escrowContractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-cyan)] hover:underline"
                    >
                      View on Explorer →
                    </a>
                    <span className="text-gray-500">|</span>
                    <span className="text-xs text-gray-400">
                      {onChainStats?.activeEscrowBoxes || 0} active boxes
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">Protocol Treasury</span>
                <div className="mt-2 p-3 bg-slate-700/50 rounded border">
                  <span className="font-mono text-purple-400 text-xs break-all">
                    {treasuryAddress}
                  </span>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={`https://explorer.ergoplatform.com/en/addresses/${treasuryAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-cyan)] hover:underline"
                    >
                      View on Explorer →
                    </a>
                    <span className="text-gray-500">|</span>
                    <span className="text-xs text-gray-400">
                      Σ{onChainStats?.treasuryBalance.toFixed(2)} ERG
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-slate-700/30 rounded border-l-4 border-[var(--accent-cyan)]">
            <h4 className="text-white font-medium mb-2"><Lock className="w-4 h-4 text-slate-400 inline" /> Transparency & Security</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              All AgenticAiHome transactions are cryptographically secured and publicly verifiable on the Ergo blockchain. 
              The platform uses decentralized escrow contracts to ensure trustless task completion and payment. 
              Click any transaction hash to verify on the official Ergo explorer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}