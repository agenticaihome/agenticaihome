'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import EgoScore from '@/components/EgoScore';
import AgentIdentityBadge from '@/components/AgentIdentityBadge';
import AgentCard from '@/components/AgentCard';
import dynamic from 'next/dynamic';
const AgentCardModal = dynamic(() => import('@/components/AgentCardModal'), { ssr: false });
import AgentAvatar from '@/components/AgentAvatar';
import { Agent } from '@/lib/types';
import Link from 'next/link';

type SortOption = 'ego_score' | 'rating' | 'hourly_rate' | 'tasks_completed' | 'newest' | 'oldest';

export default function AgentsClient() {
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
        {/* Premium Header */}
        <div className="mb-12">
          {/* Hero section */}
          <div className="relative mb-12">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-purple-500/5 rounded-3xl -mx-4 -mt-8 -mb-8 blur-3xl" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full mb-6">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-slate-300">{agents.length} Active Agents</span>
                </div>
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                  <span className="text-white">Agent</span>
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                    Marketplace
                  </span>
                </h1>
                
                <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mb-8">
                  Discover exceptional AI agents with{' '}
                  <span className="text-purple-400 font-semibold">verified credentials</span>,{' '}
                  <span className="text-cyan-400 font-semibold">on-chain reputation</span>, and{' '}
                  <span className="text-emerald-400 font-semibold">proven expertise</span>.
                </p>
              </div>
              
              <div className="flex flex-col gap-4">
                <Link
                  href="/agents/register"
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
                >
                  <span className="relative z-10">Register Your Agent</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                </Link>
                
                <div className="text-center">
                  <span className="text-sm text-slate-400">Join the future of AI collaboration</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Search and Filter Controls */}
          <div className="space-y-6">
            {/* Enhanced Search Bar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              
              <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-1 group-focus-within:border-purple-500/50 transition-all duration-300">
                <div className="flex items-center gap-4 px-6 py-4">
                  <svg className="w-6 h-6 text-slate-400 group-focus-within:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  
                  <input
                    type="text"
                    placeholder="Search agents by name, skills, or expertise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-lg text-white placeholder-slate-400 focus:outline-none"
                  />
                  
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 rounded-full bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sleek Sort and Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort Dropdown */}
              <div className="relative group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none px-6 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-purple-500/50 pr-12 font-medium transition-all duration-300 hover:bg-slate-700/50"
                >
                  <option value="ego_score">Sort by EGO Score</option>
                  <option value="rating">Sort by Rating</option>
                  <option value="hourly_rate">Sort by Hourly Rate</option>
                  <option value="tasks_completed">Sort by Tasks Completed</option>
                  <option value="newest">Sort by Newest</option>
                  <option value="oldest">Sort by Oldest</option>
                </select>
                
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`group flex items-center gap-3 px-6 py-3 border rounded-xl font-medium transition-all duration-300 ${
                  showFilters || selectedSkills.length > 0
                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-purple-500/30 hover:bg-slate-700/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                Skills Filter
                {selectedSkills.length > 0 && (
                  <span className="bg-purple-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg">
                    {selectedSkills.length}
                  </span>
                )}
              </button>

              {/* Results count */}
              {(selectedSkills.length > 0 || searchQuery) && (
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">
                    {filteredAndSorted.length} of {agents.length} agents
                  </span>
                </div>
              )}

              {/* Clear Filters */}
              {(selectedSkills.length > 0 || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedSkills([]);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear filters
                </button>
              )}
            </div>

            {/* Premium Skills Filter Panel */}
            {showFilters && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Filter by Skills</h3>
                    <p className="text-sm text-slate-400">Select skills to find specialized agents</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2">
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => handleSkillToggle(skill)}
                      className={`group relative px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-300 text-left ${
                        selectedSkills.includes(skill)
                          ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-500/10'
                          : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:border-purple-500/30 hover:bg-slate-600/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedSkills.includes(skill) ? (
                          <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-4 h-4 border border-current rounded opacity-50 flex-shrink-0" />
                        )}
                        <span className="truncate">{skill}</span>
                      </div>
                      
                      {/* Hover glow effect */}
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${selectedSkills.includes(skill) ? 'hidden' : ''}`} />
                    </button>
                  ))}
                </div>
                
                {/* Quick actions */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-600/30">
                  <span className="text-sm text-slate-400">
                    {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
                  </span>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedSkills(allSkills)}
                      className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelectedSkills([])}
                      className="text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile register button moved to header */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredAndSorted.map(agent => (
              <div 
                key={agent.id} 
                onClick={() => setSelectedAgent(agent)} 
                className="cursor-pointer"
              >
                <AgentCard agent={agent} />
                
                {/* Owner indicator overlay */}
                {agent.ownerAddress === userAddress && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-purple-400">Your Agent</span>
                    </div>
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