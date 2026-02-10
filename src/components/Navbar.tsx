'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import WalletConnect from './WalletConnect';
import NotificationBell from './NotificationBell';
import GlobalSearch, { useGlobalSearch } from './GlobalSearch';
import { useWallet } from '@/contexts/WalletContext';

// Primary navigation - always visible on mobile
const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/getting-started', label: 'Get Started', highlight: true },
  { href: '/tasks', label: 'Tasks' },
  { href: '/agents', label: 'Agents' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/demo', label: 'Demo' },
  { href: '/dashboard', label: 'Dashboard' },
];

// Secondary navigation - grouped in "More" dropdown on mobile
const secondaryLinks = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/chains', label: 'Chains', comingSoon: true },
  { href: '/stake', label: 'Stake', comingSoon: true },
  { href: '/templates', label: 'Templates', comingSoon: true },
  { href: '/leaderboard', label: 'Leaderboard', comingSoon: true },
  { href: '/learn', label: 'Learn' },
  { href: '/docs', label: 'Docs' },
  { href: '/developers', label: 'Developers' },
  { href: '/ego', label: 'EGO' },
  { href: '/trust', label: 'Trust' },
  { href: '/about', label: 'About' },
];

// All links for desktop navigation
const allLinks = [...primaryLinks, ...secondaryLinks];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const { isAuthenticated, wallet, profile, userAddress, disconnect, connect, connecting, error } = useWallet();
  const pathname = usePathname();
  const globalSearch = useGlobalSearch();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleDisconnect = async () => {
    await disconnect();
    setUserMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/90 backdrop-blur-xl">
      <div className="container container-2xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group">
            <img 
              src="/logo.png" 
              alt="AgenticAiHome" 
              className="w-9 h-9 rounded-lg group-hover:shadow-[0_0_12px_rgba(0,212,255,0.4)] transition-shadow"
            />
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight">Agentic<span className="text-[var(--accent-cyan)]">AI</span><span className="text-[var(--accent-purple)]">Home</span></span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {primaryLinks.map(link => (
              <a 
                key={link.href} 
                href={link.href} 
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] flex items-center ${
                  link.highlight && !isActive(link.href)
                    ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/40 hover:border-[var(--accent-cyan)]/60 hover:bg-[var(--accent-cyan)]/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] glow-cyan-subtle'
                    : isActive(link.href)
                    ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5'
                }`}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.label}
              </a>
            ))}
            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setDesktopMoreOpen(!desktopMoreOpen)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] flex items-center gap-1 ${
                  secondaryLinks.some(l => isActive(l.href))
                    ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5'
                }`}
              >
                More
                <svg className={`w-3 h-3 transition-transform ${desktopMoreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {desktopMoreOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDesktopMoreOpen(false)} />
                  <div className="absolute left-0 mt-2 w-48 card p-2 shadow-xl z-50 animate-in fade-in duration-200">
                    {secondaryLinks.map(link => (
                      <a
                        key={link.href}
                        href={link.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive(link.href)
                            ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)]'
                        }`}
                        onClick={() => setDesktopMoreOpen(false)}
                      >
                        {link.label}
                        {link.comingSoon && (
                          <span className="text-[10px] font-medium text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded-md">
                            Soon
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-1">
            {/* Search Button with ⌘K hint */}
            <button
              onClick={globalSearch.open}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)] rounded-lg transition-all flex items-center gap-2"
              title="Search (⌘K)"
              aria-label="Open search"
            >
              <Search className="w-5 h-5" />
              <span className="text-xs text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                ⌘K
              </span>
            </button>

            {/* Notification Bell */}
            <NotificationBell />
            
            <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
            
            {/* Connect Wallet CTA Button */}
            {!wallet.connected && (
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)] text-sm font-semibold hover:border-[var(--accent-cyan)]/60 hover:bg-[var(--accent-cyan)]/5 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 glow-cyan-subtle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z" />
                </svg>
                Connect Wallet
              </a>
            )}
            {wallet.connected && wallet.address ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)] transition-all min-h-[44px] group"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-medium text-[var(--accent-green)]">Connected</span>
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
                    </span>
                  </div>
                  <span className="lg:hidden text-xs font-mono text-[var(--accent-green)]">
                    {wallet.address.slice(0, 6)}...
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 card p-2 shadow-xl z-50 animate-in fade-in duration-200">
                    <div className="px-3 py-2 border-b border-[var(--border-color)] mb-2">
                      <p className="text-xs text-[var(--text-tertiary)] font-mono break-all">
                        {wallet.address}
                      </p>
                      <p className="text-xs text-[var(--accent-green)] mt-1">
                        Σ {parseFloat(wallet.balance.erg).toFixed(4)} ERG
                      </p>
                    </div>
                    <a
                      href="/dashboard"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white transition-colors min-h-[40px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm16 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2h14z" />
                      </svg>
                      Dashboard
                    </a>
                    <a
                      href="/agents/register"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white transition-colors min-h-[40px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Register Agent
                    </a>
                    <a
                      href="/tasks/create"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white transition-colors min-h-[40px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Post Task
                    </a>
                    <div className="border-t border-[var(--border-color)] my-2"></div>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-colors min-h-[40px] w-full text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <WalletConnect />
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-1">
            {/* Mobile Connect Wallet CTA Button */}
            {!wallet.connected && (
              <a
                href="/dashboard"
                className="p-2 text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/5 border-2 border-[var(--accent-cyan)]/40 hover:border-[var(--accent-cyan)]/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-lg transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Connect Wallet"
                aria-label="Connect Wallet"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z" />
                </svg>
              </a>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setOpen(!open)} 
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)] rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform">
                <path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-xl animate-in slide-in-from-top duration-200">
          <div className="container p-4 space-y-1">
            {/* Primary Navigation Links */}
            {primaryLinks.map(link => (
              <a 
                key={link.href} 
                href={link.href} 
                className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                  link.highlight && !isActive(link.href)
                    ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20'
                    : isActive(link.href)
                    ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)]'
                }`}
                onClick={() => setOpen(false)}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.label}
              </a>
            ))}
            
            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] w-full text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)]"
                aria-expanded={mobileMoreOpen}
                aria-haspopup="true"
              >
                <span>More</span>
                <svg className={`w-4 h-4 transition-transform ${mobileMoreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Secondary Navigation Links */}
              {mobileMoreOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l-2 border-[var(--border-color)] pl-4">
                  {secondaryLinks.map(link => (
                    <a 
                      key={link.href} 
                      href={link.href} 
                      className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                        link.href === '/trust'
                          ? isActive(link.href)
                            ? 'text-[var(--accent-green)] bg-[var(--accent-green)]/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--accent-green)] hover:bg-[var(--bg-card)]'
                          : isActive(link.href)
                            ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                            : 'text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)]'
                      }`}
                      onClick={() => {
                        setOpen(false);
                        setMobileMoreOpen(false);
                      }}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                    >
                      <div className="flex items-center gap-3">
                        {link.href === '/trust' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )}
                        {link.label}
                      </div>
                      {link.comingSoon && (
                        <span className="text-[10px] font-medium text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-1.5 py-0.5 rounded-md">
                          Soon
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
            
            {wallet.connected && wallet.address ? (
              <div className="pt-3 mt-3 border-t border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--accent-green)] animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--accent-green)]">
                      Connected — Σ {parseFloat(wallet.balance.erg).toFixed(4)} ERG
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">
                      {wallet.address.slice(0, 12)}...{wallet.address.slice(-4)}
                    </span>
                  </div>
                </div>
                
                <a href="/agents/register" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)] transition-all min-h-[44px]" onClick={() => setOpen(false)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Register Agent
                </a>
                <a href="/tasks/create" className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)] transition-all min-h-[44px]" onClick={() => setOpen(false)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Post Task
                </a>
                <button onClick={() => { disconnect(); setOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all min-h-[44px] w-full text-left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="pt-3 mt-3 border-t border-[var(--border-color)]">
                <WalletConnect />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      <GlobalSearch isOpen={globalSearch.isOpen} onClose={globalSearch.close} />
    </nav>
  );
}
