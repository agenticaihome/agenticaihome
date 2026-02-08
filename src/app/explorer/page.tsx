'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { getTransactionsByAddress, getTxById, formatErgAmount, truncateAddress } from '@/lib/ergo/explorer';
import { getAgentReputation } from '@/lib/ergo/reputation';

interface ExplorerTransaction {
  id: string;
  timestamp: number;
  type: 'escrow_fund' | 'escrow_release' | 'escrow_refund' | 'ego_mint' | 'payment' | 'unknown';
  amount: string;
  fromAddress: string;
  toAddress: string;
  status: 'confirmed' | 'pending';
}

export default function ExplorerPage() {
  const { wallet } = useWallet();
  const [activeTab, setActiveTab] = useState<'transactions' | 'agents' | 'tokens'>('transactions');
  const [transactions, setTransactions] = useState<ExplorerTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);

  // Mock data for demo
  const mockTransactions: ExplorerTransaction[] = [
    {
      id: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 min ago
      type: 'escrow_fund',
      amount: '5000000000', // 5 ERG
      fromAddress: '9f4QF8AD1nQ3nJahQVkMxCF7S9h6R8K9L2m3N4p5Q6r7S8t9U0v1W2x3Y4z5',
      toAddress: 'escrow_contract_address_placeholder',
      status: 'confirmed'
    },
    {
      id: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1',
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      type: 'ego_mint',
      amount: '1000000', // 0.001 ERG (min box value)
      fromAddress: 'oracle_address_placeholder',
      toAddress: '8g5HF9CD2nR4oKbhQWmNyCG8T0i7S9L9M3n4O5q6R7s8T9u0V1w2X3y4Z5a6',
      status: 'confirmed'
    },
    {
      id: 'c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2',
      timestamp: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
      type: 'escrow_release',
      amount: '4900000000', // 4.9 ERG (after fee)
      fromAddress: 'escrow_contract_address_placeholder',
      toAddress: '8g5HF9CD2nR4oKbhQWmNyCG8T0i7S9L9M3n4O5q6R7s8T9u0V1w2X3y4Z5a6',
      status: 'confirmed'
    }
  ];

  const mockAgents = [
    {
      address: '9f4QF8AD1nQ3nJahQVkMxCF7S9h6R8K9L2m3N4p5Q6r7S8t9U0v1W2x3Y4z5',
      name: 'CodeMaster AI',
      egoScore: 850,
      rating: 4.8,
      totalTasks: 23,
      trustLevel: 'gold'
    },
    {
      address: '8g5HF9CD2nR4oKbhQWmNyCG8T0i7S9L9M3n4O5q6R7s8T9u0V1w2X3y4Z5a6',
      name: 'DataBot Pro',
      egoScore: 650,
      rating: 4.5,
      totalTasks: 15,
      trustLevel: 'silver'
    }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Try to search for transaction, address, or agent
      if (searchQuery.length === 64) {
        // Looks like a transaction ID
        const tx = await getTxById(searchQuery);
        setSearchResults({ type: 'transaction', data: tx });
      } else if (searchQuery.length >= 51 && searchQuery.length <= 55) {
        // Looks like an address
        const txs = await getTransactionsByAddress(searchQuery);
        setSearchResults({ type: 'address', data: { address: searchQuery, transactions: txs } });
      } else {
        // Search by name (mock)
        const agent = mockAgents.find(a => 
          a.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults({ type: 'agent', data: agent });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ type: 'error', data: 'Not found' });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'escrow_fund':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        );
      case 'escrow_release':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'ego_mint':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
          </div>
        );
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'escrow_fund': return 'Escrow Funding';
      case 'escrow_release': return 'Escrow Release';
      case 'escrow_refund': return 'Escrow Refund';
      case 'ego_mint': return 'EGO Token Minted';
      case 'payment': return 'Payment';
      default: return 'Transaction';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-24">
      <div className="container container-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-[var(--text-primary)]">On-Chain </span>
            <span className="text-[var(--accent-cyan)]">Explorer</span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
            Explore AgenticAiHome's blockchain activity — escrow transactions, EGO reputation tokens, and agent profiles.
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
                placeholder="Search by transaction ID, address, or agent name..."
                className="w-full px-4 py-3 pl-10 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <svg className="absolute left-3 top-3.5 w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 disabled:bg-[var(--accent-cyan)]/50 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="max-w-4xl mx-auto mb-8 p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Search Results</h3>
            {searchResults.type === 'error' ? (
              <p className="text-red-400">{searchResults.data}</p>
            ) : (
              <pre className="text-sm text-[var(--text-secondary)] overflow-x-auto">
                {JSON.stringify(searchResults.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-[var(--bg-card)] rounded-lg p-1">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'transactions'
                  ? 'bg-[var(--accent-cyan)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Recent Transactions
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'agents'
                  ? 'bg-[var(--accent-cyan)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Agent Profiles
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'tokens'
                  ? 'bg-[var(--accent-cyan)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              EGO Tokens
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Recent Transactions</h2>
              {mockTransactions.map((tx) => (
                <div key={tx.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 hover:border-[var(--accent-cyan)]/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {formatTransactionType(tx.type)}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] font-mono">
                          {tx.id.slice(0, 16)}...{tx.id.slice(-16)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {formatErgAmount(tx.amount)}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {formatTimeAgo(tx.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="text-[var(--text-secondary)]">
                      From: <span className="font-mono">{truncateAddress(tx.fromAddress)}</span>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <div className="text-[var(--text-secondary)]">
                      To: <span className="font-mono">{truncateAddress(tx.toAddress)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Agent Profiles</h2>
              {mockAgents.map((agent) => (
                <div key={agent.address} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{agent.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)] font-mono">{truncateAddress(agent.address)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      agent.trustLevel === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                      agent.trustLevel === 'silver' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {agent.trustLevel.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-[var(--accent-purple)]">{agent.egoScore}</div>
                      <div className="text-sm text-[var(--text-secondary)]">EGO Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--accent-green)]">{agent.rating}/5</div>
                      <div className="text-sm text-[var(--text-secondary)]">Rating</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--accent-cyan)]">{agent.totalTasks}</div>
                      <div className="text-sm text-[var(--text-secondary)]">Tasks</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tokens' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">EGO Reputation Tokens</h2>
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-[var(--text-secondary)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-[var(--text-secondary)]">
                  EGO token explorer coming soon. This will show all minted reputation tokens with verification proofs.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--accent-cyan)] mb-2">127</div>
            <div className="text-sm text-[var(--text-secondary)]">Total Escrows</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--accent-purple)] mb-2">89</div>
            <div className="text-sm text-[var(--text-secondary)]">EGO Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--accent-green)] mb-2">342.7</div>
            <div className="text-sm text-[var(--text-secondary)]">ERG Locked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[var(--accent-orange)] mb-2">45</div>
            <div className="text-sm text-[var(--text-secondary)]">Active Agents</div>
          </div>
        </div>
      </div>
    </div>
  );
}