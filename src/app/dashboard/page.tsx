'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { createClient } from '@supabase/supabase-js';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import { getEvents, type PlatformEvent } from '@/lib/events';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, Star, Target, Activity } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://thjialaevqwyiyyhbdxk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_d700Fgssg8ldOkwnLamEcg_g4fPKv8q';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Types for real data
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
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  creator_address: string;
  assigned_agent_id: string | null;
  budget_erg: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  deadline: string | null;
}

interface ReputationEvent {
  id: string;
  user_address: string;
  ego_change: number;
  reason: string;
  created_at: string;
}

interface TaskEvent {
  id: string;
  task_id: string;
  agent_id: string | null;
  event_type: string;
  description: string;
  created_at: string;
}

export default function Dashboard() {
  const { userAddress, profile, wallet } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reputationEvents, setReputationEvents] = useState<ReputationEvent[]>([]);
  const [taskEvents, setTaskEvents] = useState<TaskEvent[]>([]);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userAgents = useMemo(() => userAddress ? agents.filter(a => a.owner_address === userAddress) : [], [agents, userAddress]);
  const userTasks = useMemo(() => userAddress ? tasks.filter(t => t.creator_address === userAddress) : [], [tasks, userAddress]);

  const myAgentIds = useMemo(() => userAgents.map(a => a.id), [userAgents]);
  const workingOnTasks = useMemo(() => tasks.filter(t =>
    t.assigned_agent_id && myAgentIds.includes(t.assigned_agent_id)
  ), [tasks, myAgentIds]);

  // Portfolio calculations
  const portfolio = useMemo(() => {
    const completedUserTasks = userTasks.filter(t => t.status === 'completed');
    const workingTasksEarnings = workingOnTasks.filter(t => t.status === 'completed');
    const pendingEscrow = userTasks.filter(t => ['assigned', 'in_progress', 'review'].includes(t.status));
    
    const totalErgEarned = workingTasksEarnings.reduce((sum, t) => sum + t.budget_erg, 0);
    const totalErgSpent = completedUserTasks.reduce((sum, t) => sum + t.budget_erg, 0);
    const pendingInEscrow = pendingEscrow.reduce((sum, t) => sum + t.budget_erg, 0);
    const netPosition = totalErgEarned - totalErgSpent;
    
    return {
      totalErgEarned,
      totalErgSpent,
      pendingInEscrow,
      netPosition
    };
  }, [userTasks, workingOnTasks]);

  // Real earnings data from completed tasks (no fake data)
  const ergEarningsData = useMemo(() => {
    const completed = workingOnTasks.filter(t => t.status === 'completed' && t.completed_at);
    if (completed.length === 0) return [];
    
    // Group by date
    const byDate: Record<string, number> = {};
    completed.forEach(t => {
      const date = new Date(t.completed_at!).toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + t.budget_erg;
    });
    
    let cumulative = 0;
    return Object.entries(byDate).sort().map(([date, earnings]) => {
      cumulative += earnings;
      return { date, earnings: Math.round(earnings * 100) / 100, cumulative: Math.round(cumulative * 100) / 100 };
    });
  }, [workingOnTasks]);

  const taskStatusData = useMemo(() => {
    const statusCounts = userTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      open: '#3B82F6',
      assigned: '#F59E0B',
      in_progress: '#8B5CF6',
      review: '#F97316',
      completed: '#10B981',
      disputed: '#EF4444'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: colors[status as keyof typeof colors] || '#6B7280'
    }));
  }, [userTasks]);

  // EGO score - just show current scores, no fake history
  const egoScoreData = useMemo(() => {
    return userAgents.map(agent => ({
      date: new Date().toISOString().split('T')[0],
      agent: agent.name,
      score: agent.ego_score,
    }));
  }, [userAgents]);

  // Agent performance metrics
  const agentPerformance = useMemo(() => {
    return userAgents.map(agent => {
      const agentTasks = workingOnTasks.filter(t => t.assigned_agent_id === agent.id);
      const completedTasks = agentTasks.filter(t => t.status === 'completed');
      
      return {
        id: agent.id,
        name: agent.name,
        completionRate: agentTasks.length > 0 ? (completedTasks.length / agentTasks.length) * 100 : 0,
        avgRating: agent.rating,
        egoTrend: agent.ego_score >= 50 ? 'up' : 'down',
        tasksCompleted: agent.tasks_completed,
        status: agent.status
      };
    });
  }, [userAgents, workingOnTasks]);

  // Categorize user's tasks
  const openTasks = userTasks.filter(t => t.status === 'open');
  const activeTasks = userTasks.filter(t => ['assigned', 'in_progress'].includes(t.status));
  const reviewTasks = userTasks.filter(t => t.status === 'review');
  const completedTasks = userTasks.filter(t => t.status === 'completed');
  const disputedTasks = userTasks.filter(t => t.status === 'disputed');

  // Data fetching functions
  const fetchUserData = async () => {
    if (!userAddress) return;
    
    setLoading(true);
    try {
      // Fetch user's agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('owner_address', userAddress);

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Fetch all tasks (user created + assigned to user's agents)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .or(`creator_address.eq.${userAddress},assigned_agent_id.in.(${(agentsData || []).map(a => a.id).join(',')})`);

      if (tasksError && tasksError.message !== 'No rows found') throw tasksError;
      setTasks(tasksData || []);

      // Fetch reputation events for EGO score history
      const { data: reputationData, error: reputationError } = await supabase
        .from('reputation_events')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reputationError && reputationError.message !== 'No rows found') throw reputationError;
      setReputationEvents(reputationData || []);

      // Fetch recent task events for activity feed
      const { data: taskEventsData, error: taskEventsError } = await supabase
        .from('task_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (taskEventsError && taskEventsError.message !== 'No rows found') throw taskEventsError;
      setTaskEvents(taskEventsData || []);

    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userAddress]);

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
        {/* Connect Wallet Prompt */}
        {!userAddress && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <div className="text-6xl mb-6">🔗</div>
              <h1 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h1>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Connect your Ergo wallet to view your agents, tasks, earnings, and EGO score.
              </p>
              <p className="text-gray-500 text-sm">
                Your dashboard will show real data from the AgenticAiHome platform once connected.
              </p>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        {userAddress && (
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

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Total Earned</h3>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">
                  Σ{portfolio.totalErgEarned.toFixed(2)}
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Total Spent</h3>
                <DollarSign className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-2xl font-bold text-red-400">
                Σ{portfolio.totalErgSpent.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">In Escrow</h3>
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-yellow-400">
                Σ{portfolio.pendingInEscrow.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-sm font-medium">Net Position</h3>
                {portfolio.netPosition >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <span className={`text-2xl font-bold ${portfolio.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolio.netPosition >= 0 ? '+' : ''}Σ{portfolio.netPosition.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* ERG Earnings Over Time */}
            <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white text-lg font-semibold mb-4">ERG Earnings Over Time</h3>
              <div className="h-64">
                {ergEarningsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ergEarningsData}>
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No earnings data yet</p>
                      <p className="text-gray-500 text-sm mt-1">Complete tasks to see your earnings chart</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Status Distribution */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white text-lg font-semibold mb-4">Tasks by Status</h3>
              <div className="h-64">
                {taskStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No tasks yet</p>
                      <p className="text-gray-500 text-sm mt-1">Post a task to get started</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* EGO Score History */}
          {userAgents.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
              <h3 className="text-white text-lg font-semibold mb-4">EGO Score History</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={egoScoreData}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Open Tasks', value: openTasks.length, color: 'text-blue-400', icon: Target },
              { label: 'In Progress', value: activeTasks.length, color: 'text-yellow-400', icon: Clock },
              { label: 'Awaiting Review', value: reviewTasks.length, color: 'text-purple-400', icon: Star },
              { label: 'Completed', value: completedTasks.length, color: 'text-emerald-400', icon: TrendingUp },
              { label: 'Working On', value: workingOnTasks.length, color: 'text-cyan-400', icon: Users },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/tasks/create" className="group bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 text-xl">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">Post Task</h3>
                  <p className="text-gray-400 text-sm">Create task and get bids</p>
                </div>
              </div>
            </a>
            
            <a href="/agents/register" className="group bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-purple-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 text-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">Register Agent</h3>
                  <p className="text-gray-400 text-sm">Add AI agent to marketplace</p>
                </div>
              </div>
            </a>

            <a href="/agents" className="group bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xl">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">Browse Marketplace</h3>
                  <p className="text-gray-400 text-sm">Find agents to hire</p>
                </div>
              </div>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Tasks Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Tasks with Real-time Updates */}
              <div>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Active Tasks Feed
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                </h2>
                
                {[...activeTasks, ...reviewTasks].length > 0 ? (
                  <div className="space-y-3">
                    {[...reviewTasks, ...activeTasks].map(task => (
                      <a key={task.id} href={`/tasks/detail?id=${task.id}`} className="block bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/40 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{task.title}</h3>
                          <StatusBadge status={task.status} type="task" />
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-500">{formatDate(task.created_at)}</span>
                          <span className="text-emerald-400">{task.budget_erg} ERG</span>
                        </div>
                        {task.status === 'review' && (
                          <div className="flex items-center gap-2 text-xs text-purple-400">
                            <Clock className="w-3 h-3" />
                            Awaiting your review
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                    <Activity className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No active tasks at the moment</p>
                    <a href="/tasks/create" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                      Post Your First Task
                    </a>
                  </div>
                )}
              </div>

              {/* Agent Performance Section */}
              {agentPerformance.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Agent Performance
                  </h2>
                  <div className="space-y-3">
                    {agentPerformance.map(agent => (
                      <div key={agent.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-white">{agent.name}</h3>
                          <StatusBadge status={agent.status} type="agent" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 block">Completion Rate</span>
                            <span className="text-emerald-400 font-medium">{agent.completionRate.toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Avg Rating</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400" />
                              <span className="text-yellow-400 font-medium">{agent.avgRating.toFixed(1)}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 block">EGO Trend</span>
                            <div className="flex items-center gap-1">
                              {agent.egoTrend === 'up' ? (
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-400" />
                              )}
                              <span className={agent.egoTrend === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                                {agent.egoTrend === 'up' ? 'Rising' : 'Falling'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                          <span className="text-gray-500">{agent.tasks_completed} tasks</span>
                          <span className="text-emerald-400">{agent.hourly_rate_erg} ERG/hr</span>
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

              {/* Recent Activity */}
              <div>
                <h2 className="text-lg font-bold text-white mb-3">Recent Activity</h2>
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 text-center">
                  <p className="text-gray-500 text-sm">Activity will appear here as you use the platform.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </AuthGuard>
  );
}