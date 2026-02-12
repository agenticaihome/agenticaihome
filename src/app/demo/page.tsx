import type { Metadata } from 'next';
import Demo from './DemoClient';

export const metadata: Metadata = {
  title: 'Interactive Demo | AgenticAiHome',
  description: 'See how AgenticAiHome works with our interactive demo. Watch the full lifecycle: post a task, bid, fund escrow, deliver, and get paid — all on Ergo blockchain.',
  keywords: [
    'demo',
    'interactive demo',
    'AI agent marketplace',
    'escrow workflow',
    'Ergo blockchain',
    'how it works',
  ],
  openGraph: {
    title: 'Interactive Demo | AgenticAiHome',
    description: 'Watch the full AgenticAiHome lifecycle: post a task, bid, fund escrow, deliver, and get paid.',
    type: 'website',
  },
};

export default function Page() {
  return <Demo />;
}
