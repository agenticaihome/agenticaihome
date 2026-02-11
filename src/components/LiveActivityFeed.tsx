'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface LiveActivityItem {
  id: string;
  type: 'task_posted' | 'bid_submitted' | 'task_completed' | 'agent_registered' | 'escrow_funded' | 'payment_released';
  message: string;
  timestamp: string;
  actorName?: string;
  amount?: number;
  taskTitle?: string;
  txId?: string;
}

interface LiveActivityFeedProps {
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export default function LiveActivityFeed({ 
  maxItems = 20, 
  showHeader = true, 
  compact = false,
  className = ''
}: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<LiveActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const lastActivityRef = useRef<string | null>(null);

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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_posted': return '📋';
      case 'bid_submitted': return '🎯';
      case 'task_completed': return '✅';
      case 'agent_registered': return '🤖';
      case 'escrow_funded': return '🔒';
      case 'payment_released': return '💰';
      default: return '📈';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'task_posted': return 'text-[var(--accent-cyan)]';
      case 'bid_submitted': return 'text-blue-400';
      case 'task_completed': return 'text-[var(--accent-green)]';
      case 'agent_registered': return 'text-purple-400';
      case 'escrow_funded': return 'text-orange-400';
      case 'payment_released': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);

      // Fetch recent tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, budget_erg, created_at, creator_name, status')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent bids
      const { data: bids } = await supabase
        .from('bids')
        .select('id, agent_name, amount_erg, created_at, task_id')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent agents
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent transactions (escrow/payments)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, type, amount_erg, date, task_title, tx_id')
        .order('date', { ascending: false })
        .limit(10);

      const activityItems: LiveActivityItem[] = [];

      // Process tasks
      tasks?.forEach(task => {
        if (task.status === 'completed') {
          activityItems.push({
            id: `task-completed-${task.id}`,
            type: 'task_completed',
            message: `Task completed: "${task.title}" — $${(Number(task.budget_erg) * 8).toFixed(0)} (${task.budget_erg} ERG)`,
            timestamp: task.created_at,
            taskTitle: task.title,
            amount: task.budget_erg
          });
        } else {
          activityItems.push({
            id: `task-${task.id}`,
            type: 'task_posted',
            message: `New task posted: "${task.title}" — $${(Number(task.budget_erg) * 8).toFixed(0)} (${task.budget_erg} ERG)`,
            timestamp: task.created_at,
            taskTitle: task.title,
            amount: task.budget_erg,
            actorName: task.creator_name
          });
        }
      });

      // Process bids - fetch task titles
      if (bids && bids.length > 0) {
        const taskIds = [...new Set(bids.map(bid => (bid as any).task_id).filter(Boolean))];
        const { data: taskTitles } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);

        const titleMap = new Map(taskTitles?.map(t => [t.id, t.title]) || []);

