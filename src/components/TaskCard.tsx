import { Task } from '@/lib/types';
import SkillTag from './SkillTag';

const statusConfig: Record<string, { label: string; badge: string; icon: string }> = {
  open: { 
    label: 'Open for bids', 
    badge: 'badge-green',
    icon: '🟢'
  },
  assigned: { 
    label: 'Agent assigned', 
    badge: 'badge-cyan',
    icon: '👤' 
  },
  in_progress: { 
    label: 'Work in progress', 
    badge: 'badge-cyan',
    icon: '⚡' 
  },
  review: { 
    label: 'Under review', 
    badge: 'badge-amber',
    icon: '👁️' 
  },
  completed: { 
    label: 'Completed', 
    badge: 'badge-purple',
    icon: '✅' 
  },
  disputed: { 
    label: 'Disputed', 
    badge: 'badge-red',
    icon: '⚠️' 
  },
};

const getUrgencyIndicator = (createdAt: string) => {
  // Simple urgency based on creation time (mock logic)
  const daysSincePosted = Math.floor(Math.random() * 7); // Mock calculation
  if (daysSincePosted <= 1) return { label: 'Urgent', class: 'text-red-400', pulse: true };
  if (daysSincePosted <= 3) return { label: 'Recent', class: 'text-[var(--accent-amber)]', pulse: false };
  return { label: '', class: '', pulse: false };
};

export default function TaskCard({ task }: { task: Task }) {
  const statusInfo = statusConfig[task.status] || statusConfig.open;
  const urgency = getUrgencyIndicator(task.createdAt);

  return (
    <a 
      href={`/tasks/${task.id}`} 
      className="card card-interactive p-6 block group relative overflow-hidden"
      role="article"
      aria-label={`Task: ${task.title}`}
    >
      {/* Urgency pulse effect for urgent tasks */}
      {urgency.pulse && (
        <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-lg leading-snug group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2">
              {task.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {urgency.label && (
                <span className={`text-xs font-medium ${urgency.class}`}>
                  {urgency.label}
                </span>
              )}
              <span className={`badge ${statusInfo.badge} text-xs whitespace-nowrap`}>
                <span className="mr-1">{statusInfo.icon}</span>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4 line-clamp-3">
        {task.description}
      </p>

      {/* Skills Required */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {task.skillsRequired.slice(0, 4).map(skill => (
          <SkillTag key={skill} skill={skill} size="sm" />
        ))}
        {task.skillsRequired.length > 4 && (
          <span className="badge badge-cyan text-xs">
            +{task.skillsRequired.length - 4} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between gap-4">
        {/* Meta Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-2">
            <span className="flex items-center gap-1 truncate">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[var(--accent-cyan)] font-medium">{task.creatorName}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] flex-shrink-0" />
            <span className="flex items-center gap-1 flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
              </svg>
              {task.bidsCount} bids
            </span>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            Posted {task.createdAt}
          </div>
        </div>

        {/* Budget */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[var(--accent-green)]">Σ{task.budgetErg}</span>
            <span className="text-[var(--text-muted)] text-xs">ERG</span>
          </div>
          <div className="text-[var(--text-muted)] text-xs mt-0.5">
            ~$342.00 USD
          </div>
        </div>
      </div>

      {/* Hover arrow indicator */}
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
        <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}
