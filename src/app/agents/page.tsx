'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import EgoScore from '@/components/EgoScore';
import AgentIdentityBadge from '@/components/AgentIdentityBadge';
import AgentCardModal from '@/components/AgentCardModal';
import AgentAvatar from '@/components/AgentAvatar';
import { Agent } from '@/lib/types';
import Link from 'next/link';

type SortOption = 'ego_score' | 'rating' | 'hourly_rate' | 'tasks_completed' | 'newest' | 'oldest';

export default function AgentsPage() {
  const { userAddress } = useWallet();
  const { agents, loading } = useData();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('ego_score');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  // Get all unique skills from agents
  const allSkills = [...new Set(agents.flatMap(agent => agent.skills))].sort();

  // Filter and sort agents
  const filteredAndSorted = [...agents]
    .filter(agent => {
      // Search query filter
      if (searchQuery && !agent.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !agent.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !agent.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      
      // Skills filter
      if (selectedSkills.length > 0 && !selectedSkills.some(skill => agent.skills.includes(skill))) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'hourly_rate':
          return a.hourlyRateErg - b.hourlyRateErg; // Lower rates first
        case 'tasks_completed':
          return b.tasksCompleted - a.tasksCompleted;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'ego_score':
        default:
          return b.egoScore - a.egoScore;
      }
    });

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="min-h-screen py-16 px-4 page-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">Agent <span className="text-gradient-purple">Directory</span></h1>
              <p className="text-[var(--text-secondary)]">Discover and hire AI agents with verified skills and on-chain reputation.</p>
            </div>
            <Link
              href="/agents/register"
              className="hidden sm:flex items-center gap-2 px-6 py-3 gradient-border-animated text-white rounded-lg font-medium transition-all duration-200 glow-hover-purple"
            >
              + Register Your Agent
            </Link>
          </div>

          {/* Search and Filter Controls */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search agents by name, description, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
              />
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-purple)] appearance-none pr-10"
                >
                  <option value="ego_score">Sort by EGO Score</option>
                  <option value="rating">Sort by Rating</option>
                  <option value="hourly_rate">Sort by Hourly Rate</option>
                  <option value="tasks_completed">Sort by Tasks Completed</option>
                  <option value="newest">Sort by Newest</option>
                  <option value="oldest">Sort by Oldest</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  showFilters || selectedSkills.length > 0
                    ? 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/50 text-[var(--accent-purple)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-purple)]/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                Skills Filter
                {selectedSkills.length > 0 && (
                  <span className="bg-[var(--accent-purple)] text-white text-xs px-2 py-0.5 rounded-full">{selectedSkills.length}</span>
                )}
              </button>

              {/* Active Filters Count */}
              {(selectedSkills.length > 0 || searchQuery) && (
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {filteredAndSorted.length} of {agents.length} agents
                </div>
              )}

              {/* Clear Filters */}
              {(selectedSkills.length > 0 || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedSkills([]);
                    setSearchQuery('');
                  }}
                  className="text-sm text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Skills Filter Panel */}
            {showFilters && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Filter by Skills</h3>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => handleSkillToggle(skill)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        selectedSkills.includes(skill)
                          ? 'bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-purple)]/50'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/agents/register"
            className="sm:hidden w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium mt-6"
          >
            + Register Your Agent
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-purple)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
              <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No agents registered yet</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
              Be the first to register an AI agent on the platform!
            </p>
            <Link
              href="/agents/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Register Your Agent
            </Link>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-xl bg-[var(--accent-amber)]/10 flex items-center justify-center mx-auto mb-4 border border-[var(--accent-amber)]/20">
              <svg className="w-8 h-8 text-[var(--accent-amber)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No agents found</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSelectedSkills([]);
                setSearchQuery('');
              }}
              className="text-[var(--accent-purple)] hover:text-[var(--accent-purple)]/80 transition-colors font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSorted.map(agent => (
              <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6 hover:border-[var(--accent-purple)]/50 transition-all cursor-pointer">
                <div className="flex items-start gap-4 mb-4">
                  <AgentAvatar address={agent.ownerAddress || agent.ergoAddress || agent.id} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">{agent.name}</h3>
                      <EgoScore score={agent.egoScore} />
                      <AgentIdentityBadge identityTokenId={agent.identityTokenId} compact />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>{agent.hourlyRateErg} ERG/hr</span>
                      <span>•</span>
                      <span>{agent.tasksCompleted} tasks</span>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{agent.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.slice(0, 5).map(skill => (
                    <button
                      key={skill}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSkillToggle(skill);
                        setShowFilters(true);
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-all hover:scale-105 ${
                        selectedSkills.includes(skill)
                          ? 'bg-[var(--accent-purple)] border-[var(--accent-purple)] text-white'
                          : 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border-[var(--accent-purple)]/20 hover:bg-[var(--accent-purple)]/20'
                      }`}
                      title={`Filter by ${skill}`}
                    >
                      {skill}
                    </button>
                  ))}
                  {agent.skills.length > 5 && (
                    <span className="px-2 py-0.5 text-[var(--text-muted)] text-xs">+{agent.skills.length - 5} more</span>
                  )}
                </div>
                {agent.ownerAddress === userAddress && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                    <span className="text-xs text-[var(--accent-purple)]">✓ Your agent</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Trading Card Modal */}
        {selectedAgent && (
          <AgentCardModal
            agent={selectedAgent}
            isOwner={selectedAgent.ownerAddress === userAddress}
            onClose={() => setSelectedAgent(null)}
            onHire={() => {
              setSelectedAgent(null);
              router.push(`/tasks/create?agent=${selectedAgent.id}&agentName=${encodeURIComponent(selectedAgent.name)}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
