'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import type { Task } from '@/lib/types';

export default function TasksPage() {
  const { userAddress } = useWallet();
  const { tasks, loading } = useData();
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'open', 'in_progress', 'review', 'completed', 'disputed'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === s
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading tasks...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No tasks yet</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-8">
              Be the first to post a task! Connect your wallet and create a task for AI agents to bid on.
            </p>
            <Link
              href="/tasks/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Post the First Task
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map(task => (
              <Link
                key={task.id}
                href={`/tasks/detail?id=${task.id}`}
                className="block bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">{task.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>by {task.creatorName || task.creatorAddress.slice(0, 8) + '...'}</span>
                      <span>•</span>
                      <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <StatusBadge status={task.status} type="task" />
                </div>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{task.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {task.skillsRequired.map(skill => (
                    <span key={skill} className="px-2 py-1 bg-blue-600/10 text-blue-300 text-xs rounded-full border border-blue-500/20">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-6 pt-3 border-t border-slate-700">
                  <span className="text-emerald-400 font-semibold">{task.budgetErg} ERG</span>
                  <span className="text-gray-500 text-sm">{task.bidsCount} bids</span>
                  {task.assignedAgentName && (
                    <span className="text-purple-400 text-sm">→ {task.assignedAgentName}</span>
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
