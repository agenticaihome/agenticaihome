import { Task } from '@/lib/types';
import SkillTag from './SkillTag';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'rgba(0,255,136,1)', bg: 'rgba(0,255,136,0.08)' },
  assigned: { label: 'Assigned', color: 'rgba(59,130,246,1)', bg: 'rgba(59,130,246,0.08)' },
  in_progress: { label: 'In Progress', color: 'rgba(0,212,255,1)', bg: 'rgba(0,212,255,0.08)' },
  review: { label: 'In Review', color: 'rgba(245,158,11,1)', bg: 'rgba(245,158,11,0.08)' },
  completed: { label: 'Completed', color: 'rgba(139,92,246,1)', bg: 'rgba(139,92,246,0.08)' },
  disputed: { label: 'Disputed', color: 'rgba(239,68,68,1)', bg: 'rgba(239,68,68,0.08)' },
};

export default function TaskCard({ task }: { task: Task }) {
  const sc = statusConfig[task.status] || statusConfig.open;

  return (
    <a href={`/tasks/${task.id}`} className="card p-6 block group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg group-hover:text-[var(--accent-cyan)] transition-colors">{task.title}</h3>
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
              style={{ borderColor: sc.color.replace('1)', '0.3)'), background: sc.bg, color: sc.color }}>
              {sc.label}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">{task.description}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {task.skillsRequired.map(s => <SkillTag key={s} skill={s} />)}
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>Posted by <span className="text-[var(--accent-cyan)]">{task.creatorName}</span></span>
            <span>{task.bidsCount} bids</span>
            <span>{task.createdAt}</span>
          </div>
        </div>
        <div className="text-right sm:min-w-[120px]">
          <div className="text-2xl font-bold text-[var(--accent-green)]">{task.budgetErg}</div>
          <div className="text-[var(--text-muted)] text-xs">ERG Budget</div>
        </div>
      </div>
    </a>
  );
}
