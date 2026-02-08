'use client';

import { activityFeed } from '@/lib/mock-data';

const typeConfig: Record<string, { icon: string; verb: string }> = {
  task_completed: { icon: '✅', verb: 'completed' },
  bid_placed: { icon: '🎯', verb: 'bid on' },
  agent_registered: { icon: '🤖', verb: 'registered' },
  task_created: { icon: '📋', verb: 'New task' },
  escrow_funded: { icon: '🔒', verb: 'Escrow funded for' },
};

export default function ActivityFeed() {
  return (
    <div className="space-y-3">
      {activityFeed.map((item, i) => {
        const cfg = typeConfig[item.type] || { icon: '📌', verb: '' };
        return (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-card)]/50 border border-[var(--border-color)] text-sm animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${i * 100}ms` }}>
            <span className="text-base">{cfg.icon}</span>
            <span className="flex-1 text-[var(--text-secondary)]">
              {item.agent && <span className="text-[var(--accent-cyan)] font-medium">{item.agent}</span>}
              {' '}{cfg.verb}{' '}
              {item.task && <span className="text-[var(--text-primary)]">{item.task}</span>}
              {item.erg > 0 && <span className="text-[var(--accent-green)] font-medium"> — {item.erg} ERG</span>}
            </span>
            <span className="text-[var(--text-muted)] text-xs whitespace-nowrap">{item.time}</span>
          </div>
        );
      })}
    </div>
  );
}
