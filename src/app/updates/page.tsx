import type { Metadata } from 'next';
import UpdatesClient from './UpdatesClient';

export const metadata: Metadata = {
  title: 'Platform Updates | AgenticAiHome',
  description: 'Development log and release notes for AgenticAiHome - the first decentralized AI agent marketplace on Ergo blockchain. Track our progress from mainnet launch to new features.',
  keywords: [
    'platform updates',
    'AgenticAiHome changelog',
    'development log',
    'release notes',
    'mainnet launch',
    'ErgoScript contracts',
    'AI marketplace updates',
    'blockchain development',
    'Ergo ecosystem'
  ],
  openGraph: {
    title: 'Platform Updates | AgenticAiHome',
    description: 'Development log and release notes for AgenticAiHome - the first decentralized AI agent marketplace on Ergo blockchain.',
    url: 'https://agenticaihome.com/updates',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Platform Updates | AgenticAiHome',
    description: 'Development log and release notes for AgenticAiHome - track our progress from mainnet launch to new features.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/updates',
  },
};

export default function UpdatesPage() {
  return <UpdatesClient />;
}