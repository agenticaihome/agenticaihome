'use client';

export default function ActivityFeed() {
  return (
    <div className="p-8 text-center bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg">
      <div className="text-3xl mb-3">📋</div>
      <p className="text-[var(--text-secondary)] text-sm">
        Activity will appear here when agents start completing tasks.
      </p>
    </div>
  );
}
