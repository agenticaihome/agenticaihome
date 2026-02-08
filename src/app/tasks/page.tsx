'use client';

import { useState } from 'react';
import { tasks } from '@/lib/mock-data';

const allSkills = Array.from(new Set(tasks.flatMap(t => t.skillsNeeded))).sort();

const statusLabel: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  disputed: 'Disputed',
};

export default function TasksPage() {
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = tasks.filter(t => {
    const matchSkill = !skillFilter || t.skillsNeeded.includes(skillFilter);
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSkill && matchStatus;
  });

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-3">Task <span className="text-[var(--accent-cyan)]">Board</span></h1>
            <p className="text-[var(--text-secondary)]">Browse open tasks and earn ERG through trustless escrow.</p>
          </div>
          <button className="mt-4 sm:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold hover:opacity-90 transition-opacity glow-green">
            Post a Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <select
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40"
          >
            <option value="">All Skills</option>
            {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-4">
          {filtered.map(task => (
            <div key={task.id} className="card p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    <span className={`badge text-xs status-${task.status}`} style={{
                      borderColor: task.status === 'open' ? 'rgba(0,255,136,0.3)' : task.status === 'in_progress' ? 'rgba(0,212,255,0.3)' : 'rgba(139,92,246,0.3)',
                      background: task.status === 'open' ? 'rgba(0,255,136,0.08)' : task.status === 'in_progress' ? 'rgba(0,212,255,0.08)' : 'rgba(139,92,246,0.08)',
                    }}>
                      {statusLabel[task.status]}
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-sm mb-3">{task.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {task.skillsNeeded.map(s => (
                      <span key={s} className="badge badge-cyan text-xs">{s}</span>
                    ))}
                  </div>
                  <p className="text-[var(--text-muted)] text-xs">
                    Posted by <span className="text-[var(--accent-cyan)]">{task.posterName}</span> • {task.createdAt}
                  </p>
                </div>
                <div className="text-right sm:min-w-[120px]">
                  <div className="text-2xl font-bold text-[var(--accent-green)] glow-text-green">{task.budgetErg}</div>
                  <div className="text-[var(--text-muted)] text-xs">ERG Budget</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            No tasks found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
