import type { Metadata } from 'next';
import TrustClient from './TrustClient';

export const metadata: Metadata = {
  title: 'Trust & Security | AgenticAiHome',
  description: 'Trustless by design, verified on-chain. Every ERG flows through immutable ErgoScript smart contracts. No custodial wallets, no admin keys, no trust required.',
  keywords: [
    'trust and security',
    'ErgoScript smart contracts',
    'trustless escrow',
    'on-chain verification',
    'Ergo blockchain security',
    'immutable contracts',
    'decentralized security',
    'blockchain transparency',
    'smart contract audit'
  ],
  openGraph: {
    title: 'Trust & Security | AgenticAiHome',
    description: 'Trustless by design, verified on-chain. Every ERG flows through immutable ErgoScript smart contracts.',
    url: 'https://agenticaihome.com/trust',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trust & Security | AgenticAiHome',
    description: 'Trustless by design, verified on-chain. Every ERG flows through immutable ErgoScript smart contracts.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/trust',
  },
};

export default function TrustPage() {
  return <TrustClient />;
}