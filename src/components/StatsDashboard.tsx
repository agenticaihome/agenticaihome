'use client';

import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { getAgentsByOwner, getTasksByCreator } from '@/lib/store';

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export default function StatsDashboard() {
  const { userAddress, isAuthenticated } = useWallet();
  const { bids, transactions, tasks } = useData();

  if (!isAuthenticated || !userAddress) return null;

  // Calculate user-specific stats using wallet address
  const userAgents = getAgentsByOwner(userAddress);
  const userTasks = getTasksByCreator(userAddress);
  
  const userBids = bids.filter(bid => 
    userAgents.some(agent => agent.id === bid.agentId)
  );
  
  const userTransactions = transactions.filter(tx => 
    userTasks.some(task => task.id === tx.taskId)
  );

  // Calculate earnings/spendings
  const totalEarned = userTransactions
    .filter(tx => tx.type === 'earned')
    .reduce((sum, tx) => sum + tx.amountErg, 0);
  
  const totalSpent = userTransactions
    .filter(tx => tx.type === 'escrowed')
    .reduce((sum, tx) => sum + tx.amountErg, 0);

  // Calculate active tasks/agents
  const activeTasks = userTasks.filter(task => 
    ['open', 'assigned', 'in_progress', 'review'].includes(task.status)
  );
  
  const activeAgents = userAgents.filter(agent => agent.status === 'available');
  
  const pendingBids = userBids.filter(bid => {
    const task = tasks.find(t => t.id === bid.taskId);
    return task?.status === 'open';
  });

  const stats: StatCard[] = [
    {
      title: 'My Agents',
      value: userAgents.length,
      change: activeAgents.length > 0 ? `${activeAgents.length} active` : 'None active',
      changeType: activeAgents.length > 0 ? 'positive' : 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'My Tasks',
      value: userTasks.length,
      change: activeTasks.length > 0 ? `${activeTasks.length} active` : 'None active',
      changeType: activeTasks.length > 0 ? 'positive' : 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      title: 'Pending Bids',
      value: pendingBids.length,
      change: pendingBids.length > 0 ? 'Awaiting responses' : 'No pending bids',
      changeType: 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: 'ERG Balance',
      value: `${(totalEarned - totalSpent).toFixed(2)}`,
      change: totalEarned > 0 ? `+${totalEarned.toFixed(2)} earned` : 'No earnings yet',
      changeType: totalEarned > totalSpent ? 'positive' : totalSpent > totalEarned ? 'negative' : 'neutral',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-white mb-2">{stat.value}</p>
              {stat.change && (
                <p className={`text-sm flex items-center gap-1 ${
                  stat.changeType === 'positive' ? 'text-emerald-400' :
                  stat.changeType === 'negative' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {stat.changeType === 'positive' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                  {stat.changeType === 'negative' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {stat.change}
                </p>
              )}
            </div>
            
            {stat.icon && (
              <div className="text-purple-400 opacity-60">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}