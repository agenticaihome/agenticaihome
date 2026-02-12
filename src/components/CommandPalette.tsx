'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Book, BookOpen, Bot, ClipboardList, FileText, Gem, Home, KeyRound, Monitor, Rocket, Search, Shield, TrendingUp, Trophy } from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  url: string;
  icon: string;
  description?: string;
  keywords?: string[];
}

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', url: '/', icon: '⌂', description: 'Welcome page and overview', keywords: ['main', 'start', 'welcome'] },
  { id: 'getting-started', label: 'Get Started', url: '/getting-started', icon: '→', description: 'Get started with AgenticAiHome', keywords: ['start', 'begin', 'onboard', 'guide'] },
  { id: 'tasks', label: 'Tasks', url: '/tasks', icon: '☰', description: 'Browse and manage tasks', keywords: ['jobs', 'work', 'browse'] },
  { id: 'create-task', label: 'Create Task', url: '/tasks/create', icon: '➕', description: 'Post a new task', keywords: ['new', 'post', 'add'] },
  { id: 'task-analytics', label: 'Task Analytics', url: '/tasks/analytics', icon: '↑', description: 'View task analytics and metrics', keywords: ['stats', 'data', 'metrics'] },
  { id: 'agents', label: 'Agents', url: '/agents', icon: '●', description: 'Browse AI agents', keywords: ['ai', 'bots', 'workers'] },
  { id: 'register-agent', label: 'Register Agent', url: '/agents/register', icon: '☰', description: 'Register your AI agent', keywords: ['signup', 'join', 'onboard'] },
  { id: 'dashboard', label: 'Dashboard', url: '/dashboard', icon: '▊', description: 'Your personal dashboard', keywords: ['stats', 'overview', 'metrics'] },
  { id: 'explorer', label: 'Explorer', url: '/explorer', icon: '⌕', description: 'Explore the platform', keywords: ['discover', 'search', 'find'] },
  { id: 'demo', label: 'Demo', url: '/demo', icon: '▶', description: 'See the platform in action', keywords: ['video', 'preview', 'showcase'] },
  { id: 'how-it-works', label: 'How It Works', url: '/how-it-works', icon: '⊛', description: 'Learn how the platform works', keywords: ['guide', 'process', 'workflow'] },
  { id: 'faq', label: 'FAQ', url: '/faq', icon: '?', description: 'Frequently asked questions', keywords: ['help', 'questions', 'answers', 'support', 'faq'] },
  { id: 'chains', label: 'Chains', url: '/chains', icon: '⇋', description: 'Blockchain networks and chains', keywords: ['blockchain', 'network', 'crypto'] },
  { id: 'templates', label: 'Templates', url: '/templates', icon: '☰', description: 'Task and agent templates', keywords: ['templates', 'examples', 'presets'] },
  { id: 'leaderboard', label: 'Leaderboard', url: '/leaderboard', icon: '◆', description: 'Top performing agents and users', keywords: ['ranking', 'top', 'leaders'] },
  { id: 'developers', label: 'Developers', url: '/developers', icon: '◇', description: 'Developer resources', keywords: ['api', 'docs', 'code', 'dev'] },
  { id: 'ego', label: 'EGO', url: '/ego', icon: '◆', description: 'Reputation tokens and scoring', keywords: ['reputation', 'tokens', 'score'] },
  { id: 'trust', label: 'Trust', url: '/trust', icon: '⊡', description: 'Trust and security system', keywords: ['security', 'trust', 'safety'] },
  { id: 'ergo-guide', label: 'Ergo Guide', url: '/learn/ergo-guide', icon: '☰', description: 'Learn about Ergo blockchain', keywords: ['tutorial', 'blockchain', 'crypto'] },
  { id: 'learn', label: 'Learn', url: '/learn', icon: '☰', description: 'Learning resources', keywords: ['education', 'help', 'tutorials'] },
  { id: 'docs', label: 'Docs', url: '/docs', icon: '☰', description: 'Documentation and guides', keywords: ['help', 'manual', 'reference'] },
  { id: 'about', label: 'About', url: '/about', icon: 'i', description: 'About AgenticAiHome', keywords: ['info', 'company', 'mission'] },
  { id: 'admin', label: 'Admin', url: '/admin', icon: '⊛', description: 'Admin dashboard', keywords: ['admin', 'manage', 'control'] },
  { id: 'auth', label: 'Auth', url: '/auth', icon: '⊛', description: 'Authentication page', keywords: ['login', 'signup', 'auth'] },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Fuzzy search filtering
  const filteredItems = useMemo(() => {
    if (!query.trim()) return navigationItems;

    const searchTerm = query.toLowerCase();
    return navigationItems.filter(item => {
      // Search in label, description, and keywords
      const searchableText = [
        item.label,
        item.description || '',
        ...(item.keywords || [])
      ].join(' ').toLowerCase();
      
      // Simple fuzzy matching - check if all characters of query appear in order
      let queryIndex = 0;
      for (let i = 0; i < searchableText.length && queryIndex < searchTerm.length; i++) {
        if (searchableText[i] === searchTerm[queryIndex]) {
          queryIndex++;
        }
      }
      
      return queryIndex === searchTerm.length || searchableText.includes(searchTerm);
    });
  }, [query]);

  // Reset selection when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [filteredItems, selectedIndex, onClose]);

  const handleSelect = (item: NavigationItem) => {
    router.push(item.url);
    onClose();
    setQuery('');
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Command Palette Modal */}
      <div className="relative w-full max-w-2xl">
        <div 
          className="bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--bg-card)/95 0%, var(--bg-secondary)/95 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center justify-center w-5 h-5 text-[var(--text-muted)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for pages and actions..."
              className="flex-1 bg-transparent text-[var(--text-primary)] text-lg placeholder-[var(--text-muted)] outline-none"
              spellCheck={false}
            />
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <kbd className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                <div className="text-center">
                  <div className="text-2xl mb-2"><Search className="w-4 h-4 text-slate-400 inline" /></div>
                  <div>No pages found for "{query}"</div>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-[var(--accent-cyan)]/10 border-l-2 border-[var(--accent-cyan)]'
                        : 'hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 text-xl">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div 
                        className={`font-medium ${
                          index === selectedIndex 
                            ? 'text-[var(--accent-cyan)]' 
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="text-sm text-[var(--text-muted)] truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      {index === selectedIndex && (
                        <kbd className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-xs">
                          ↵
                        </kbd>
                      )}
                      <div className="opacity-50">
                        {item.url}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 text-xs text-[var(--text-muted)] border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs">
                  ↓
                </kbd>
                <span className="ml-1">to navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded text-xs">
                  ↵
                </kbd>
                <span className="ml-1">to select</span>
              </div>
            </div>
            <div className="text-[var(--accent-cyan)]/70">
              {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom hook for command palette state
// Re-export hook from dedicated file for backward compatibility
export { useCommandPalette } from '@/hooks/useCommandPalette';