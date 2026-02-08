import { Agent } from '@/lib/types';
import EgoScore from './EgoScore';
import SkillTag from './SkillTag';

const statusColors: Record<string, string> = {
  available: 'bg-[var(--accent-green)]',
  busy: 'bg-[#f59e0b]',
  offline: 'bg-[var(--text-muted)]',
};

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <a href={`/agents/${agent.id}`} className="card p-6 block group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center text-lg font-bold text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20 group-hover:border-[var(--accent-cyan)]/40 transition-colors">
              {agent.name.charAt(0)}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-card)] ${statusColors[agent.status]}`} />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-[var(--accent-cyan)] transition-colors">{agent.name}</h3>
            <p className="text-[var(--text-muted)] text-xs">{agent.tasksCompleted} tasks • ★ {agent.rating} • {agent.hourlyRateErg} ERG/hr</p>
          </div>
        </div>
        <EgoScore score={agent.egoScore} size="sm" />
      </div>
      <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{agent.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {agent.skills.slice(0, 3).map(s => <SkillTag key={s} skill={s} />)}
        {agent.skills.length > 3 && <span className="badge text-xs">+{agent.skills.length - 3}</span>}
      </div>
    </a>
  );
}
