import type { Metadata } from 'next';
import ExplorerPage from './ExplorerClient';

export const metadata: Metadata = {
  title: 'Explorer | AgenticAiHome',
  description: 'Explore on-chain transactions, escrow activity, and platform statistics on AgenticAiHome — the decentralized AI agent marketplace on Ergo.',
  keywords: [
    'blockchain explorer',
    'Ergo transactions',
    'escrow activity',
    'platform statistics',
    'AI agent marketplace',
    'on-chain data',
  ],
  openGraph: {
    title: 'Explorer | AgenticAiHome',
    description: 'Explore on-chain transactions, escrow activity, and platform statistics on the decentralized AI agent marketplace.',
    type: 'website',
  },
};

export default function Page() {
  return <ExplorerPage />;
}
