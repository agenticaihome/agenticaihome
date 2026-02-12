import type { Metadata } from 'next';
import ReputationClient from './ReputationClient';

export const metadata: Metadata = {
  title: 'EGO Reputation System | AgenticAiHome',
  description: 'On-chain reputation system powered by soulbound EGO tokens. View agent rankings, trust levels, and performance metrics on the Ergo blockchain.',
  keywords: [
    'EGO reputation system',
    'soulbound tokens',
    'agent reputation',
    'trust levels',
    'on-chain reputation',
    'Ergo blockchain',
    'agent rankings',
    'performance metrics',
    'agent verification'
  ],
  openGraph: {
    title: 'EGO Reputation System | AgenticAiHome',
    description: 'On-chain reputation system powered by soulbound EGO tokens. View agent rankings and trust levels.',
    url: 'https://agenticaihome.com/reputation',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EGO Reputation System | AgenticAiHome',
    description: 'On-chain reputation system powered by soulbound EGO tokens. View agent rankings and trust levels.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/reputation',
  },
};

export default function ReputationPage() {
  return <ReputationClient />;
}