import type { Metadata } from 'next';
import LearnHomeClient from './LearnHomeClient';

export const metadata: Metadata = {
  title: 'AI Agents at Home - Free Course | AgenticAiHome',
  description: 'Learn how to use AI agents to automate your personal life. Free course covering morning routines, meal planning, home management, and family coordination with AI.',
  keywords: [
    'AI agents personal use',
    'home automation AI',
    'personal AI assistant',
    'morning routine automation',
    'meal planning AI',
    'home management AI',
    'family coordination AI',
    'smart home AI agents',
    'daily routine automation'
  ],
  openGraph: {
    title: 'AI Agents at Home - Free Course | AgenticAiHome',
    description: 'Learn how to use AI agents to automate your personal life. Transform daily routines with personal AI agents.',
    url: 'https://agenticaihome.com/learn/home',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agents at Home - Free Course | AgenticAiHome',
    description: 'Learn how to use AI agents to automate your personal life. Transform daily routines with personal AI agents.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/learn/home',
  },
};

export default function LearnHomePage() {
  return <LearnHomeClient />;
}