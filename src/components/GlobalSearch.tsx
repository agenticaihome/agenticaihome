'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Users, Briefcase, Link, FileText, ArrowRight, Command } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Agent, Task } from '@/lib/types';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'agent' | 'chain' | 'template';
  url: string;
  metadata?: Record<string, any>;
}

interface SearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// In production, these would be fetched from the database
const chains: any[] = []; // No chains available yet
const templates: any[] = []; // No templates available yet

export default function GlobalSearch({ isOpen, onClose }: SearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { agents, tasks, ensureLoaded } = useData();

  // Ensure data is loaded when component mounts
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  // Search function
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    // Search tasks
    tasks
      .filter(task => 
        task.title.toLowerCase().includes(searchTerm) || 
        task.description.toLowerCase().includes(searchTerm) ||
        task.skillsRequired.some(skill => skill.toLowerCase().includes(searchTerm))
      )
      .slice(0, 3)
      .forEach(task => {
        results.push({
          id: task.id,
          title: task.title,
          description: task.description,
          type: 'task',
          url: `/tasks/detail?id=${task.id}`,
          metadata: {
            status: task.status,
            budget: task.budgetErg,
            skills: task.skillsRequired
          }
        });
      });

    // Search agents
    agents
      .filter(agent => 
        agent.name.toLowerCase().includes(searchTerm) || 
        agent.description.toLowerCase().includes(searchTerm) ||
        agent.skills.some(skill => skill.toLowerCase().includes(searchTerm))
      )
      .slice(0, 3)
      .forEach(agent => {
        results.push({
          id: agent.id,
          title: agent.name,
          description: agent.description,
          type: 'agent',
          url: `/agents/${agent.id}`,
          metadata: {
            rating: agent.rating,
            egoScore: agent.egoScore,
            skills: agent.skills,
            status: agent.status
          }
        });
      });

    // Search chains (real data - currently empty)
    chains
      .filter(chain => 
        chain.name.toLowerCase().includes(searchTerm) || 
        chain.description.toLowerCase().includes(searchTerm)
      )
      .slice(0, 2)
      .forEach(chain => {
        results.push({
          id: chain.id,
          title: chain.name,
          description: chain.description,
          type: 'chain',
          url: chain.url
        });
      });

    // Search templates (real data - currently empty)
    templates
      .filter(template => 
        template.name.toLowerCase().includes(searchTerm) || 
        template.description.toLowerCase().includes(searchTerm)
      )
      .slice(0, 2)
      .forEach(template => {
        results.push({
          id: template.id,
          title: template.name,
          description: template.description,
          type: 'template',
          url: template.url
        });
      });

    return results;
  }, [query, tasks, agents]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      task: [],
      agent: [],
      chain: [],
      template: []
    };

    searchResults.forEach(result => {
      groups[result.type].push(result);
    });

    return groups;
  }, [searchResults]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            window.location.href = searchResults[selectedIndex].url;
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return <Briefcase className="w-4 h-4" />;
      case 'agent': return <Users className="w-4 h-4" />;
      case 'chain': return <Link className="w-4 h-4" />;
      case 'template': return <FileText className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Tasks';
      case 'agent': return 'Agents';
      case 'chain': return 'Chains';
      case 'template': return 'Templates';
      default: return '';
    }
  };

  const getStatusBadge = (result: SearchResult) => {
    if (result.type === 'task') {
      const statusColors = {
        open: 'bg-blue-500/20 text-blue-400',
        assigned: 'bg-yellow-500/20 text-yellow-400',
        in_progress: 'bg-purple-500/20 text-purple-400',
        review: 'bg-orange-500/20 text-orange-400',
        completed: 'bg-green-500/20 text-green-400',
        disputed: 'bg-red-500/20 text-red-400'
      };
      const status = result.metadata?.status as keyof typeof statusColors;
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status] || ''}`}>
          {status}
        </span>
      );
    }
    
    if (result.type === 'agent') {
      const statusColors = {
        available: 'bg-green-500/20 text-green-400',
        busy: 'bg-yellow-500/20 text-yellow-400',
        offline: 'bg-gray-500/20 text-gray-400',
        suspended: 'bg-red-500/20 text-red-400'
      };
      const status = result.metadata?.status as keyof typeof statusColors;
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status] || ''}`}>
          {status}
        </span>
      );
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex items-start justify-center min-h-screen pt-16 px-4">
        <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl animate-in slide-in-from-top duration-200">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)]">
            <Search className="w-5 h-5 text-[var(--text-secondary)]" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tasks, agents, chains, templates..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-[var(--text-tertiary)] text-lg"
            />
            <div className="flex items-center gap-1 text-[var(--text-tertiary)] text-xs">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs">
                <Command className="w-3 h-3" />
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs">K</kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto" ref={resultsRef}>
            {!query.trim() ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="text-[var(--text-secondary)] font-medium mb-2">Search AgenticAiHome</h3>
                <p className="text-[var(--text-tertiary)] text-sm">
                  Find tasks, agents, chains, and templates
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">Tasks</span>
                  <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">Agents</span>
                  <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">Chains</span>
                  <span className="px-2 py-1 bg-[var(--bg-primary)] rounded">Templates</span>
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                <h3 className="text-[var(--text-secondary)] font-medium mb-2">No results found</h3>
                <p className="text-[var(--text-tertiary)] text-sm">
                  Try different keywords or browse categories
                </p>
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(groupedResults).map(([type, results]) => {
                  if (results.length === 0) return null;
                  
                  return (
                    <div key={type} className="mb-4 last:mb-0">
                      <div className="sticky top-0 bg-[var(--bg-card)] px-4 py-2 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                          <div className="text-[var(--accent-cyan)]">
                            {getTypeIcon(type)}
                          </div>
                          <h3 className="text-sm font-medium text-[var(--accent-cyan)]">
                            {getTypeLabel(type)}
                          </h3>
                          <span className="text-[var(--text-tertiary)] text-xs">
                            {results.length}
                          </span>
                        </div>
                      </div>
                      
                      {results.map((result, index) => {
                        const globalIndex = searchResults.indexOf(result);
                        const isSelected = globalIndex === selectedIndex;
                        
                        return (
                          <a
                            key={result.id}
                            href={result.url}
                            onClick={onClose}
                            className={`block px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors ${
                              isSelected ? 'bg-[var(--bg-card-hover)] border-l-2 border-[var(--accent-cyan)]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white truncate">
                                    {result.title}
                                  </h4>
                                  {getStatusBadge(result)}
                                </div>
                                <p className="text-[var(--text-tertiary)] text-sm line-clamp-1">
                                  {result.description}
                                </p>
                                {result.metadata?.skills && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {result.metadata.skills.slice(0, 3).map((skill: string) => (
                                      <span key={skill} className="px-1.5 py-0.5 bg-[var(--bg-primary)] text-[var(--text-tertiary)] text-xs rounded">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {searchResults.length > 0 && (
            <div className="border-t border-[var(--border-color)] px-4 py-3 text-center">
              <p className="text-[var(--text-tertiary)] text-xs">
                Use <kbd className="px-1 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs">↑↓</kbd> to navigate, 
                <kbd className="px-1 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs ml-1">↵</kbd> to select
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for global search functionality
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false)
  };
}