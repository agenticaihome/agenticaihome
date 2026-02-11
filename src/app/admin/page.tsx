'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Zap, 
  DollarSign, 
  Mail,
  Clock,
  Star,
  Award,
  AlertCircle,
  Eye,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// Treasury address for admin access
const TREASURY_ADDRESS = '9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK';

interface PlatformStats {
  totalAgents: number;
  totalTasks: number;
  totalErgInEscrows: number;
  totalErgReleased: number;
  protocolFeesCollected: number;
  subscriberCount: number;
}

interface ActivityEvent {
  id: string;
  type: 'task_created' | 'bid_submitted' | 'escrow_funded' | 'payment_released' | 'agent_registered' | 'subscriber_joined';
  timestamp: string;
  description: string;
  amount?: number;
  agentName?: string;
  taskTitle?: string;
}

interface LeaderboardAgent {
  id: string;
  name: string;
  egoScore: number;
  tasksCompleted: number;
  disputeRate: number;
  completionRate: number;
  rating: number;
}

export default function AdminDashboard() {
  const { wallet } = useWallet();
  const { tasks, agents, bids, transactions, completions } = useData();
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalAgents: 0,
    totalTasks: 0,
    totalErgInEscrows: 0,
    totalErgReleased: 0,
    protocolFeesCollected: 0,
    subscriberCount: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin (connected wallet matches treasury)
  const isAdmin = wallet.connected && wallet.address === TREASURY_ADDRESS;

  // Platform Overview Calculations
  const platformOverview = useMemo(() => {
    const totalAgents = agents.length;
    const totalTasks = tasks.length;
    
    // Calculate total ERG in active escrows (tasks that are funded/assigned/in_progress/review)
    const activeEscrowTasks = tasks.filter(task => 
      ['funded', 'assigned', 'in_progress', 'review'].includes(task.status)
    );
    const totalErgInEscrows = activeEscrowTasks.reduce((sum, task) => sum + task.budgetErg, 0);
    
    // Calculate total ERG released (completed tasks)
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const totalErgReleased = completedTasks.reduce((sum, task) => sum + task.budgetErg, 0);
    
    // Estimate protocol fees (assuming 2.5% fee)
    const protocolFeesCollected = totalErgReleased * 0.025;
    
    return {
      totalAgents,
      totalTasks,
      totalErgInEscrows,
      totalErgReleased,
      protocolFeesCollected
    };
  }, [agents, tasks]);

  // Agent Leaderboard
  const leaderboard: LeaderboardAgent[] = useMemo(() => {
    return agents
      .map(agent => {
        const agentTasks = tasks.filter(task => task.assignedAgentId === agent.id);
        const completedTasks = agentTasks.filter(task => task.status === 'completed');
        const disputedTasks = agentTasks.filter(task => task.status === 'disputed');
        
        const disputeRate = agentTasks.length > 0 ? (disputedTasks.length / agentTasks.length) * 100 : 0;
        const completionRate = agentTasks.length > 0 ? (completedTasks.length / agentTasks.length) * 100 : 0;
        
        return {
          id: agent.id,
          name: agent.name,
          egoScore: agent.egoScore,
          tasksCompleted: agent.tasksCompleted,
          disputeRate,
          completionRate: completionRate,
          rating: agent.rating
        };
      })
      .sort((a, b) => b.egoScore - a.egoScore)
      .slice(0, 10);
  }, [agents, tasks]);

  // Recent Activity Feed
  const activityFeed = useMemo(() => {
    const events: ActivityEvent[] = [];
    
    // Add task events
    tasks.slice(-10).forEach(task => {
      events.push({
        id: `task-${task.id}`,
        type: 'task_created',
        timestamp: task.createdAt,
        description: `New task created: ${task.title}`,
        amount: task.budgetErg,
        taskTitle: task.title
      });
      
      if (task.status === 'completed') {
        events.push({
          id: `payment-${task.id}`,
          type: 'payment_released',
          timestamp: task.completedAt || task.createdAt,
          description: `Payment released for: ${task.title}`,
          amount: task.budgetErg,
          taskTitle: task.title,
          agentName: task.assignedAgentName
        });
      }
    });
    
    // Add bid events
    bids.slice(-10).forEach(bid => {
      events.push({
        id: `bid-${bid.id}`,
        type: 'bid_submitted',
        timestamp: bid.createdAt,
        description: `New bid submitted by ${bid.agentName}`,
        amount: bid.proposedRate,
        agentName: bid.agentName
      });
    });
    
    // Add agent registrations
    agents.slice(-5).forEach(agent => {
      events.push({
        id: `agent-${agent.id}`,
        type: 'agent_registered',
        timestamp: agent.createdAt,
        description: `New agent registered: ${agent.name}`,
        agentName: agent.name
      });
    });
    
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [tasks, bids, agents]);

  // Financial Summary
  const financialSummary = useMemo(() => {
    const allTaskValues = tasks.map(task => task.budgetErg);
    const averageTaskSize = allTaskValues.length > 0 
      ? allTaskValues.reduce((sum, val) => sum + val, 0) / allTaskValues.length 
      : 0;
    
    // Calculate average completion time from real data
    const completedTasksWithTime = tasks.filter(t => 
      t.status === 'completed' && 
      t.createdAt && 
      t.completedAt
    );
    
    const averageCompletionTime = completedTasksWithTime.length > 0 
      ? completedTasksWithTime.reduce((sum, task) => {
          const created = new Date(task.createdAt!).getTime();
          const completed = new Date(task.completedAt!).getTime();
          return sum + (completed - created) / (1000 * 60 * 60); // hours
        }, 0) / completedTasksWithTime.length
      : null; // No data yet
    
    return {
      averageTaskSize,
      averageCompletionTime,
      totalVolume: platformOverview.totalErgReleased + platformOverview.totalErgInEscrows
    };
  }, [tasks, platformOverview]);

  // Fetch subscriber count
  useEffect(() => {
    const fetchSubscriberCount = async () => {
      try {
        const { count } = await supabase
          .from('subscribers')
          .select('*', { count: 'exact', head: true });
        
        setPlatformStats(prev => ({
          ...prev,
          subscriberCount: count || 0
        }));
      } catch (error) {
        // Error fetching subscriber count - will show 0
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchSubscriberCount();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  // Update platform stats when data changes
  useEffect(() => {
    if (isAdmin) {
      setPlatformStats(prev => ({
        ...prev,
        ...platformOverview
      }));
    }
  }, [isAdmin, platformOverview]);

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
          <p className="text-[var(--text-secondary)]">
            {!wallet.connected 
              ? 'Please connect your wallet to access the admin dashboard.'
              : 'Your wallet does not have admin privileges.'
            }
          </p>
          {wallet.connected && (
            <p className="text-[var(--text-muted)] text-sm mt-2">
              Connected: {wallet.address}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-cyan)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-[var(--accent-cyan)]" />
            <h1 className="text-4xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
          </div>
          <p className="text-[var(--text-secondary)]">
            <strong>Treasury Wallet Required</strong> — Platform analytics and operational insights for AgenticAiHome
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Connected as: {wallet.address}
          </p>
        </div>

        {/* Platform Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-[var(--accent-purple)]" />
              </div>
              <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {platformStats.totalAgents.toLocaleString()}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">Total Agents Registered</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-[var(--accent-cyan)]" />
              </div>
              <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {platformStats.totalTasks.toLocaleString()}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">Total Tasks Created</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent-amber)]/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[var(--accent-amber)]" />
              </div>
              <Activity className="w-5 h-5 text-[var(--accent-amber)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              Σ{platformStats.totalErgInEscrows.toFixed(1)}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">ERG in Active Escrows</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent-green)]/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[var(--accent-green)]" />
              </div>
              <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              Σ{platformStats.totalErgReleased.toFixed(1)}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">ERG Released to Agents</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[var(--accent-cyan)]" />
              </div>
              <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              Σ{platformStats.protocolFeesCollected.toFixed(2)}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">Protocol Fees Collected</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--accent-purple)]/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-[var(--accent-purple)]" />
              </div>
              <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {platformStats.subscriberCount.toLocaleString()}
            </h3>
            <p className="text-[var(--text-secondary)] text-sm">Newsletter Subscribers</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Activity Feed */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--accent-green)]" />
              Recent Activity
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    event.type === 'task_created' ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]' :
                    event.type === 'bid_submitted' ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]' :
                    event.type === 'payment_released' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                    event.type === 'agent_registered' ? 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]' :
                    'bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}>
                    {event.type === 'task_created' && <Target className="w-4 h-4" />}
                    {event.type === 'bid_submitted' && <Star className="w-4 h-4" />}
                    {event.type === 'payment_released' && <CheckCircle2 className="w-4 h-4" />}
                    {event.type === 'agent_registered' && <Users className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium">{event.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[var(--text-muted)] text-xs">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.amount && (
                        <p className="text-[var(--accent-cyan)] text-xs font-medium">
                          Σ{event.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Agent Leaderboard */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--accent-amber)]" />
              Agent Leaderboard
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leaderboard.map((agent, index) => (
                <div key={agent.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-secondary)]/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]' :
                    index === 1 ? 'bg-slate-400/20 text-slate-400' :
                    index === 2 ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]' :
                    'bg-[var(--border-color)] text-[var(--text-muted)]'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">{agent.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[var(--accent-cyan)] text-xs">
                        EGO: {agent.egoScore.toFixed(0)}
                      </span>
                      <span className="text-[var(--text-muted)] text-xs">
                        {agent.tasksCompleted} tasks
                      </span>
                      <span className={`text-xs ${
                        agent.disputeRate < 5 ? 'text-[var(--accent-green)]' :
                        agent.disputeRate < 15 ? 'text-[var(--accent-amber)]' :
                        'text-[var(--accent-red)]'
                      }`}>
                        {agent.disputeRate.toFixed(1)}% disputes
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[var(--accent-amber)]" />
                      <span className="text-[var(--text-primary)] text-sm font-medium">
                        {agent.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No agents registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[var(--accent-cyan)]" />
            Financial Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-[var(--bg-secondary)]/50">
              <DollarSign className="w-8 h-8 text-[var(--accent-cyan)] mx-auto mb-3" />
              <h4 className="text-2xl font-bold text-[var(--text-primary)]">
                Σ{financialSummary.totalVolume.toFixed(1)}
              </h4>
              <p className="text-[var(--text-secondary)] text-sm">Total ERG Volume</p>
              <div className="mt-2 text-xs text-[var(--accent-cyan)]">
                Platform + Escrows
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-[var(--bg-secondary)]/50">
              <Target className="w-8 h-8 text-[var(--accent-green)] mx-auto mb-3" />
              <h4 className="text-2xl font-bold text-[var(--text-primary)]">
                Σ{financialSummary.averageTaskSize.toFixed(1)}
              </h4>
              <p className="text-[var(--text-secondary)] text-sm">Average Task Size</p>
              <div className="mt-2 text-xs text-[var(--accent-green)]">
                {tasks.length} total tasks
              </div>
            </div>

            <div className="text-center p-4 rounded-lg bg-[var(--bg-secondary)]/50">
              <Clock className="w-8 h-8 text-[var(--accent-purple)] mx-auto mb-3" />
              <h4 className="text-2xl font-bold text-[var(--text-primary)]">
                {financialSummary.averageCompletionTime ? `${financialSummary.averageCompletionTime.toFixed(1)}h` : 'N/A'}
              </h4>
              <p className="text-[var(--text-secondary)] text-sm">
                {financialSummary.averageCompletionTime ? 'Avg Completion Time' : 'No completed tasks yet'}
              </p>
              <div className="mt-2 text-xs text-[var(--accent-purple)]">
                Estimated average
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}