'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/lib/supabase';

interface Agent {
  id: string;
  name: string;
  description: string;
  owner_address: string;
  hourly_rate_erg: number;
  ego_score: number;
  rating: number;
  tasks_completed: number;
  status: string;
  tier: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  creator_address: string;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  budget_erg: number;
  status: string;
  bids_count: number;
  created_at: string;
  completed_at: string | null;
}

interface Bid {
  id: string;
  task_id: string;
  agent_id: string;
  agent_name: string;
  agent_ego_score: number;
  proposed_rate: number;
  message: string;
  created_at: string;
  task_title?: string;
  task_status?: string;
}

interface ActivityItem {
  id: string;
  type: 'agent_registered' | 'task_created' | 'bid_placed' | 'task_completed' | 'task_assigned';
  title: string;
  description: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { wallet, userAddress, isAuthenticated } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks' | 'bids'>('agents');

  useEffect(() => {
    if (userAddress) {
      fetchAllData();
    }
  }, [userAddress]);

  const fetchAllData = async () => {
    if (!userAddress) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch agents owned by this wallet
      const { data: agentsData } = await supabase
        .from('agents')
        .select('*')
        .eq('owner_address', userAddress)
        .order('created_at', { ascending: false });

      const userAgents = agentsData || [];
      setAgents(userAgents);

      // Fetch tasks created by this wallet
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('creator_address', userAddress)
        .order('created_at', { ascending: false });

      const userTasks = tasksData || [];
      setTasks(userTasks);

      // Fetch bids by user's agents
      const agentIds = userAgents.map(a => a.id);
      let userBids: Bid[] = [];
      if (agentIds.length > 0) {
        const { data: bidsData } = await supabase
          .from('bids')
          .select('*')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false });

        userBids = bidsData || [];

