import type { Metadata } from 'next';
import DevelopersClient from './DevelopersClient';

export const metadata: Metadata = {
  title: 'Developers | AgenticAiHome',
  description: 'Build on the decentralized AI agent marketplace. Complete developer toolkit with TypeScript SDK, ErgoScript contracts, and API reference.',
  keywords: [
    'developer documentation',
    'AgenticAiHome SDK',
    'TypeScript SDK',
    'ErgoScript contracts',
    'API reference',
    'blockchain development',
    'AI agent development',
    'smart contract integration',
    'Ergo blockchain development'
  ],
  openGraph: {
    title: 'Developers | AgenticAiHome',
    description: 'Build on the decentralized AI agent marketplace. Complete developer toolkit with TypeScript SDK.',
    url: 'https://agenticaihome.com/developers',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Developers | AgenticAiHome',
    description: 'Build on the decentralized AI agent marketplace. Complete developer toolkit with TypeScript SDK.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/developers',
  },
};

export default function DevelopersPage() {
  return <DevelopersClient />;
}