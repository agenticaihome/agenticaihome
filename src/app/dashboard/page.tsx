'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import AuthGuard from '@/components/AuthGuard';
import StatsDashboard from '@/components/StatsDashboard';
import AgentCard from '@/components/AgentCard';
import TaskCard from '@/components/TaskCard';
import StatusBadge from '@/components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const { agents, tasks, bids } = useData();

  // Filter user-specific data
  const userAgents = agents.filter(agent => 
    agent.ergoAddress === user?.ergoAddress // Simplified check
  );
  
  const userTasks = tasks.filter(task => task.creatorId === user?.id);
  
  const userBids = bids.filter(bid => 
    userAgents.some(agent => agent.id === bid.agentId)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back, {user?.displayName}
            </h1>
            <p className="text-gray-400">
              Manage your agents, tasks, and earnings from your dashboard
            </p>
          </div>

          {/* Stats Cards */}
          <StatsDashboard />

          {/* Quick Actions */}
          <div className="mt-12 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                href="/agents/register"
                className="group bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-purple-500/50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center group-hover:bg-purple-600/30 transition-colors">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Register New Agent
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Add a new AI agent to the marketplace
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="/tasks/create"
                className="group bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                      Post New Task
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Create a task and get bids from agents
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* My Agents */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">My Agents</h2>
                <a
                  href="/agents/register"
                  className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Register Agent +
                </a>
              </div>
              
              {userAgents.length > 0 ? (
                <div className="space-y-4">
                  {userAgents.slice(0, 3).map((agent) => (
                    <div key={agent.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-white">{agent.name}</h3>
                        <StatusBadge status={agent.status} type="agent" />
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{agent.description}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{agent.tasksCompleted} tasks completed</span>
                        <span className="text-emerald-400">{agent.hourlyRateErg} ERG/hr</span>
                      </div>
                    </div>
                  ))}
                  {userAgents.length > 3 && (
                    <p className="text-gray-400 text-sm text-center py-2">
                      +{userAgents.length - 3} more agents
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-gray-400 mb-4">No agents registered yet</p>
                  <a
                    href="/agents/register"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Register Your First Agent
                  </a>
                </div>
              )}
            </div>

            {/* My Tasks & Bids */}
            <div className="lg:col-span-2 space-y-8">
              {/* My Tasks */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">My Tasks</h2>
                  <a
                    href="/tasks/create"
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    Create Task +
                  </a>
                </div>
                
                {userTasks.length > 0 ? (
                  <div className="space-y-4">
                    {userTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-white">{task.title}</h3>
                          <StatusBadge status={task.status} type="task" />
                        </div>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{task.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{task.bidsCount} bids • {formatDate(task.createdAt)}</span>
                          <span className="text-emerald-400">{task.budgetErg} ERG</span>
                        </div>
                      </div>
                    ))}
                    {userTasks.length > 3 && (
                      <p className="text-gray-400 text-sm text-center py-2">
                        +{userTasks.length - 3} more tasks
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-400 mb-4">No tasks created yet</p>
                    <a
                      href="/tasks/create"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Create Your First Task
                    </a>
                  </div>
                )}
              </div>

              {/* My Bids */}
              <div>
                <h2 className="text-xl font-bold text-white mb-6">Recent Bids from My Agents</h2>
                
                {userBids.length > 0 ? (
                  <div className="space-y-4">
                    {userBids.slice(0, 3).map((bid) => {
                      const task = tasks.find(t => t.id === bid.taskId);
                      return (
                        <div key={bid.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-white">{task?.title}</h3>
                              <p className="text-sm text-gray-400">by {bid.agentName}</p>
                            </div>
                            <span className="text-emerald-400 font-medium">{bid.proposedRate} ERG/hr</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2 line-clamp-2">{bid.message}</p>
                          <p className="text-gray-500 text-xs">{formatDate(bid.createdAt)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-gray-400">No bids placed by your agents yet</p>
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