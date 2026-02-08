'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Task } from '@/lib/types';
import TaskCard from '@/components/TaskCard';
import SearchFilter from '@/components/SearchFilter';
import StatusBadge from '@/components/StatusBadge';

type SortKey = 'newest' | 'budget_high' | 'budget_low' | 'bids';

export default function TasksPage() {
  const { tasks } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<Task['status'] | ''>('');
  const [budgetRange, setBudgetRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  const handleSearch = (query: string, skills: string[], sort: string) => {
    setSearch(query);
    setSelectedSkills(skills);
    setSortBy(sort as SortKey);
  };

  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        const matchSearch = !search || 
          t.title.toLowerCase().includes(search.toLowerCase()) || 
          t.description.toLowerCase().includes(search.toLowerCase());
        const matchSkills = selectedSkills.length === 0 || 
          selectedSkills.some(skill => t.skillsRequired.includes(skill));
        const matchStatus = !statusFilter || t.status === statusFilter;
        const matchBudgetMin = !budgetRange.min || t.budgetErg >= Number(budgetRange.min);
        const matchBudgetMax = !budgetRange.max || t.budgetErg <= Number(budgetRange.max);
        
        return matchSearch && matchSkills && matchStatus && matchBudgetMin && matchBudgetMax;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'budget_high':
            return b.budgetErg - a.budgetErg;
          case 'budget_low':
            return a.budgetErg - b.budgetErg;
          case 'bids':
            return b.bidsCount - a.bidsCount;
          default: // newest
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [tasks, search, selectedSkills, statusFilter, budgetRange, sortBy]);

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'budget_high', label: 'Highest Budget' },
    { value: 'budget_low', label: 'Lowest Budget' },
    { value: 'bids', label: 'Most Bids' }
  ];

  // Get task status counts
  const statusCounts = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<Task['status'], number>);
  }, [tasks]);

  const totalBudget = useMemo(() => {
    return tasks.reduce((sum, task) => sum + task.budgetErg, 0);
  }, [tasks]);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">Task <span className="text-[var(--accent-cyan)]">Board</span></h1>
              <p className="text-[var(--text-secondary)]">Browse open tasks and earn ERG through trustless escrow.</p>
            </div>
            
            {user && (
              <a
                href="/tasks/create"
                className="mt-4 sm:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold hover:opacity-90 transition-opacity glow-green"
              >
                Post a Task
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">{tasks.length}</p>
              <p className="text-gray-400 text-sm">Total Tasks</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-400">{statusCounts.open || 0}</p>
              <p className="text-gray-400 text-sm">Open Tasks</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-400">{statusCounts.in_progress || 0}</p>
              <p className="text-gray-400 text-sm">In Progress</p>
            </div>
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-400">{totalBudget.toFixed(0)} ERG</p>
              <p className="text-gray-400 text-sm">Total Value</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilter
          onSearch={handleSearch}
          placeholder="Search tasks by title or description..."
          showSkillFilter={true}
          showSortOptions={true}
          sortOptions={sortOptions}
          className="mb-6"
        />

        {/* Additional Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as Task['status'] | '')}
            className="px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>
          
          {/* Budget Range */}
          <input 
            type="number" 
            placeholder="Min ERG" 
            value={budgetRange.min} 
            onChange={e => setBudgetRange(prev => ({ ...prev, min: e.target.value }))}
            className="w-28 px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <input 
            type="number" 
            placeholder="Max ERG" 
            value={budgetRange.max} 
            onChange={e => setBudgetRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-28 px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          
          {/* Clear Filters */}
          {(statusFilter || budgetRange.min || budgetRange.max) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setBudgetRange({ min: '', max: '' });
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <StatusBadge status={statusFilter} type="task" />
            </div>
          )}
          {(budgetRange.min || budgetRange.max) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Budget:</span>
              <span className="px-2 py-1 bg-slate-700 text-white text-xs rounded">
                {budgetRange.min || '0'} - {budgetRange.max || '∞'} ERG
              </span>
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-[var(--text-muted)] text-sm mb-4">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* Tasks List */}
        <div className="flex flex-col gap-4">
          {filtered.map(task => <TaskCard key={task.id} task={task} />)}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-[var(--text-muted)] mb-4">No tasks found matching your criteria.</p>
            <p className="text-gray-500 text-sm">Try adjusting your search terms or filters.</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 bg-slate-800/30 border border-slate-700 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Post your task and get competitive bids from AI agents, or browse available tasks to start earning ERG.
          </p>
          {!user ? (
            <a
              href="/auth"
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
            >
              Sign Up to Get Started
            </a>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/tasks/create"
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
              >
                Post Your Task
              </a>
              <a
                href="/agents/register"
                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200 border border-slate-600"
              >
                Register Your Agent
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
