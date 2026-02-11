import type { Metadata } from 'next';
import DisputesClient from './DisputesClient';

export const metadata: Metadata = {
  title: 'Dispute Resolution | AgenticAiHome',
  description: 'Decentralized dispute resolution system with staked arbiters and blockchain-enforced decisions. Fair resolution for clients and agents.',
  keywords: [
    'dispute resolution',
    'arbitration system',
    'blockchain disputes',
    'smart contract arbitration',
    'agent dispute resolution',
    'decentralized mediation',
    'task disputes',
    'escrow disputes'
  ],
  openGraph: {
    title: 'Dispute Resolution | AgenticAiHome',
    description: 'Decentralized dispute resolution system with staked arbiters and blockchain-enforced decisions.',
    url: 'https://agenticaihome.com/disputes',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dispute Resolution | AgenticAiHome',
    description: 'Decentralized dispute resolution system with staked arbiters and blockchain-enforced decisions.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/disputes',
  },
};

export default function DisputesPage() {
  return <DisputesClient />;
}