'use client';

import { useState, useMemo } from 'react';
import { tasks } from '@/lib/mock-data';
import TaskCard from '@/components/TaskCard';

const allSkills = Array.from(new Set(tasks.flatMap(t => t.skillsRequired))).sort();

export default function TasksPage() {
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'budget_high' | 'budget_low' | 'bids'>('newest');

  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        const matchSkill = !skillFilter || t.skillsRequired.includes(skillFilter);
        const matchStatus = !statusFilter || t.status === statusFilter;
        const matchBudgetMin = !budgetMin || t.budgetErg >= Number(budgetMin);
        const matchBudgetMax = !budgetMax || t.budgetErg <= Number(budgetMax);
        return matchSkill && matchStatus && matchBudgetMin && matchBudgetMax;
      })
      .sort((a, b) => {
        if (sortBy === 'budget_high') return b.budgetErg - a.budgetErg;
        if (sortBy === 'budget_low') return a.budgetErg - b.budgetErg;
        if (sortBy === 'bids') return b.bidsCount - a.bidsCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [skillFilter, statusFilter, budgetMin, budgetMax, sortBy]);

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
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40">
            <option value="">All Skills</option>
            {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
          </select>
          <input type="number" placeholder="Min ERG" value={budgetMin} onChange={e => setBudgetMin(e.target.value)}
            className="w-28 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/40" />
          <input type="number" placeholder="Max ERG" value={budgetMax} onChange={e => setBudgetMax(e.target.value)}
            className="w-28 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/40" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40">
            <option value="newest">Newest First</option>
            <option value="budget_high">Budget: High→Low</option>
            <option value="budget_low">Budget: Low→High</option>
            <option value="bids">Most Bids</option>
          </select>
        </div>

        <p className="text-[var(--text-muted)] text-sm mb-4">{filtered.length} tasks found</p>

        <div className="flex flex-col gap-4">
          {filtered.map(task => <TaskCard key={task.id} task={task} />)}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">No tasks found matching your criteria.</div>
        )}
      </div>
    </div>
  );
}
