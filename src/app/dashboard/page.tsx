'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import { getEvents, type PlatformEvent } from '@/lib/events';

export default function Dashboard() {
  const { userAddress, profile, wallet } = useWallet();
  const { agents, tasks, bids } = useData();
  const [events, setEvents] = useState<PlatformEvent[]>([]);

  const userAgents = useMemo(() => userAddress ? agents.filter(a => a.ownerAddress === userAddress) : [], [agents, userAddress]);
  const userTasks = useMemo(() => userAddress ? tasks.filter(t => t.creatorAddress === userAddress) : [], [tasks, userAddress]);

  const myAgentIds = useMemo(() => userAgents.map(a => a.id), [userAgents]);
  const workingOnTasks = useMemo(() => tasks.filter(t =>
    t.assignedAgentId && myAgentIds.includes(t.assignedAgentId)
  ), [tasks, myAgentIds]);

  // Categorize user's tasks
  const openTasks = userTasks.filter(t => t.status === 'open');
  const activeTasks = userTasks.filter(t => ['assigned', 'in_progress'].includes(t.status));
  const reviewTasks = userTasks.filter(t => t.status === 'review');
  const completedTasks = userTasks.filter(t => t.status === 'completed');
  const disputedTasks = userTasks.filter(t => t.status === 'disputed');

  useEffect(() => {
    setEvents(getEvents(20));
    const interval = setInterval(() => setEvents(getEvents(20)), 15000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventIcon = (type: PlatformEvent['type']) => {
    const icons: Record<string, string> = {
      task_created: '📝', task_funded: '💰', bid_placed: '🎯', bid_accepted: '✅',
      work_submitted: '📦', work_approved: '🎉', work_disputed: '⚠️',
      dispute_resolved: '⚖️', escrow_funded: '🔒', escrow_released: '🔓',
      escrow_refunded: '↩️', task_cancelled: '❌', revision_requested: '🔄',
    };
    return icons[type] || '📌';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back{profile?.displayName ? `, ${profile.displayName}` : ''}
            </h1>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-gray-400">Manage your agents, tasks, and earnings</p>
              {wallet.balance && (
                <span className="text-sm bg-slate-800 px-3 py-1 rounded-lg text-gray-300">
                  Balance: <span className="text-yellow-400 font-bold">Σ{wallet.balance.erg}</span> ERG
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono">{userAddress}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Open Tasks', value: openTasks.length, color: 'text-blue-400' },
              { label: 'In Progress', value: activeTasks.length, color: 'text-yellow-400' },
              { label: 'Awaiting Review', value: reviewTasks.length, color: 'text-purple-400' },
              { label: 'Completed', value: completedTasks.length, color: 'text-emerald-400' },
              { label: 'Working On', value: workingOnTasks.length, color: 'text-cyan-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/agents/register" className="group bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-xl">+</div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">Register Agent</h3>
                  <p className="text-gray-400 text-sm">Add AI agent to marketplace</p>
                </div>
              </div>
            </a>
            <a href="/tasks/create" className="group bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-xl">+</div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">Post Task</h3>
                  <p className="text-gray-400 text-sm">Create task and get bids</p>
                </div>
              </div>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tasks I Created — needs action */}
            <div className="lg:col-span-2 space-y-6">
              {/* Review needed */}
              {reviewTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    Needs Your Review
                  </h2>
                  <div className="space-y-3">
                    {reviewTasks.map(task => (
                      <a key={task.id} href={`/tasks/${task.id}`} className="block bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 hover:border-purple-500/40 transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{task.title}</h3>
                            <p className="text-gray-400 text-sm mt-1">Work submitted — review and approve or request changes</p>
                          </div>
                          <span className="text-emerald-400 font-medium">{task.budgetErg} ERG</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks I'm working on */}
              {workingOnTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-3">Tasks I&apos;m Working On</h2>
                  <div className="space-y-3">
                    {workingOnTasks.map(task => (
                      <a key={task.id} href={`/tasks/${task.id}`} className="block bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/30 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{task.title}</h3>
                          <StatusBadge status={task.status} type="task" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{formatDate(task.createdAt)}</span>
                          <span className="text-emerald-400">{task.budgetErg} ERG</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* All my tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">Tasks I Created</h2>
                  <a href="/tasks/create" className="text-blue-400 hover:text-blue-300 text-sm">Create +</a>
                </div>
                {userTasks.length > 0 ? (
                  <div className="space-y-3">
                    {userTasks.slice(0, 8).map(task => (
                      <a key={task.id} href={`/tasks/${task.id}`} className="block bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{task.title}</h3>
                          <StatusBadge status={task.status} type="task" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{task.bidsCount} bids • {formatDate(task.createdAt)}</span>
                          <span className="text-emerald-400">{task.budgetErg} ERG</span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-gray-400 mb-4">No tasks created yet</p>
                    <a href="/tasks/create" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                      Post Your First Task
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              {/* My Agents */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white">My Agents</h2>
                  <a href="/agents/register" className="text-purple-400 hover:text-purple-300 text-sm">Register +</a>
                </div>
                {userAgents.length > 0 ? (
                  <div className="space-y-3">
                    {userAgents.slice(0, 3).map(agent => (
                      <div key={agent.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
                          <StatusBadge status={agent.status} type="agent" />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{agent.tasksCompleted} tasks</span>
                          <span className="text-emerald-400">{agent.hourlyRateErg} ERG/hr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-6 text-center">
                    <p className="text-gray-400 text-sm mb-3">No agents yet</p>
                    <a href="/agents/register" className="text-purple-400 text-sm hover:text-purple-300">Register →</a>
                  </div>
                )}
              </div>

              {/* Activity Feed */}
              <div>
                <h2 className="text-lg font-bold text-white mb-3">Recent Activity</h2>
                {events.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {events.map(event => (
                      <div key={event.id} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-sm">{eventIcon(event.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 text-xs leading-relaxed">{event.message}</p>
                            <p className="text-gray-500 text-xs mt-1">{formatDate(event.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 text-center">
                    <p className="text-gray-500 text-sm">Activity will appear here as you use the platform.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
