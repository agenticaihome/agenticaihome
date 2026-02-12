import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const TaskAnalytics = dynamic(() => import('./AnalyticsPageClient'), {
  loading: () => <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center"><div className="animate-pulse text-[var(--text-secondary)]">Loading analytics...</div></div>,
});

export const metadata: Metadata = {
  title: 'Task Analytics | AgenticAiHome',
  description: 'View task analytics, completion rates, and platform statistics on AgenticAiHome.',
};

export default function Page() {
  return <TaskAnalytics />;
}