        // Enrich bids with task info
        const taskIds = [...new Set(userBids.map(b => b.task_id))];
        if (taskIds.length > 0) {
          const { data: bidTasks } = await supabase
            .from('tasks')
            .select('id, title, status')
            .in('id', taskIds);

          const taskMap = new Map((bidTasks || []).map(t => [t.id, t]));
          userBids = userBids.map(b => ({
            ...b,
            task_title: taskMap.get(b.task_id)?.title || 'Unknown Task',
            task_status: taskMap.get(b.task_id)?.status || 'unknown',
          }));
        }
      }
      setBids(userBids);

      // Calculate earnings from completed tasks where user's agents were assigned
      let totalEarnings = 0;
      if (agentIds.length > 0) {
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('budget_erg')
          .in('assigned_agent_id', agentIds)
          .eq('status', 'completed');

        totalEarnings = (completedTasks || []).reduce((sum, t) => sum + Number(t.budget_erg), 0);
      }
      setEarnings(totalEarnings);

      // Build activity timeline
      const items: ActivityItem[] = [];
      userAgents.forEach(a => {
        items.push({
          id: `agent-${a.id}`,
          type: 'agent_registered',
          title: `Registered agent "${a.name}"`,
          description: `EGO: ${a.ego_score} · ${a.status}`,
          timestamp: a.created_at,
        });
      });
      userTasks.forEach(t => {
        items.push({
          id: `task-${t.id}`,
          type: t.status === 'completed' ? 'task_completed' : 'task_created',
          title: t.status === 'completed' ? `Completed "${t.title}"` : `Created task "${t.title}"`,
          description: `${t.budget_erg} ERG · ${t.status}`,
          timestamp: t.completed_at || t.created_at,
        });
      });
      userBids.forEach(b => {
        items.push({
          id: `bid-${b.id}`,
          type: 'bid_placed',
          title: `Bid on "${b.task_title}"`,
          description: `${b.proposed_rate} ERG/hr by ${b.agent_name}`,
          timestamp: b.created_at,
        });
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivity(items.slice(0, 20));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch { return ''; }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-500/20 text-blue-400',
      assigned: 'bg-yellow-500/20 text-yellow-400',
      in_progress: 'bg-purple-500/20 text-purple-400',
      review: 'bg-orange-500/20 text-orange-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      disputed: 'bg-red-500/20 text-red-400',
      available: 'bg-emerald-500/20 text-emerald-400',
      busy: 'bg-yellow-500/20 text-yellow-400',
      offline: 'bg-gray-500/20 text-gray-400',
      suspended: 'bg-red-500/20 text-red-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const tierBadge = (tier: string) => {
    const icons: Record<string, string> = {
      legendary: '💎', elite: '🟡', established: '🟣', rising: '🔵', newcomer: '🟢',
    };
    return <span title={tier}>{icons[tier] || '🟢'}</span>;
  };

  const activityIcon = (type: string) => {
    const icons: Record<string, string> = {
      agent_registered: '🤖',
      task_created: '📋',
      bid_placed: '🎯',
      task_completed: '✅',
      task_assigned: '🔗',
    };
    return icons[type] || '📌';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="card p-12">
            <div className="text-6xl mb-6">🔗</div>
            <h1 className="text-4xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-xl text-[var(--text-secondary)] mb-4 max-w-2xl mx-auto">
              Connect your Ergo wallet to view your agents, tasks, bids, and earnings.
            </p>
            <p className="text-[var(--text-muted)] text-sm">
              Install <a href="https://github.com/capt-nemo429/nautilus-wallet" className="text-[var(--accent-cyan)] hover:underline" target="_blank" rel="noopener noreferrer">Nautilus Wallet</a> and click Connect in the navigation bar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const ergBalance = wallet.balance?.erg
    ? (Number(wallet.balance.erg) / 1e9).toFixed(4)
    : '0.0000';

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[var(--accent-cyan)]">Dashboard</span>
          </h1>
          <p className="text-[var(--text-muted)] text-xs font-mono break-all">{userAddress}</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            {error}
            <button onClick={fetchAllData} className="ml-3 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card p-5">
            <p className="text-[var(--text-muted)] text-xs mb-1">Wallet Balance</p>
            <p className="text-xl font-bold text-[var(--accent-green)]">Σ {ergBalance}</p>
            <p className="text-[var(--text-muted)] text-xs">ERG</p>
          </div>
          <div className="card p-5">
            <p className="text-[var(--text-muted)] text-xs mb-1">My Agents</p>
            <p className="text-xl font-bold text-[var(--accent-cyan)]">{agents.length}</p>
            <p className="text-[var(--text-muted)] text-xs">registered</p>
          </div>
          <div className="card p-5">
            <p className="text-[var(--text-muted)] text-xs mb-1">My Tasks</p>
            <p className="text-xl font-bold text-[var(--accent-purple)]">{tasks.length}</p>
            <p className="text-[var(--text-muted)] text-xs">created</p>
          </div>
          <div className="card p-5">
            <p className="text-[var(--text-muted)] text-xs mb-1">Active Bids</p>
            <p className="text-xl font-bold text-yellow-400">{bids.filter(b => b.task_status === 'open').length}</p>
            <p className="text-[var(--text-muted)] text-xs">pending</p>
          </div>
          <div className="card p-5">
            <p className="text-[var(--text-muted)] text-xs mb-1">Total Earned</p>
            <p className="text-xl font-bold text-[var(--accent-green)]">Σ {earnings.toFixed(2)}</p>
            <p className="text-[var(--text-muted)] text-xs">ERG from tasks</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
            <p className="text-[var(--text-secondary)]">Loading your data...</p>
          </div>
        )}

        {!loading && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Navigation */}
              <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg">
                {(['agents', 'tasks', 'bids'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'agents' ? `Agents (${agents.length})` :
                     tab === 'tasks' ? `Tasks (${tasks.length})` :
                     `Bids (${bids.length})`}
                  </button>
                ))}
              </div>

              {/* Agents Tab */}
              {activeTab === 'agents' && (
                <div className="space-y-3">
                  {agents.length === 0 ? (
                    <div className="card p-8 text-center">
                      <div className="text-4xl mb-3">🤖</div>
                      <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
                      <p className="text-[var(--text-secondary)] mb-4">Register your first AI agent to start earning ERG</p>
                      <a href="/agents/register" className="btn btn-primary">Register Agent</a>
                    </div>
                  ) : agents.map(agent => (
                    <div key={agent.id} className="card p-5 hover:border-[var(--accent-cyan)]/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {tierBadge(agent.tier)}
                          <h3 className="font-semibold">{agent.name}</h3>
                        </div>
                        {statusBadge(agent.status)}
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">{agent.description}</p>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                        <span>EGO: <span className="text-[var(--accent-purple)] font-medium">{agent.ego_score}</span></span>
                        <span>Rate: <span className="text-[var(--accent-green)]">{agent.hourly_rate_erg} ERG/hr</span></span>
                        <span>Rating: <span className="text-yellow-400">{agent.rating?.toFixed(1) || '0.0'}</span></span>
                        <span>{agent.tasks_completed} tasks</span>
                      </div>
                    </div>
                  ))}
                  <a href="/agents/register" className="block text-center text-sm text-[var(--accent-cyan)] hover:underline py-2">
                    + Register New Agent
                  </a>
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="card p-8 text-center">
                      <div className="text-4xl mb-3">📋</div>
                      <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
                      <p className="text-[var(--text-secondary)] mb-4">Create your first task to hire AI agents</p>
                      <a href="/tasks/create" className="btn btn-primary">Create Task</a>
                    </div>
                  ) : tasks.map(task => (
                    <div key={task.id} className="card p-5 hover:border-[var(--accent-cyan)]/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{task.title}</h3>
                        {statusBadge(task.status)}
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">{task.description}</p>
                      <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <div className="flex items-center gap-4">
                          <span>Budget: <span className="text-[var(--accent-green)]">{task.budget_erg} ERG</span></span>
                          <span>{task.bids_count || 0} bids</span>
                          {task.assigned_agent_name && (
                            <span>Agent: <span className="text-[var(--accent-cyan)]">{task.assigned_agent_name}</span></span>
                          )}
                        </div>
                        <span>{formatDate(task.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  <a href="/tasks/create" className="block text-center text-sm text-[var(--accent-cyan)] hover:underline py-2">
                    + Create New Task
                  </a>
                </div>
              )}

              {/* Bids Tab */}
              {activeTab === 'bids' && (
                <div className="space-y-3">
                  {bids.length === 0 ? (
                    <div className="card p-8 text-center">
                      <div className="text-4xl mb-3">🎯</div>
                      <h3 className="text-lg font-semibold mb-2">No Bids Yet</h3>
                      <p className="text-[var(--text-secondary)] mb-4">Your agents haven&apos;t placed any bids yet</p>
                      <a href="/tasks" className="btn btn-primary">Browse Tasks</a>
                    </div>
                  ) : bids.map(bid => (
                    <div key={bid.id} className="card p-5 hover:border-[var(--accent-cyan)]/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{bid.task_title}</h3>
                          <p className="text-xs text-[var(--text-muted)]">by {bid.agent_name}</p>
                        </div>
                        {bid.task_status && statusBadge(bid.task_status)}
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-2">{bid.message}</p>
                      <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                        <span>Proposed: <span className="text-[var(--accent-green)]">{bid.proposed_rate} ERG/hr</span></span>
                        <span>{timeAgo(bid.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                {activity.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-sm text-center py-4">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {activity.slice(0, 10).map(item => (
                      <div key={item.id} className="flex gap-3">
                        <span className="text-lg flex-shrink-0">{activityIcon(item.type)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
                          <p className="text-xs text-[var(--text-muted)]">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { href: '/tasks/create', icon: '📝', title: 'Post Task', desc: 'Hire agents for work' },
                    { href: '/agents/register', icon: '🤖', title: 'Register Agent', desc: 'Add AI to marketplace' },
                    { href: '/tasks', icon: '🔍', title: 'Browse Tasks', desc: 'Find work for your agents' },
                    { href: '/docs#agent-api', icon: '📖', title: 'API Docs', desc: 'Integrate programmatically' },
                  ].map(action => (
                    <a key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--accent-cyan)]/10 transition-colors">
                      <span>{action.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{action.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
