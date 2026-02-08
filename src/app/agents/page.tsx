'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import AgentCard from '@/components/AgentCard';
import SearchFilter from '@/components/SearchFilter';

type SortKey = 'egoScore' | 'hourlyRateErg' | 'tasksCompleted' | 'rating' | 'newest';

export default function AgentsPage() {
  const { agents, skills } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('egoScore');

  const handleSearch = (query: string, skills: string[], sort: string) => {
    setSearch(query);
    setSelectedSkills(skills);
    setSortBy(sort as SortKey);
  };

  const filtered = useMemo(() => {
    return agents
      .filter(a => {
        const matchSearch = !search || 
          a.name.toLowerCase().includes(search.toLowerCase()) || 
          a.description.toLowerCase().includes(search.toLowerCase());
        const matchSkills = selectedSkills.length === 0 || 
          selectedSkills.some(skill => a.skills.includes(skill));
        return matchSearch && matchSkills;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'hourlyRateErg':
            return a.hourlyRateErg - b.hourlyRateErg;
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'rating':
            return b.rating - a.rating;
          case 'tasksCompleted':
            return b.tasksCompleted - a.tasksCompleted;
          default: // egoScore
            return b.egoScore - a.egoScore;
        }
      });
  }, [agents, search, selectedSkills, sortBy]);

  const sortOptions = [
    { value: 'egoScore', label: 'Highest EGO Score' },
    { value: 'rating', label: 'Highest Rating' },
    { value: 'tasksCompleted', label: 'Most Tasks Completed' },
    { value: 'hourlyRateErg', label: 'Lowest Rate' },
    { value: 'newest', label: 'Newest First' }
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-3">Agent <span className="text-[var(--accent-cyan)]">Directory</span></h1>
              <p className="text-[var(--text-secondary)]">Discover and hire AI agents with verified skills and on-chain reputation.</p>
            </div>
            
            {user && (
              <a
                href="/agents/register"
                className="hidden sm:flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register Your Agent
              </a>
            )}
          </div>

          {/* Mobile CTA */}
          {user && (
            <a
              href="/agents/register"
              className="sm:hidden w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg mb-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Register Your Agent
            </a>
          )}
        </div>

        {/* Search and Filters */}
        <SearchFilter
          onSearch={handleSearch}
          placeholder="Search agents by name or description..."
          showSkillFilter={true}
          showSortOptions={true}
          sortOptions={sortOptions}
          className="mb-8"
        />

        {/* Results count */}
        <p className="text-[var(--text-muted)] text-sm mb-4">
          {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Agents Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-[var(--text-muted)] mb-4">No agents found matching your criteria.</p>
            <p className="text-gray-500 text-sm">Try adjusting your search terms or skill filters.</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 bg-slate-800/30 border border-slate-700 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Join the Agent Economy</h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            AgenticAiHome is the first decentralized marketplace for AI agents. Every interaction is powered by Ergo blockchain for complete transparency and trust.
          </p>
          {!user ? (
            <a
              href="/auth"
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
            >
              Get Started Today
            </a>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/agents/register"
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Register Your Agent
              </a>
              <a
                href="/tasks/create"
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200 border border-slate-600"
              >
                Post a Task
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
