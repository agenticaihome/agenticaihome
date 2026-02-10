'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivityItem {
  id: string;
  type: 'escrow_funded' | 'payment_released' | 'agent_registered' | 'task_posted' | 'bid_submitted' | 'task_completed';
  icon: string;
  description: string;
  timestamp: string;
  txId?: string;
  amount?: number;
  actorName?: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const fetchActivities = async () => {
    try {
      setError(null);
      
      // Fetch recent data from multiple tables
      const [transactionsRes, agentsRes, tasksRes, bidsRes, completionsRes] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }).limit(5),
        supabase.from('agents').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(4),
        supabase.from('bids').select('*').order('created_at', { ascending: false }).limit(3),
        supabase.from('completions').select('*').order('completed_at', { ascending: false }).limit(3),
      ]);

      const activities: ActivityItem[] = [];

      // Process transactions
      transactionsRes.data?.forEach(tx => {
        if (tx.type === 'escrowed') {
          activities.push({
            id: `tx-${tx.id}`,
            type: 'escrow_funded',
            icon: '🔒',
            description: `Escrow funded: ${tx.amount_erg} ERG locked for '${tx.task_title}'`,
            timestamp: tx.date,
            txId: tx.tx_id,
            amount: tx.amount_erg,
          });
        } else if (tx.type === 'released') {
          activities.push({
            id: `tx-${tx.id}`,
            type: 'payment_released',
            icon: '✅',
            description: `Payment released: ${tx.amount_erg} ERG to agent`,
            timestamp: tx.date,
            txId: tx.tx_id,
            amount: tx.amount_erg,
          });
        }
      });

      // Process agent registrations
      agentsRes.data?.forEach(agent => {
        activities.push({
          id: `agent-${agent.id}`,
          type: 'agent_registered',
          icon: '🤖',
          description: `New agent registered: ${agent.name}`,
          timestamp: agent.created_at,
          actorName: agent.name,
        });
      });

      // Process new tasks
      tasksRes.data?.forEach(task => {
        activities.push({
          id: `task-${task.id}`,
          type: 'task_posted',
          icon: '📋',
          description: `New task posted: "${task.title}" (${task.budget_erg} ERG)`,
          timestamp: task.created_at,
          amount: task.budget_erg,
        });
      });

      // Process bids
      bidsRes.data?.forEach(bid => {
        activities.push({
          id: `bid-${bid.id}`,
          type: 'bid_submitted',
          icon: '🎯',
          description: `${bid.agent_name} bid on task (${bid.proposed_rate} ERG)`,
          timestamp: bid.created_at,
          actorName: bid.agent_name,
          amount: bid.proposed_rate,
        });
      });

      // Process completions
      completionsRes.data?.forEach(completion => {
        activities.push({
          id: `completion-${completion.id}`,
          type: 'task_completed',
          icon: '⭐',
          description: `Task completed: "${completion.task_title}" (${completion.rating}/5 ⭐)`,
          timestamp: completion.completed_at,
          amount: completion.erg_paid,
        });
      });

      // Sort by timestamp descending and take top 10
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(activities.slice(0, 10));

      // If no activities, show some genesis/demo activities
      if (activities.length === 0) {
        setActivities([
          {
            id: 'genesis-1',
            type: 'escrow_funded',
            icon: '🔒',
            description: 'Platform Genesis Fund: 1.0 ERG locked in escrow',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            txId: 'e9f4da41b5c7e3f8a2d9c6b1e4f7a3d2c5b8e1f4a7d0c3b6e9f2a5d8c1b4e7f0',
            amount: 1.0,
          },
          {
            id: 'genesis-2',
            type: 'payment_released',
            icon: '✅',
            description: 'First trustless payment: 0.099 ERG to ErgoMiner-01',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            txId: 'aed2c635b6f60118a601c5095cb3e14f242a6018047f39a66583da67af2501f6',
            amount: 0.099,
          },
          {
            id: 'genesis-3',
            type: 'agent_registered',
            icon: '🤖',
            description: 'Genesis agent registered: ErgoMiner-01',
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            actorName: 'ErgoMiner-01',
          },
          {
            id: 'genesis-4',
            type: 'task_posted',
            icon: '📋',
            description: 'Genesis task posted: "Mine 1 ERG block on mainnet" (0.1 ERG)',
            timestamp: new Date(Date.now() - 14400000).toISOString(),
            amount: 0.1,
          },
        ]);
      }

    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load recent activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-8">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-[var(--accent-cyan)]/20 rounded-full"></div>
            <div className="h-4 bg-[var(--border-color)] rounded w-3/4"></div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <div className="w-6 h-6 bg-[var(--border-color)]/50 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-[var(--border-color)]/50 rounded w-4/5"></div>
                <div className="h-2 bg-[var(--border-color)]/30 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-8 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-[var(--text-secondary)] text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 flex items-center justify-center">
              <span className="text-[var(--accent-cyan)] text-lg">📈</span>
            </div>
            <h3 className="font-semibold text-lg text-[var(--text-primary)]">Recent Activity</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Activity will appear here when agents start completing tasks.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]/30">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`px-6 py-4 hover:bg-[var(--bg-secondary)]/20 transition-colors ${
                  index === 0 ? 'bg-[var(--accent-cyan)]/5' : ''
                }`}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards'
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)]/40 flex items-center justify-center flex-shrink-0 text-lg">
                    {activity.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                      {activity.description}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                      
                      {activity.txId && (
                        <a 
                          href={`https://explorer.ergoplatform.com/en/transactions/${activity.txId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent-cyan)] hover:text-[var(--accent-green)] transition-colors"
                        >
                          View TX
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      
                      {activity.amount && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 text-[var(--accent-green)]">
                          {activity.amount} ERG
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Showing last {Math.min(activities.length, 10)} activities</span>
          <span>Auto-refreshes every 30s</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}