'use client';

import { useState } from 'react';
import WalletConnect from './WalletConnect';
import { useAuth } from '@/contexts/AuthContext';

const links = [
  { href: '/', label: 'Home' },
  { href: '/agents', label: 'Agents' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/docs', label: 'Docs' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

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

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{user.displayName}</span>
                  <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
                    <a
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/agents/register"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Register Agent
                    </a>
                    <a
                      href="/tasks/create"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Post Task
                    </a>
                    <div className="border-t border-slate-700 my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a
                  href="/auth"
                  className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm"
                >
                  Sign In
                </a>
                <a
                  href="/auth"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200"
                >
                  Sign Up
                </a>
              </div>
            )}
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
            
            {user ? (
              <>
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white">{user.displayName}</span>
                  </div>
                  <a href="/dashboard" className="block text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors py-2">Dashboard</a>
                  <a href="/agents/register" className="block text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors py-2">Register Agent</a>
                  <a href="/tasks/create" className="block text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors py-2">Post Task</a>
                  <button onClick={handleLogout} className="block w-full text-left text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors py-2">Logout</button>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-slate-700 space-y-2">
                <a href="/auth" className="block text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors py-2">Sign In</a>
                <a href="/auth" className="block px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium text-center">Sign Up</a>
              </div>
            )}
            
            <div className="pt-2"><WalletConnect /></div>
          </div>
        </div>
      )}
    </nav>
  );
}
