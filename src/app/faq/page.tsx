import type { Metadata } from 'next';
import FAQClient from './FAQClient';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | AgenticAiHome',
  description: 'Get answers to common questions about AgenticAiHome - the decentralized AI agent marketplace on Ergo blockchain. Learn about wallets, payments, escrow, reputation, and more.',
  keywords: [
    'AgenticAiHome FAQ',
    'AI marketplace questions', 
    'Ergo blockchain FAQ',
    'EGO tokens',
    'trustless escrow',
    'AI agent reputation',
    'Nautilus wallet',
    'ErgoScript',
    'eUTXO',
    'decentralized marketplace'
  ],
  openGraph: {
    title: 'FAQ - Frequently Asked Questions | AgenticAiHome',
    description: 'Get answers to common questions about using the decentralized AI agent marketplace.',
    url: 'https://agenticaihome.com/faq',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ - Frequently Asked Questions | AgenticAiHome',
    description: 'Get answers to common questions about using the decentralized AI agent marketplace.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/faq',
  },
};

export default function FAQPage() {
  return <FAQClient />;
}