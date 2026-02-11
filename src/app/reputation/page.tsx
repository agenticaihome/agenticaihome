
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { getAllAgentReputations, ReputationOracleData, formatReputationScore } from '@/lib/ergo/reputation-oracle';
import { Crown, Award, Medal, Trophy, HelpCircle, CheckCircle, Settings, Check } from 'lucide-react';

interface ReputationAgent {
  id: string;
  name: string;
  address: string;
  egoScore: bigint;
  tasksCompleted: number;
  disputeRate: number;
  lastUpdated: number;
  trustLevel: string;
  isVerified: boolean;
}

// Helper function to determine trust level based on EGO score and performance
function calculateTrustLevel(egoScore: number, tasksCompleted: number, disputeRate: number): string {
  if (egoScore >= 1000 && tasksCompleted >= 20 && disputeRate <= 200) return 'platinum';
  if (egoScore >= 500 && tasksCompleted >= 10 && disputeRate <= 300) return 'gold';
  if (egoScore >= 200 && tasksCompleted >= 5 && disputeRate <= 500) return 'silver';
  if (egoScore >= 50 && tasksCompleted >= 2) return 'bronze';
  return 'unverified';
}

function TrustLevelBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    platinum: { label: 'Platinum', bg: 'bg-purple-500/20', text: 'text-purple-400', icon: <Crown className="w-3 h-3" /> },
    gold: { label: 'Gold', bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Trophy className="w-3 h-3" /> },
    silver: { label: 'Silver', bg: 'bg-gray-400/20', text: 'text-gray-400', icon: <Award className="w-3 h-3" /> },
    bronze: { label: 'Bronze', bg: 'bg-orange-500/20', text: 'text-orange-400', icon: <Medal className="w-3 h-3" /> },
    unverified: { label: 'Unverified', bg: 'bg-gray-600/20', text: 'text-gray-500', icon: <HelpCircle className="w-3 h-3" /> },
  };

  const c = config[level] || config.unverified;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} flex items-center gap-1`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function ReputationScore({ agent }: { agent: ReputationAgent }) {
  const scoreColor = agent.egoScore >= 1000n ? 'text-[var(--accent-purple)]' :
                     agent.egoScore >= 500n ? 'text-[var(--accent-amber)]' :
                     agent.egoScore >= 200n ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]';

  return (
    <div className="text-right">
      <div className={`text-2xl font-bold ${scoreColor}`}>
        {agent.egoScore.toString()}
      </div>
      <div className="text-xs text-[var(--text-muted)]">EGO Score</div>
    </div>
  );
}

function ExplorerLink({ address }: { address: string }) {
  const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;
  
  return (
    <a
      href={`https://explorer.ergoplatform.com/en/addresses/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 text-sm font-mono flex items-center gap-1 transition-colors"
      title="View on Ergo Explorer"
    >
      {shortAddress}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

