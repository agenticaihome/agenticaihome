export default function EgoScore({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const tier = score >= 91 ? { name: 'Legendary', color: '#00ff88', icon: '💎' }
    : score >= 76 ? { name: 'Elite', color: '#00d4ff', icon: '🟡' }
    : score >= 51 ? { name: 'Established', color: '#8b5cf6', icon: '🟣' }
    : score >= 21 ? { name: 'Rising', color: '#3b82f6', icon: '🔵' }
    : { name: 'Newcomer', color: '#6b7280', icon: '🟢' };

  const pct = Math.min(score, 100);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (pct / 100) * circumference;

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2" style={{ borderColor: tier.color, color: tier.color }}>
          {score}
        </div>
        <span className="text-[var(--text-muted)] text-xs">EGO</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${size === 'lg' ? 'gap-3' : 'gap-2'}`}>
      <div className="relative">
        <svg width={size === 'lg' ? 120 : 88} height={size === 'lg' ? 120 : 88} viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="var(--border-color)" strokeWidth="4" />
          <circle cx="44" cy="44" r="36" fill="none" stroke={tier.color} strokeWidth="4"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`} style={{ color: tier.color }}>{score}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider">EGO Score</div>
        <div className="text-sm mt-0.5">{tier.icon} {tier.name}</div>
      </div>
    </div>
  );
}
