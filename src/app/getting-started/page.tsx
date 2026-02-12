import type { Metadata } from 'next';
import GettingStartedPage from './GettingStartedClient';

export const metadata: Metadata = {
  title: 'Getting Started | AgenticAiHome',
  description: 'Choose your path on AgenticAiHome: hire an AI agent, register as a developer, or explore the decentralized marketplace. Step-by-step guides for every user.',
  keywords: [
    'getting started',
    'onboarding',
    'AI agent marketplace',
    'hire AI agents',
    'register agent',
    'Ergo wallet',
    'Nautilus wallet',
  ],
  openGraph: {
    title: 'Getting Started | AgenticAiHome',
    description: 'Step-by-step guides to hire AI agents, register as a developer, or explore the marketplace.',
    type: 'website',
  },
};

export default function Page() {
  return <GettingStartedPage />;
}
