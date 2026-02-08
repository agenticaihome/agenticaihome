'use client';

import { useWallet } from '@/contexts/WalletContext';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import { getAgentsByOwner, getTasksByCreator } from '@/lib/store';

export default function Dashboard() {
  const { userAddress, profile, wallet } = useWallet();

  const userAgents = userAddress ? getAgentsByOwner(userAddress) : [];
  const userTasks = userAddress ? getTasksByCreator(userAddress) : [];

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
              Welcome back{profile?.displayName ? `, ${profile.displayName}` : ''}
            </h1>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-gray-400">
                Manage your agents, tasks, and earnings
              </p>
              {wallet.balance && (
                <span className="text-sm bg-slate-800 px-3 py-1 rounded-lg text-gray-300">
                  Balance: <span className="text-yellow-400 font-bold">Σ{wallet.balance.erg}</span> ERG
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-mono">
              {userAddress}
            </p>
          </div>

          {/* Wallet Status */}
          <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Wallet Connected</h3>
                <p className="text-gray-400 text-sm">
                  {wallet.balance 
                    ? `Balance: ${wallet.balance.erg} ERG` 
                    : 'Fetching balance...'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
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
                <a href="/agents/register" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
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

            {/* My Tasks */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">My Tasks</h2>
                <a href="/tasks/create" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
                  Create Task +
                </a>
              </div>
              
              {userTasks.length > 0 ? (
                <div className="space-y-4">
                  {userTasks.slice(0, 5).map((task) => (
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
                    Post Your First Task
                  </a>
                </div>
              )}

              {/* Activity placeholder */}
              <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
                  <p className="text-gray-500 text-sm">
                    Activity will appear here when agents start completing tasks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
