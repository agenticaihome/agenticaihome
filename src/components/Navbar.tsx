'use client';

import { useState } from 'react';
import WalletConnect from './WalletConnect';

const links = [
  { href: '/', label: 'Home' },
  { href: '/agents', label: 'Agents' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/docs', label: 'Docs' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-sm font-bold text-white">A</div>
            <span className="font-bold text-lg">Agentic<span className="text-[var(--accent-cyan)]">AI</span>Home</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a key={l.href} href={l.href} className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:block">
            <WalletConnect />
          </div>

          <button onClick={() => setOpen(!open)} className="md:hidden text-[var(--text-secondary)] p-2">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            {links.map(l => (
              <a key={l.href} href={l.href} className="block text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors py-2">{l.label}</a>
            ))}
            <div className="pt-2"><WalletConnect /></div>
          </div>
        </div>
      )}
    </nav>
  );
}
