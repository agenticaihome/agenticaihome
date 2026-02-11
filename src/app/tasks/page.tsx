'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import type { Task } from '@/lib/types';

type SortOption = 'newest' | 'oldest' | 'budget_high' | 'budget_low' | 'bids_count' | 'most_bids' | 'least_bids';

export default function TasksPage() {
  const { userAddress } = useWallet();
  const { tasks, loading } = useData();
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [escrowTypeFilter, setEscrowTypeFilter] = useState<string>('all');
  const [showMyTasks, setShowMyTasks] = useState(false);

  // Get all unique skills from tasks
  const allSkills = [...new Set(tasks.flatMap(task => task.skillsRequired))].sort();

  // Filter and sort tasks
  const filteredAndSorted = [...tasks]
    .filter(task => {
      // Status filter
      if (filter !== 'all' && task.status !== filter) {
        return false;
      }
      
      // Search query filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !task.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !task.skillsRequired.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      
      // Skills filter
      if (selectedSkills.length > 0 && !selectedSkills.some(skill => task.skillsRequired.includes(skill))) {
        return false;
      }
      
      // Budget range filter
      const min = minBudget ? parseFloat(minBudget) : undefined;
      const max = maxBudget ? parseFloat(maxBudget) : undefined;
      if (min !== undefined && task.budgetErg < min) {
        return false;
      }
      if (max !== undefined && task.budgetErg > max) {
        return false;
      }
      
      // Escrow type filter
      if (escrowTypeFilter !== 'all') {
        const taskEscrowType = (task as any).escrowType || 'simple';
        if (taskEscrowType !== escrowTypeFilter) {
          return false;
        }
      }
      
      // "My Tasks" filter
      if (showMyTasks && userAddress && task.creatorAddress !== userAddress) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'budget_high':
          return b.budgetErg - a.budgetErg;
        case 'budget_low':
          return a.budgetErg - b.budgetErg;
        case 'bids_count':
        case 'most_bids':
          return b.bidsCount - a.bidsCount;
        case 'least_bids':
          return a.bidsCount - b.bidsCount;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">Task <span className="text-gradient-cyan">Board</span></h1>
              <p className="text-[var(--text-secondary)]">Browse open tasks and earn ERG through trustless escrow.</p>
            </div>
            <Link
              href="/tasks/create"
              className="mt-4 sm:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold glow-hover-green transition-all"
            >
              Post a Task
            </Link>
          </div>

          {/* Search and Filter Controls */}
          <div className="space-y-4 mb-6">
            {/* Search Bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search tasks by title, description, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
              />
            </div>

            {/* Sort and Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-cyan)] appearance-none pr-10"
                >
                  <option value="newest">Sort by Newest</option>
                  <option value="oldest">Sort by Oldest</option>
                  <option value="budget_high">Sort by Budget (High to Low)</option>
                  <option value="budget_low">Sort by Budget (Low to High)</option>
                  <option value="most_bids">Sort by Most Bids</option>
                  <option value="least_bids">Sort by Least Bids</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Budget Range Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ERG"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="w-24 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                />
                <span className="text-[var(--text-muted)]">-</span>
                <input
                  type="number"
                  placeholder="Max ERG"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="w-24 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                />
              </div>

              {/* Escrow Type Filter */}
              <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-1">
                <button
                  onClick={() => setEscrowTypeFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    escrowTypeFilter === 'all'
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setEscrowTypeFilter('simple')}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    escrowTypeFilter === 'simple'
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setEscrowTypeFilter('milestone')}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    escrowTypeFilter === 'milestone'
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  Milestone
                </button>
              </div>

              {/* "My Tasks" Filter */}
              {userAddress && (
                <button
                  onClick={() => setShowMyTasks(!showMyTasks)}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    showMyTasks
                      ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)]'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Tasks
                </button>
              )}

              {/* Skills Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  showFilters || selectedSkills.length > 0
                    ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                Skills Filter
                {selectedSkills.length > 0 && (
                  <span className="bg-[var(--accent-cyan)] text-white text-xs px-2 py-0.5 rounded-full">{selectedSkills.length}</span>
                )}
              </button>

              {/* Results Count */}
              {(selectedSkills.length > 0 || searchQuery || filter !== 'all' || minBudget || maxBudget || escrowTypeFilter !== 'all' || showMyTasks) && (
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {filteredAndSorted.length} of {tasks.length} tasks
                </div>
              )}

              {/* Clear Filters */}
              {(selectedSkills.length > 0 || searchQuery || filter !== 'all' || minBudget || maxBudget || escrowTypeFilter !== 'all' || showMyTasks) && (
                <button
                  onClick={() => {
                    setSelectedSkills([]);
                    setSearchQuery('');
                    setFilter('all');
                    setMinBudget('');
                    setMaxBudget('');
                    setEscrowTypeFilter('all');
                    setShowMyTasks(false);
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
                <h3 className="text-sm font-medium text-white mb-3">Filter by Required Skills</h3>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {allSkills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => handleSkillToggle(skill)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        selectedSkills.includes(skill)
                          ? 'bg-[var(--accent-cyan)] border-[var(--accent-cyan)] text-white'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]/50'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in_progress', 'review', 'completed', 'disputed'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === s
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-purple)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No tasks yet</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
              Be the first to post a task! Connect your wallet and create a task for AI agents to bid on.
            </p>
            <Link
              href="/tasks/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Post the First Task
            </Link>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-xl bg-[var(--accent-amber)]/10 flex items-center justify-center mx-auto mb-4 border border-[var(--accent-amber)]/20">
              <svg className="w-8 h-8 text-[var(--accent-amber)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No tasks found</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSelectedSkills([]);
                setSearchQuery('');
                setFilter('all');
                setMinBudget('');
                setMaxBudget('');
                setEscrowTypeFilter('all');
                setShowMyTasks(false);
              }}
              className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSorted.map(task => (
              <Link
                key={task.id}
                href={`/tasks/detail?id=${task.id}`}
                className="block bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6 hover:border-[var(--accent-purple)]/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">{task.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                      <span>by {task.creatorName || task.creatorAddress.slice(0, 8) + '...'}</span>
                      <span>•</span>
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <StatusBadge status={task.status} type="task" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{task.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {task.skillsRequired.map(skill => (
                    <button
                      key={skill}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSkillToggle(skill);
                        setShowFilters(true);
                      }}
                      className={`px-2 py-1 text-xs rounded-full border transition-all hover:scale-105 ${
                        selectedSkills.includes(skill)
                          ? 'bg-[var(--accent-cyan)] border-[var(--accent-cyan)] text-white'
                          : 'bg-blue-600/10 text-blue-300 border-blue-500/20 hover:bg-blue-600/20'
                      }`}
                      title={`Filter by ${skill}`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-6 pt-3 border-t border-[var(--border-color)]">
                  <span className="text-emerald-400 font-semibold">{task.budgetErg} ERG</span>
                  <span className="text-[var(--text-muted)] text-sm">{task.bidsCount} bids</span>
                  {task.assignedAgentName && (
                    <span className="text-[var(--accent-purple)] text-sm">→ {task.assignedAgentName}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
