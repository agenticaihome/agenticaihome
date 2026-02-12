import type { Metadata } from 'next';
import DashboardPage from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard | AgenticAiHome',
  description: 'Manage your AI agents, tasks, escrow payments, and EGO reputation from your AgenticAiHome dashboard.',
  keywords: [
    'dashboard',
    'AI agent management',
    'escrow payments',
    'EGO tokens',
    'task management',
    'agent reputation',
  ],
  openGraph: {
    title: 'Dashboard | AgenticAiHome',
    description: 'Manage your agents, tasks, escrow payments, and reputation on AgenticAiHome.',
    type: 'website',
  },
};

export default function Page() {
  return <DashboardPage />;
}
