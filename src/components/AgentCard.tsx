import { Agent } from '@/lib/types';
import SkillTag from './SkillTag';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Available' },
  busy: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Busy' },
  offline: { bg: 'bg-slate-500', text: 'text-slate-400', label: 'Offline' },
};

const getAvatarColors = (name: string) => {
  const colors = [
    { from: 'from-cyan-400', to: 'to-purple-500', ring: 'from-cyan-400/30 to-purple-500/30' },
    { from: 'from-emerald-400', to: 'to-cyan-500', ring: 'from-emerald-400/30 to-cyan-500/30' },
    { from: 'from-purple-400', to: 'to-pink-500', ring: 'from-purple-400/30 to-pink-500/30' },
    { from: 'from-orange-400', to: 'to-red-500', ring: 'from-orange-400/30 to-red-500/30' },
    { from: 'from-blue-400', to: 'to-indigo-500', ring: 'from-blue-400/30 to-indigo-500/30' },
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

const getEgoScoreColor = (score: number) => {
  if (score >= 90) return { bg: 'bg-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/25' };
  if (score >= 75) return { bg: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/25' };
  if (score >= 50) return { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/25' };
  return { bg: 'bg-slate-500', text: 'text-slate-400', glow: 'shadow-slate-500/25' };
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const statusInfo = statusColors[agent.status];
  const avatarColors = getAvatarColors(agent.name);
  const initials = getInitials(agent.name);
  const egoColors = getEgoScoreColor(agent.egoScore);

  return (
    <a 
      href={`/agents/detail?id=${agent.id}`} 
      className="group block relative"
      role="article"
      aria-label={`Agent profile: ${agent.name}`}
    >
      {/* Glass morphism card with gradient border */}
      <div className="relative h-full bg-gradient-to-b from-slate-800/50 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 overflow-hidden transition-all duration-500 ease-out group-hover:scale-[1.02] group-hover:border-gradient-to-r group-hover:from-cyan-500/50 group-hover:to-purple-500/50 group-hover:shadow-2xl group-hover:shadow-purple-500/10">
        
        {/* Animated gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-cyan-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-700 ease-out" />
        
        {/* Status indicator in corner */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusInfo.bg} shadow-lg ${statusInfo.bg === 'bg-emerald-500' ? 'shadow-emerald-500/50 animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${statusInfo.text}`}>{statusInfo.label}</span>
        </div>

        {/* Avatar with animated gradient ring */}
        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="relative mb-4">
            {/* Animated gradient ring */}
            <div className={`absolute inset-0 bg-gradient-to-r ${avatarColors.ring} rounded-full animate-pulse scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            {/* Avatar */}
            <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${avatarColors.from} ${avatarColors.to} flex items-center justify-center text-2xl font-bold text-white shadow-2xl group-hover:scale-110 transition-all duration-500 ease-out`}>
              {initials}
              
              {/* Subtle inner glow */}
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${avatarColors.from} ${avatarColors.to} opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-sm`} />
            </div>
          </div>
          
          {/* Name - prominently displayed */}
          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-500">
            {agent.name}
          </h3>
          
          {/* EGO Score as sleek badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${egoColors.bg}/10 border border-current/20 backdrop-blur-sm ${egoColors.text} ${egoColors.glow} group-hover:scale-105 transition-all duration-300`}>
            <span className={`w-2 h-2 rounded-full ${egoColors.bg} animate-pulse`} />
            <span className="font-mono font-bold text-lg">{agent.egoScore}</span>
            <span className="text-xs font-medium opacity-75">EGO</span>
          </div>
        </div>

        {/* Clean separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent mb-6" />

        {/* Stats row with elegant icons */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">{agent.tasksCompleted}</span>
            <span className="text-slate-400">tasks</span>
          </div>
          
          <div className="w-px h-4 bg-slate-600" />
          
          <div className="flex items-center gap-2 text-slate-300">
            <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="font-medium">{agent.rating.toFixed(1)}</span>
          </div>
          
          <div className="w-px h-4 bg-slate-600" />
          
          <div className="flex items-center gap-2 text-slate-300">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className="font-mono font-bold text-purple-400">Σ{agent.hourlyRateErg}</span>
            <span className="text-slate-400">/hr</span>
          </div>
        </div>

        {/* Description - elegant truncation */}
        <p className="text-slate-300 text-sm leading-relaxed mb-6 line-clamp-2 text-center">
          {agent.description}
        </p>

        {/* Skills as minimal, elegant pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {agent.skills.slice(0, 3).map(skill => (
            <span 
              key={skill}
              className="px-3 py-1 text-xs font-medium bg-slate-800/50 text-slate-300 rounded-full border border-slate-600/30 backdrop-blur-sm group-hover:bg-slate-700/50 transition-colors duration-300"
            >
              {skill}
            </span>
          ))}
          {agent.skills.length > 3 && (
            <span className="px-3 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
              +{agent.skills.length - 3} more
            </span>
          )}
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  );
}
