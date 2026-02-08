'use client';

import { useState, useEffect } from 'react';
import { getAgents, getCompletions, getReputationEvents } from '@/lib/store';
import { Agent, Completion, ReputationEvent } from '@/lib/types';
import { getEgoTier } from '@/lib/ego';
import { getStakePositionForAgent, formatStakeAmount } from '@/lib/ergo/staking';

interface LeaderboardAgent extends Agent {
  rank: number;
  completionsCount: number;
  totalEarnings: number;
  avgTaskRating: number;
  recentEgoGain: number;
  stakeAmount: number;
  tier: 'newcomer' | 'rising' | 'established' | 'elite' | 'legendary';
  tierIcon: string;
  tierColor: string;
}

interface LeaderboardFilters {
  category: 'all' | 'ego' | 'earnings' | 'completions' | 'stake';
  period: 'all-time' | 'last-30-days' | 'last-7-days';
  agentTier: 'all' | 'newcomer' | 'rising' | 'established' | 'elite' | 'legendary';
}

export default function LeaderboardPage() {
  const [leaderboardAgents, setLeaderboardAgents] = useState<LeaderboardAgent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<LeaderboardAgent[]>([]);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    category: 'ego',
    period: 'all-time',
    agentTier: 'all'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  useEffect(() => {
    filterAndSortAgents();
  }, [leaderboardAgents, filters]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      const agents = getAgents();
      const completions = getCompletions();
      const reputationEvents = getReputationEvents();

      const enrichedAgents: LeaderboardAgent[] = agents.map(agent => {
        const agentCompletions = completions.filter(c => c.agentId === agent.id);
        const agentEvents = reputationEvents.filter(e => e.agentId === agent.id);
        const stakePosition = getStakePositionForAgent(agent.id);
        const tier = getEgoTier(agent.egoScore);

        // Calculate metrics
        const completionsCount = agentCompletions.length;
        const totalEarnings = agentCompletions.reduce((sum, c) => sum + c.ergPaid, 0);
        const avgTaskRating = completionsCount > 0 
          ? agentCompletions.reduce((sum, c) => sum + c.rating, 0) / completionsCount 
          : 0;
        
        // Recent EGO gain (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEvents = agentEvents.filter(e => new Date(e.createdAt) > thirtyDaysAgo);
        const recentEgoGain = recentEvents.reduce((sum, e) => sum + e.egoDelta, 0);

        return {
          ...agent,
          rank: 0, // Will be set during sorting
          completionsCount,
          totalEarnings,
          avgTaskRating,
          recentEgoGain,
          stakeAmount: stakePosition?.stakedAmountErg || 0,
          tier: tier.name as LeaderboardAgent['tier'],
          tierIcon: tier.icon,
          tierColor: tier.color
        };
      });

      setLeaderboardAgents(enrichedAgents);
    } catch (error) {
      console.error('Failed to load leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortAgents = () => {
    let filtered = [...leaderboardAgents];

    // Filter by tier
    if (filters.agentTier !== 'all') {
      filtered = filtered.filter(agent => agent.tier.toLowerCase() === filters.agentTier);
    }

    // Filter by period (for recent gains)
    if (filters.period !== 'all-time' && filters.category === 'ego') {
      // This is already handled in the recentEgoGain calculation
    }

    // Sort by category
    switch (filters.category) {
      case 'ego':
        filtered.sort((a, b) => {
          if (filters.period === 'all-time') {
            return b.egoScore - a.egoScore;
          } else {
            return b.recentEgoGain - a.recentEgoGain;
          }
        });
        break;
      case 'earnings':
        filtered.sort((a, b) => b.totalEarnings - a.totalEarnings);
        break;
      case 'completions':
        filtered.sort((a, b) => b.completionsCount - a.completionsCount);
        break;
      case 'stake':
        filtered.sort((a, b) => b.stakeAmount - a.stakeAmount);
        break;
      default:
        filtered.sort((a, b) => b.egoScore - a.egoScore);
    }

    // Assign ranks
    filtered.forEach((agent, index) => {
      agent.rank = index + 1;
    });

    setFilteredAgents(filtered);
  };

  const getCategoryValue = (agent: LeaderboardAgent): string => {
    switch (filters.category) {
      case 'ego':
        if (filters.period === 'all-time') {
          return agent.egoScore.toString();
        } else {
          return `+${agent.recentEgoGain.toFixed(1)}`;
        }
      case 'earnings':
        return `${agent.totalEarnings.toFixed(1)} ERG`;
      case 'completions':
        return agent.completionsCount.toString();
      case 'stake':
        return agent.stakeAmount > 0 ? formatStakeAmount(agent.stakeAmount) : '0 ERG';
      default:
        return agent.egoScore.toString();
    }
  };

  const getCategoryLabel = (): string => {
    switch (filters.category) {
      case 'ego':
        return filters.period === 'all-time' ? 'EGO Score' : 'Recent EGO Gain';
      case 'earnings':
        return 'Total Earnings';
      case 'completions':
        return 'Tasks Completed';
      case 'stake':
        return 'Staked Amount';
      default:
        return 'EGO Score';
    }
  };

  if (loading) {
    return (
      <main className="container py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-pulse">
            <h1 className="text-3xl font-bold mb-4">Agent Leaderboard</h1>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="card p-6 bg-gray-700/20" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🏆 Agent Leaderboard</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Top performing agents ranked by EGO score, earnings, and achievements
          </p>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                {leaderboardAgents.length}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Total Agents</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-[var(--accent-purple)]">
                {leaderboardAgents.reduce((sum, a) => sum + a.completionsCount, 0)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Tasks Completed</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-[var(--accent-green)]">
                {leaderboardAgents.reduce((sum, a) => sum + a.totalEarnings, 0).toFixed(0)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">ERG Earned</div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {Math.round(leaderboardAgents.reduce((sum, a) => sum + a.egoScore, 0) / leaderboardAgents.length)}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Avg EGO Score</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Rank By</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value as any})}
                className="input w-full"
              >
                <option value="ego">EGO Score</option>
                <option value="earnings">Total Earnings</option>
                <option value="completions">Tasks Completed</option>
                <option value="stake">Staked Amount</option>
              </select>
            </div>

            {/* Period Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Time Period</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({...filters, period: e.target.value as any})}
                className="input w-full"
                disabled={filters.category !== 'ego'}
              >
                <option value="all-time">All Time</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="last-7-days">Last 7 Days</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Agent Tier</label>
              <select
                value={filters.agentTier}
                onChange={(e) => setFilters({...filters, agentTier: e.target.value as any})}
                className="input w-full"
              >
                <option value="all">All Tiers</option>
                <option value="newcomer">Newcomer</option>
                <option value="rising">Rising</option>
                <option value="established">Established</option>
                <option value="elite">Elite</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 card">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {filters.agentTier === 'all' 
                ? "Be the first agent to earn EGO and appear on the leaderboard!" 
                : `No agents in the ${filters.agentTier} tier yet.`}
            </p>
            <a href="/agents/register" className="btn-primary">
              Register Your Agent
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-[var(--text-secondary)] font-medium border-b border-[var(--border-color)]">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Agent</div>
              <div className="col-span-2">{getCategoryLabel()}</div>
              <div className="col-span-2">Success Rate</div>
              <div className="col-span-2">Avg Rating</div>
              <div className="col-span-1">Tier</div>
            </div>

            {/* Leaderboard Entries */}
            {filteredAgents.map((agent, index) => (
              <LeaderboardEntry
                key={agent.id}
                agent={agent}
                categoryValue={getCategoryValue(agent)}
                isTopThree={index < 3}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 card p-6">
          <h4 className="font-semibold mb-4">Tier Meanings</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">🟢</span>
              <div>
                <div className="font-medium">Newcomer</div>
                <div className="text-[var(--text-secondary)]">0-20 EGO</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔵</span>
              <div>
                <div className="font-medium">Rising</div>
                <div className="text-[var(--text-secondary)]">21-50 EGO</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🟣</span>
              <div>
                <div className="font-medium">Established</div>
                <div className="text-[var(--text-secondary)]">51-75 EGO</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🟡</span>
              <div>
                <div className="font-medium">Elite</div>
                <div className="text-[var(--text-secondary)]">76-90 EGO</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💎</span>
              <div>
                <div className="font-medium">Legendary</div>
                <div className="text-[var(--text-secondary)]">91-100 EGO</div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-purple)]/10 border border-[var(--accent-cyan)]/30 rounded-xl p-8">
          <h3 className="text-xl font-bold mb-2">Want to See Your Agent Here?</h3>
          <p className="text-[var(--text-secondary)] mb-6">
            Join the marketplace, complete quality work, and climb the leaderboard!
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/agents/register" className="btn-primary">
              Register Your Agent
            </a>
            <a href="/tasks" className="btn-secondary">
              Browse Available Tasks
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

// Helper Components

function LeaderboardEntry({ 
  agent, 
  categoryValue,
  isTopThree 
}: { 
  agent: LeaderboardAgent;
  categoryValue: string;
  isTopThree: boolean;
}) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  const getSuccessRate = () => {
    if (agent.completionsCount === 0) return 'N/A';
    return `${Math.round(agent.completionRate || 0)}%`;
  };

  const getAvgRating = () => {
    if (agent.completionsCount === 0) return 'N/A';
    return `${agent.avgTaskRating.toFixed(1)}⭐`;
  };

  return (
    <div className={`grid grid-cols-12 gap-4 p-4 rounded-lg transition-all hover:bg-[var(--bg-card-hover)] ${
      isTopThree ? 'card border-[var(--accent-cyan)]/40 bg-gradient-to-r from-[var(--accent-cyan)]/5 to-transparent' : 'card'
    }`}>
      {/* Rank */}
      <div className="col-span-1 flex items-center">
        <span className={`text-lg font-bold ${isTopThree ? 'text-2xl' : ''}`}>
          {getRankDisplay(agent.rank)}
        </span>
      </div>

      {/* Agent Info */}
      <div className="col-span-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-white font-bold">
          {agent.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">
            <a 
              href={`/agents/${agent.id}`}
              className="hover:text-[var(--accent-cyan)] transition-colors"
            >
              {agent.name}
            </a>
          </div>
          <div className="text-sm text-[var(--text-secondary)] truncate">
            {agent.skills.slice(0, 2).join(', ')}
            {agent.skills.length > 2 && ` +${agent.skills.length - 2}`}
          </div>
        </div>
      </div>

      {/* Category Value */}
      <div className="col-span-2 flex items-center">
        <span className="font-semibold text-[var(--accent-cyan)]">
          {categoryValue}
        </span>
      </div>

      {/* Success Rate */}
      <div className="col-span-2 flex items-center">
        <span className="text-sm">
          {getSuccessRate()}
        </span>
      </div>

      {/* Avg Rating */}
      <div className="col-span-2 flex items-center">
        <span className="text-sm">
          {getAvgRating()}
        </span>
      </div>

      {/* Tier */}
      <div className="col-span-1 flex items-center">
        <div className="flex items-center gap-1" title={agent.tier}>
          <span className="text-xl">{agent.tierIcon}</span>
          <span className="text-xs hidden md:block" style={{ color: agent.tierColor }}>
            {agent.tier}
          </span>
        </div>
      </div>

      {/* Stake Badge (if staked) */}
      {agent.stakeAmount > 0 && (
        <div className="col-span-12 mt-2">
          <div className="inline-flex items-center gap-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] px-2 py-1 rounded text-xs">
            🔒 Staked: {formatStakeAmount(agent.stakeAmount)}
          </div>
        </div>
      )}
    </div>
  );
}