import { Agent } from '@/lib/types';
import EgoScore from './EgoScore';
import SkillTag from './SkillTag';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-[var(--accent-green)]', text: 'text-[var(--accent-green)]', label: 'Available' },
  busy: { bg: 'bg-[var(--accent-amber)]', text: 'text-[var(--accent-amber)]', label: 'Busy' },
  offline: { bg: 'bg-[var(--text-muted)]', text: 'text-[var(--text-muted)]', label: 'Offline' },
};

const getAvatarColors = (name: string) => {
  const colors = [
    { from: 'from-[var(--accent-cyan)]', to: 'to-[var(--accent-purple)]' },
    { from: 'from-[var(--accent-green)]', to: 'to-[var(--accent-cyan)]' },
    { from: 'from-[var(--accent-purple)]', to: 'to-[var(--accent-green)]' },
    { from: 'from-pink-500', to: 'to-[var(--accent-purple)]' },
    { from: 'from-[var(--accent-amber)]', to: 'to-red-500' },
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const getInitials = (name: string) => {
  const words = name.trim().split(' ');
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const statusInfo = statusColors[agent.status];
  const avatarColors = getAvatarColors(agent.name);
  const initials = getInitials(agent.name);

  return (
    <a 
      href={`/agents/${agent.id}`} 
      className="card card-interactive p-6 block group relative overflow-hidden"
      role="article"
      aria-label={`Agent profile: ${agent.name}`}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)]/0 via-[var(--accent-purple)]/0 to-[var(--accent-green)]/0 group-hover:from-[var(--accent-cyan)]/5 group-hover:via-[var(--accent-purple)]/5 group-hover:to-[var(--accent-green)]/5 transition-all duration-300 pointer-events-none" />
      
      {/* Header — centered layout */}
      <div className="flex flex-col items-center text-center mb-4 relative">
        {/* Avatar + EGO Score row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="relative flex-shrink-0">
            <div className={`avatar-placeholder w-14 h-14 text-lg bg-gradient-to-br ${avatarColors.from} ${avatarColors.to} group-hover:scale-105 transition-transform`}>
              {initials}
            </div>
            <div 
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-card)] group-hover:border-[var(--bg-card-hover)] ${statusInfo.bg} transition-colors`}
              title={statusInfo.label}
            />
          </div>
          <EgoScore score={agent.egoScore} size="sm" />
        </div>
        
        {/* Name — full width, never truncated */}
        <h3 className="font-semibold text-lg group-hover:text-[var(--accent-cyan)] transition-colors w-full break-words">
          {agent.name}
        </h3>
        
        {/* Stats row */}
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] mt-1">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {agent.tasksCompleted} tasks
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3 fill-[var(--accent-amber)]" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {agent.rating.toFixed(1)}
          </span>
          <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
          <span className="font-medium">Σ{agent.hourlyRateErg}/hr</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4 line-clamp-3">
        {agent.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 flex-1 mr-4">
          {agent.skills.slice(0, 3).map(skill => (
            <SkillTag key={skill} skill={skill} size="sm" />
          ))}
          {agent.skills.length > 3 && (
            <span className="badge badge-cyan text-xs">
              +{agent.skills.length - 3} more
            </span>
          )}
        </div>
        
        {/* Status Badge */}
        <div className={`badge ${statusInfo.text === 'text-[var(--accent-green)]' ? 'badge-green' : statusInfo.text === 'text-[var(--accent-amber)]' ? 'badge-amber' : ''} text-xs flex-shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.bg} mr-1.5`} />
          {statusInfo.label}
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
