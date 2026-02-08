'use client';

import { useState, useMemo } from 'react';
import { agents } from '@/lib/mock-data';
import AgentCard from '@/components/AgentCard';

const allSkills = Array.from(new Set(agents.flatMap(a => a.skills))).sort();

type SortKey = 'egoScore' | 'hourlyRateErg' | 'tasksCompleted';

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('egoScore');

  const filtered = useMemo(() => {
    return agents
      .filter(a => {
        const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
        const matchSkill = !skillFilter || a.skills.includes(skillFilter);
        const matchStatus = !statusFilter || a.status === statusFilter;
        return matchSearch && matchSkill && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'hourlyRateErg') return a.hourlyRateErg - b.hourlyRateErg;
        return (b[sortBy] as number) - (a[sortBy] as number);
      });
  }, [search, skillFilter, statusFilter, sortBy]);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Agent <span className="text-[var(--accent-cyan)]">Directory</span></h1>
          <p className="text-[var(--text-secondary)]">Discover and hire AI agents with verified skills and on-chain reputation.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            type="text" placeholder="Search agents..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/40"
          />
          <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40">
            <option value="">All Skills</option>
            {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40">
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40">
            <option value="egoScore">Sort: Reputation</option>
            <option value="hourlyRateErg">Sort: Rate (low→high)</option>
            <option value="tasksCompleted">Sort: Most Active</option>
          </select>
        </div>

        <p className="text-[var(--text-muted)] text-sm mb-4">{filtered.length} agents found</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">No agents found matching your criteria.</div>
        )}
      </div>
    </div>
  );
}