        bids.forEach(bid => {
          const taskTitle = titleMap.get((bid as any).task_id) || 'task';
          activityItems.push({
            id: `bid-${bid.id}`,
            type: 'bid_submitted',
            message: `${(bid as any).agent_name || 'Agent'} bid ${(bid as any).amount_erg} ERG on "${taskTitle}"`,
            timestamp: (bid as any).created_at,
            actorName: (bid as any).agent_name,
            amount: (bid as any).amount_erg,
            taskTitle
          });
        });
      }

      // Process agent registrations
      agents?.forEach(agent => {
        activityItems.push({
          id: `agent-${agent.id}`,
          type: 'agent_registered',
          message: `New agent registered: ${agent.name}`,
          timestamp: agent.created_at,
          actorName: agent.name
        });
      });

      // Process transactions
      transactions?.forEach(tx => {
        if (tx.type === 'escrowed') {
          activityItems.push({
            id: `escrow-${tx.id}`,
            type: 'escrow_funded',
            message: `Escrow funded: ${tx.amount_erg} ERG locked for "${tx.task_title || 'task'}"`,
            timestamp: tx.date,
            amount: tx.amount_erg,
            txId: tx.tx_id
          });
        } else if (tx.type === 'released') {
          activityItems.push({
            id: `payment-${tx.id}`,
            type: 'payment_released',
            message: `Payment released: ${tx.amount_erg} ERG earned for completing "${tx.task_title || 'task'}"`,
            timestamp: tx.date,
            amount: tx.amount_erg,
            txId: tx.tx_id
          });
        }
      });

      // Sort by timestamp and take most recent
      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const recentActivities = activityItems.slice(0, maxItems);

      setActivities(recentActivities);

    } catch (error) {
      console.error('Error fetching activity:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchRecentActivity();

    // Subscribe to tasks table
    const tasksSubscription = supabase
      .channel('live-tasks')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          const newTask = payload.new as any;
          const newActivity: LiveActivityItem = {
            id: `task-${newTask.id}-${Date.now()}`,
            type: 'task_posted',
            message: `New task posted: "${newTask.title}" — $${(Number(newTask.budget_erg) * 8).toFixed(0)} (${newTask.budget_erg} ERG)`,
            timestamp: newTask.created_at,
            taskTitle: newTask.title,
            amount: newTask.budget_erg,
            actorName: newTask.creator_name
          };
          
          setActivities(prev => {
            const updated = [newActivity, ...prev].slice(0, maxItems);
            // Track new activity for animation
            if (lastActivityRef.current !== newActivity.id) {
              setNewActivityCount(c => c + 1);
              lastActivityRef.current = newActivity.id;
            }
            return updated;
          });
        }
      )
      .subscribe();

    // Subscribe to bids table
    const bidsSubscription = supabase
      .channel('live-bids')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        async (payload) => {
          const newBid = payload.new as any;
          
          // Fetch task title for the bid
          const { data: task } = await supabase
            .from('tasks')
            .select('title')
            .eq('id', newBid.task_id)
            .single();

          const newActivity: LiveActivityItem = {
            id: `bid-${newBid.id}-${Date.now()}`,
            type: 'bid_submitted',
            message: `${newBid.agent_name || 'Agent'} bid ${newBid.amount_erg} ERG on "${task?.title || 'task'}"`,
            timestamp: newBid.created_at,
            actorName: newBid.agent_name,
            amount: newBid.amount_erg,
            taskTitle: task?.title
          };

          setActivities(prev => {
            const updated = [newActivity, ...prev].slice(0, maxItems);
            if (lastActivityRef.current !== newActivity.id) {
              setNewActivityCount(c => c + 1);
              lastActivityRef.current = newActivity.id;
            }
            return updated;
          });
        }
      )
      .subscribe();

    // Subscribe to agents table
    const agentsSubscription = supabase
      .channel('live-agents')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agents' },
        (payload) => {
          const newAgent = payload.new as any;
          const newActivity: LiveActivityItem = {
            id: `agent-${newAgent.id}-${Date.now()}`,
            type: 'agent_registered',
            message: `New agent registered: ${newAgent.name}`,
            timestamp: newAgent.created_at,
            actorName: newAgent.name
          };

          setActivities(prev => {
            const updated = [newActivity, ...prev].slice(0, maxItems);
            if (lastActivityRef.current !== newActivity.id) {
              setNewActivityCount(c => c + 1);
              lastActivityRef.current = newActivity.id;
            }
            return updated;
          });
        }
      )
      .subscribe();

    // Subscribe to completions/transactions for payment events
    const transactionsSubscription = supabase
      .channel('live-transactions')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const newTx = payload.new as any;
          let newActivity: LiveActivityItem | null = null;

          if (newTx.type === 'escrowed') {
            newActivity = {
              id: `escrow-${newTx.id}-${Date.now()}`,
              type: 'escrow_funded',
              message: `Escrow funded: ${newTx.amount_erg} ERG locked for "${newTx.task_title || 'task'}"`,
              timestamp: newTx.date,
              amount: newTx.amount_erg,
              txId: newTx.tx_id
            };
          } else if (newTx.type === 'released') {
            newActivity = {
              id: `payment-${newTx.id}-${Date.now()}`,
              type: 'payment_released',
              message: `Payment released: ${newTx.amount_erg} ERG earned for completing "${newTx.task_title || 'task'}"`,
              timestamp: newTx.date,
              amount: newTx.amount_erg,
              txId: newTx.tx_id
            };
          }

          if (newActivity) {
            setActivities(prev => {
              const updated = [newActivity!, ...prev].slice(0, maxItems);
              if (lastActivityRef.current !== newActivity!.id) {
                setNewActivityCount(c => c + 1);
                lastActivityRef.current = newActivity!.id;
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      bidsSubscription.unsubscribe();
      agentsSubscription.unsubscribe();
      transactionsSubscription.unsubscribe();
    };
  }, [maxItems]);

  // Auto-clear new activity indicator
  useEffect(() => {
    if (newActivityCount > 0) {
      const timer = setTimeout(() => setNewActivityCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [newActivityCount]);

  if (loading) {
    return (
      <div className={`${compact ? 'bg-transparent' : 'bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg'} ${className}`}>
        <div className="p-6 animate-pulse">
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

  const containerClasses = compact 
    ? `${className}` 
    : `bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg overflow-hidden ${className}`;

  return (
    <div className={containerClasses}>
      {/* Header */}
      {showHeader && (
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 flex items-center justify-center">
                <span className="text-[var(--accent-cyan)] text-lg">📈</span>
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">Live Activity</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
              <span>Live</span>
              {newActivityCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-[var(--accent-cyan)] text-white text-xs rounded-full font-bold animate-pulse">
                  {newActivityCount} new
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className={`${compact ? 'max-h-80' : 'max-h-96'} overflow-y-auto`}>
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-[var(--text-secondary)] text-sm">
              Live activity will appear here when agents start completing tasks.
            </p>
          </div>
        ) : (
          <div className={`${compact ? '' : 'divide-y divide-[var(--border-color)]/30'}`}>
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`${compact ? 'px-3 py-2' : 'px-6 py-4'} hover:bg-[var(--bg-secondary)]/20 transition-colors cursor-pointer ${
                  index === 0 ? 'bg-[var(--accent-cyan)]/5 activity-slide-in' : ''
                }`}
                onClick={() => {
                  if (activity.txId) {
                    window.open(`https://explorer.ergoplatform.com/en/transactions/${activity.txId}`, '_blank');
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`${compact ? 'w-6 h-6 text-sm' : 'w-8 h-8 text-lg'} rounded-full bg-[var(--bg-secondary)]/40 flex items-center justify-center flex-shrink-0`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`${compact ? 'text-xs' : 'text-sm'} text-[var(--text-primary)] leading-relaxed`}>
                      {activity.message}
                    </p>
                    
                    {/* Metadata */}
                    <div className={`flex items-center gap-3 mt-1 ${compact ? 'text-xs' : 'text-xs'} text-[var(--text-muted)]`}>
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                      
                      {activity.amount && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 ${getActivityColor(activity.type)}`}>
                          {activity.amount} ERG
                        </span>
                      )}

                      {activity.txId && (
                        <span className="text-[var(--accent-cyan)] hover:text-[var(--accent-green)] cursor-pointer">
                          View TX ↗
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
      {!compact && (
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Showing last {Math.min(activities.length, maxItems)} activities</span>
            <span>Real-time updates</span>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .activity-slide-in {
          animation: slideInRight 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}