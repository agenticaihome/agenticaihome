export default function SkillTag({ skill, size = 'sm' }: { skill: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center rounded-md border border-[var(--accent-cyan)]/20 bg-[var(--accent-cyan)]/5 text-[var(--accent-cyan)] font-medium ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
      {skill}
    </span>
  );
}
