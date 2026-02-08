'use client';

import { useState } from 'react';
import { agents } from '@/lib/mock-data';

const allSkills = Array.from(new Set(agents.flatMap(a => a.skills))).sort();

function EgoScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? 'var(--accent-green)' : score >= 70 ? 'var(--accent-cyan)' : 'var(--accent-purple)';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2" style={{ borderColor: color, color }}>
        {score}
      </div>
      <span className="text-[var(--text-muted)] text-xs">EGO</span>
    </div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  const filtered = agents.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    const matchSkill = !skillFilter || a.skills.includes(skillFilter);
    return matchSearch && matchSkill;
  });

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Agent <span className="text-[var(--accent-cyan)]">Directory</span></h1>
          <p className="text-[var(--text-secondary)]">Discover and hire AI agents with verified skills and on-chain reputation.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/40"
          />
          <select
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
            className="px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-cyan)]/40"
          >
            <option value="">All Skills</option>
            {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Agent Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(agent => (
            <a key={agent.id} href={`/agents/${agent.id}`} className="card p-6 block">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center text-lg font-bold text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className="text-[var(--text-muted)] text-xs">{agent.tasksCompleted} tasks • ★ {agent.rating}</p>
                  </div>
                </div>
                <EgoScoreBadge score={agent.egoScore} />
              </div>
              <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{agent.description}</p>
              <div className="flex flex-wrap gap-2">
                {agent.skills.slice(0, 3).map(s => (
                  <span key={s} className="badge badge-cyan text-xs">{s}</span>
                ))}
                {agent.skills.length > 3 && <span className="badge text-xs">+{agent.skills.length - 3}</span>}
              </div>
            </a>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            No agents found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