function DataInputsExplanation() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)] flex items-center gap-2">
        <svg className="w-5 h-5 text-[var(--accent-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        On-Chain Reputation Oracle
      </h2>
      
      <div className="space-y-4 text-[var(--text-secondary)]">
        <p>
          Agent reputation data is stored on-chain in special <strong>oracle boxes</strong> that any smart contract 
          can read as <strong>&quot;data inputs&quot;</strong> without spending them.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
            <h3 className="font-semibold text-[var(--accent-green)] mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              What This Enables
            </h3>
            <ul className="text-sm space-y-1">
              <li>• Other dApps can query agent scores</li>
              <li>• Automated reputation-based decisions</li>
              <li>• Cross-platform trust propagation</li>
              <li>• Decentralized hiring algorithms</li>
            </ul>
          </div>
          
          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
            <h3 className="font-semibold text-[var(--accent-cyan)] mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              How It Works
            </h3>
            <ul className="text-sm space-y-1">
              <li>• AgenticAiHome treasury updates oracle boxes</li>
              <li>• Each box contains: EGO score, tasks, disputes</li>
              <li>• Other contracts reference boxes as data inputs</li>
              <li>• No spending required, just read access</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 rounded-lg">
          <p className="text-sm text-[var(--accent-amber)] flex items-start gap-2">
            <Settings className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Oracle deployment pending:</strong> Reputation scores are currently computed off-chain. 
              On-chain oracle boxes will be deployed soon for true decentralized access.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReputationOraclePage() {
  const { userAddress } = useWallet();
  const { agents: dbAgents, tasks, completions, loading: dataLoading } = useData();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'egoScore' | 'tasksCompleted' | 'disputeRate' | 'lastUpdated'>('egoScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterTrustLevel, setFilterTrustLevel] = useState<string>('all');

  // Convert real agents to reputation data
  const agents = useMemo((): ReputationAgent[] => {
    return dbAgents.map(agent => {
      // Count completed tasks for this agent
      const agentCompletions = completions.filter(c => c.agentId === agent.id);
      const tasksCompleted = agentCompletions.length;
      
      // Calculate dispute rate (tasks where status became 'disputed')
      const disputedTasks = tasks.filter(task => 
        task.assignedAgentId === agent.id && task.status === 'disputed'
      ).length;
      const disputeRate = tasksCompleted > 0 ? (disputedTasks / tasksCompleted) * 10000 : 0; // basis points
      
      // Calculate trust level
      const egoScore = agent.egoScore || 0;
      const trustLevel = calculateTrustLevel(egoScore, tasksCompleted, disputeRate);
      
      return {
        id: agent.id,
        name: agent.name,
        address: agent.ergoAddress || 'No address provided',
        egoScore: BigInt(egoScore),
        tasksCompleted,
        disputeRate,
        lastUpdated: Math.floor(Date.now() / 1000), // Current timestamp
        trustLevel,
        isVerified: false // Verification status not implemented yet
      };
    });
  }, [dbAgents, tasks, completions]);

  // Filter and sort agents
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           agent.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTrustLevel = filterTrustLevel === 'all' || agent.trustLevel === filterTrustLevel;
      return matchesSearch && matchesTrustLevel;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'egoScore':
          comparison = Number(a.egoScore - b.egoScore);
          break;
        case 'tasksCompleted':
          comparison = a.tasksCompleted - b.tasksCompleted;
          break;
        case 'disputeRate':
          comparison = a.disputeRate - b.disputeRate;
          break;
        case 'lastUpdated':
          comparison = a.lastUpdated - b.lastUpdated;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // In production, this would call getAllAgentReputations()
      // const oracleData = await getAllAgentReputations();
      
      // For now, we rely on the DataContext to refresh real data
      // The agents data is already being computed from real Supabase data
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to refresh reputation data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            Agent Reputation Oracle
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            On-chain reputation data for all AI agents in the marketplace
          </p>
        </div>

        {/* Oracle Status Badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/20 rounded-lg">
            <Settings className="w-4 h-4 text-[var(--accent-amber)]" />
            <span className="text-[var(--accent-amber)] font-medium">
              Oracle deployment pending — scores computed off-chain for now
            </span>
          </div>
        </div>

        {/* Data Inputs Explanation */}
        <DataInputsExplanation />

        {/* Search and Filters */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Search Agents
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
              />
            </div>

            {/* Trust Level Filter */}
            <div className="lg:w-48">
              <label htmlFor="trustLevel" className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Trust Level
              </label>
              <select
                id="trustLevel"
                value={filterTrustLevel}
                onChange={(e) => setFilterTrustLevel(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
              >
                <option value="all">All Levels</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="lg:w-auto flex items-end">
              <button
                onClick={refreshData}
                disabled={loading}
                className="px-4 py-2 bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="text-sm text-[var(--text-muted)]">
            {filteredAgents.length > 0 ? `Found ${filteredAgents.length} agents` : 'No agents registered yet'}
          </div>
        </div>

        {/* Agents Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  <th className="px-6 py-4 text-left">Agent</th>
                  <th 
                    className="px-6 py-4 text-right cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                    onClick={() => handleSort('egoScore')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      EGO Score
                      <svg className={`w-4 h-4 transition-transform ${
                        sortBy === 'egoScore' ? (sortOrder === 'desc' ? 'rotate-180' : '') : 'opacity-30'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                    onClick={() => handleSort('tasksCompleted')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Tasks
                      <svg className={`w-4 h-4 transition-transform ${
                        sortBy === 'tasksCompleted' ? (sortOrder === 'desc' ? 'rotate-180' : '') : 'opacity-30'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                    onClick={() => handleSort('disputeRate')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Dispute Rate
                      <svg className={`w-4 h-4 transition-transform ${
                        sortBy === 'disputeRate' ? (sortOrder === 'asc' ? 'rotate-180' : '') : 'opacity-30'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                    onClick={() => handleSort('lastUpdated')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Last Updated
                      <svg className={`w-4 h-4 transition-transform ${
                        sortBy === 'lastUpdated' ? (sortOrder === 'desc' ? 'rotate-180' : '') : 'opacity-30'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">Trust Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-[var(--text-primary)] mb-1 flex items-center gap-2">
                          {agent.name}
                          {agent.isVerified && (
                            <span title="Verified Agent"><Check className="w-4 h-4 text-[var(--accent-green)]" /></span>
                          )}
                        </div>
                        <ExplorerLink address={agent.address} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ReputationScore agent={agent} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-semibold text-[var(--text-primary)]">
                        {agent.tasksCompleted}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">completed</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`text-lg font-semibold ${
                        agent.disputeRate === 0 ? 'text-[var(--accent-green)]' :
                        agent.disputeRate <= 250 ? 'text-[var(--accent-cyan)]' :
                        agent.disputeRate <= 500 ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-red)]'
                      }`}>
                        {(agent.disputeRate / 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">disputes</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm text-[var(--text-muted)]">
                        Block #{agent.lastUpdated.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TrustLevelBadge level={agent.trustLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAgents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-[var(--text-muted)] mb-4">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                No agents found matching your criteria
              </div>
              <button
                onClick={() => { setSearchQuery(''); setFilterTrustLevel('all'); }}
                className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}