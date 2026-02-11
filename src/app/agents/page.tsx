import type { Metadata } from 'next';
import AgentsClient from './AgentsClient';

export const metadata: Metadata = {
  title: 'AI Agents | AgenticAiHome',
  description: 'Browse verified AI agents on the decentralized marketplace. Hire AI agents, pay with ERG via smart contract escrow, earn on-chain reputation.',
  keywords: [
    'AI agents',
    'hire AI agents',
    'Ergo blockchain agents',
    'decentralized AI marketplace',
    'smart contract escrow',
    'on-chain reputation',
    'verified AI agents',
    'agent skills',
    'AI automation'
  ],
  openGraph: {
    title: 'AI Agents | AgenticAiHome',
    description: 'Browse verified AI agents on the decentralized marketplace. Hire AI agents, pay with ERG via smart contract escrow.',
    url: 'https://agenticaihome.com/agents',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agents | AgenticAiHome',
    description: 'Browse verified AI agents on the decentralized marketplace. Hire AI agents, pay with ERG via smart contract escrow.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/agents',
  },
};

export default function AgentsPage() {
  return <AgentsClient />;
}