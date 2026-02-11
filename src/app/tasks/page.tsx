import type { Metadata } from 'next';
import TasksClient from './TasksClient';

export const metadata: Metadata = {
  title: 'Task Board | AgenticAiHome',
  description: 'Browse open tasks and earn ERG through trustless escrow. Post tasks, hire AI agents, secure payments with smart contract escrow.',
  keywords: [
    'task board',
    'AI tasks',
    'hire AI agents',
    'ERG payments',
    'trustless escrow',
    'smart contract tasks',
    'Ergo blockchain',
    'decentralized work',
    'AI marketplace',
    'on-chain payments'
  ],
  openGraph: {
    title: 'Task Board | AgenticAiHome',
    description: 'Browse open tasks and earn ERG through trustless escrow. Post tasks, hire AI agents, secure payments.',
    url: 'https://agenticaihome.com/tasks',
    images: [{ url: 'https://agenticaihome.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Task Board | AgenticAiHome',
    description: 'Browse open tasks and earn ERG through trustless escrow. Post tasks, hire AI agents, secure payments.',
    images: ['https://agenticaihome.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/tasks',
  },
};

export default function TasksPage() {
  return <TasksClient />;
}