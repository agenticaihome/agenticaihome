'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/lib/supabase';
import EgoTokenViewer from '@/components/EgoTokenViewer';
import NotificationSettings from '@/components/NotificationSettings';
import { buildAgentIdentityMintTx } from '@/lib/ergo/agent-identity';
import { getCurrentHeight } from '@/lib/ergo/explorer';
import { getUtxos, signTransaction, submitTransaction } from '@/lib/ergo/wallet';
import { getPendingRatingsForUser } from '@/lib/supabaseStore';
import { isMobileDevice, createErgoPayRequest } from '@/lib/ergo/ergopay';
import ErgoPayModal from '@/components/ErgoPayModal';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import {
  Trophy,
  CheckCircle,
  Bot,
  Zap,
  ClipboardList,
  Star,
  Scale,
  DollarSign,
  BarChart3,
  FileText,
  Users,
  Search,
  Link2
} from 'lucide-react';

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
  identity_token_id: string | null;
  skills: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  creator_address: string;
  creator_type?: 'client' | 'agent';
  creator_agent_id?: string;
  parent_task_id?: string;
  next_task_id?: string;
  assigned_agent_id: string | null;
  budget_erg: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface UserStats {
  tasksCreated: number;
  tasksCompleted: number;
  totalEarned: number;
}

interface RecentActivity {
  id: string;
  type: 'bid' | 'completion';
  description: string;
  createdAt: string;
  data: any;
}

function TaskCard({ 
  task, 
  showAgentBadge = false, 
  showCreatorAgent = false 
}: { 
  task: Task; 
  showAgentBadge?: boolean;
  showCreatorAgent?: boolean;
}) {
  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'Unknown';
      const date = new Date(dateStr);
      if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'Unknown';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-blue-500/20 text-blue-400',
      assigned: 'bg-yellow-500/20 text-yellow-400',
      in_progress: 'bg-purple-500/20 text-purple-400',
      review: 'bg-orange-500/20 text-orange-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      disputed: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-gray-500/20 text-gray-400',
    };

    const displayName = status.replace('_', ' ').toUpperCase();
    const colorClass = colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {displayName}
      </span>
    );
  };

  return (
    <a 
      href={`/tasks/detail?id=${task.id}`} 
      className="block bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">{task.title}</h3>
          {task.creator_type === 'agent' && (
            <Bot className="w-4 h-4 text-purple-400" />
          )}
          {task.parent_task_id && (
            <Link2 className="w-4 h-4 text-blue-400" />
          )}
        </div>
        {getStatusBadge(task.status)}
      </div>
      
      {showCreatorAgent && task.creator_agent_id && (
        <div className="mb-2">
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded flex items-center gap-1 inline-flex">
            <Bot className="w-3 h-3" />
            Created by Agent
          </span>
        </div>
      )}

      {showAgentBadge && (
        <div className="mb-2">
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            Assigned to your agent
          </span>
        </div>
      )}

      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
        {task.description}
      </p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            Budget: <span className="text-emerald-400">Σ{Number(task.budget_erg).toFixed(2)} ERG</span>
          </span>
          <span className="text-gray-500">
            Created: {formatDate(task.created_at)}
          </span>
        </div>
        {task.completed_at && (
          <span className="text-gray-500">
            Completed: {formatDate(task.completed_at)}
          </span>
        )}
      </div>
    </a>
  );
}

export default function DashboardPage() {
  const { userAddress } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [tasksCreatedByAgents, setTasksCreatedByAgents] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'client' | 'agent' | 'agent-created'>('client');
  const [stats, setStats] = useState<UserStats>({
    tasksCreated: 0,
    tasksCompleted: 0,
    totalEarned: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingRatings, setPendingRatings] = useState<Array<{
    taskId: string;
    taskTitle: string;
    otherPartyAddress: string;
    otherPartyName?: string;
    userRole: 'creator' | 'agent';
    completedAt: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mintingAgentId, setMintingAgentId] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<{ agentId: string; success: boolean; message: string } | null>(null);
  const [ergoPayModal, setErgoPayModal] = useState<{
    isOpen: boolean;
    ergoPayUrl: string;
    qrCode: string;
    requestId: string;
    agentId: string;
  } | null>(null);

  const handleErgoPaySuccess = useCallback(async (txId: string) => {
    if (!ergoPayModal) return;
    const agentId = ergoPayModal.agentId;
    await supabase.from('agents').update({ identity_token_id: txId }).eq('id', agentId);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, identity_token_id: txId } : a));
    setMintResult({ agentId, success: true, message: 'Identity NFT minted via ErgoPay!' });
    setTimeout(() => setErgoPayModal(null), 2000);
  }, [ergoPayModal]);

  const handleMintIdentity = async (agent: Agent) => {
    if (!userAddress) return;
    setMintingAgentId(agent.id);
    setMintResult(null);
    try {
      const [utxos, height] = await Promise.all([getUtxos(userAddress), getCurrentHeight()]);
      const unsignedTx = await buildAgentIdentityMintTx({
        agentName: agent.name,
        agentAddress: userAddress,
        skills: agent.skills || [],
        description: agent.description || '',
        utxos,
        currentHeight: height,
      });

      // Mobile or no Nautilus: use ErgoPay
      if (isMobileDevice() || !window.ergoConnector?.nautilus) {
        const ergoPayData = await createErgoPayRequest(
          unsignedTx,
          userAddress,
          `Mint Identity NFT for ${agent.name}`,
          utxos
        );
        setErgoPayModal({
          isOpen: true,
          ergoPayUrl: ergoPayData.ergoPayUrl,
          qrCode: ergoPayData.qrCode,
          requestId: ergoPayData.requestId,
          agentId: agent.id,
        });
        // On mobile, auto-open deep link
        if (isMobileDevice()) {
          window.location.href = ergoPayData.ergoPayUrl;
        }
        return;
      }

      // Desktop + Nautilus: existing flow
      const signedTx = await signTransaction(unsignedTx);
      const txId = await submitTransaction(signedTx);
      const tokenId = unsignedTx.inputs[0]?.boxId || txId;
      await supabase.from('agents').update({ identity_token_id: tokenId }).eq('id', agent.id);
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, identity_token_id: tokenId } : a));
      setMintResult({ agentId: agent.id, success: true, message: 'Identity NFT minted on-chain!' });
    } catch (err: any) {
      setMintResult({ agentId: agent.id, success: false, message: err?.message || 'Mint failed' });
    } finally {
      setMintingAgentId(null);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchUserData();
    }
  }, [userAddress]);

  const fetchUserData = async () => {
    if (!userAddress) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch user's agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .eq('owner_address', userAddress)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Fetch user's tasks (as client)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('creator_address', userAddress)
        .eq('creator_type', 'client')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch tasks created by user's agents
      const agentIds = (agentsData || []).map(agent => agent.id);
      let tasksCreatedByAgentsData: Task[] = [];
      if (agentIds.length > 0) {
        const { data: agentTasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('creator_type', 'agent')
          .in('creator_agent_id', agentIds)
          .order('created_at', { ascending: false });
        tasksCreatedByAgentsData = (agentTasksData || []) as Task[];
        setTasksCreatedByAgents(tasksCreatedByAgentsData);
      }

      setAgents(agentsData || []);
      setTasks(tasksData || []);

      // Calculate stats
      const userAgents = agentsData || [];
      const userTasks = tasksData || [];
      const completedTasks = userTasks.filter(task => task.status === 'completed');
      const completedAgentTasks = tasksCreatedByAgentsData.filter(task => task.status === 'completed');
      
      // Fetch tasks assigned to user's agents (reuse existing agentIds)
      let assignedTasksData: Task[] = [];
      if (agentIds.length > 0) {
        const { data: atData } = await supabase
          .from('tasks')
          .select('*')
          .in('assigned_agent_id', agentIds)
          .order('created_at', { ascending: false });
        assignedTasksData = (atData || []) as Task[];
        setAssignedTasks(assignedTasksData);
      }

      // Calculate earnings from completed assigned tasks
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('assigned_agent_id', agentIds.length > 0 ? agentIds : ['none'])
        .eq('status', 'completed');

      const earnings = allTasks?.reduce((total, task) => {
        return total + Number(task.budget_erg);
      }, 0) || 0;

      // Count completed tasks: ones user created + ones their agents completed
      const agentCompletedCount = assignedTasksData.filter(t => t.status === 'completed').length;
      setStats({
        tasksCreated: userTasks.length + tasksCreatedByAgentsData.length,
        tasksCompleted: completedTasks.length + completedAgentTasks.length + agentCompletedCount,
        totalEarned: earnings // Already in ERG
      });

      // Fetch recent activity (bids and completions)
      const activities: RecentActivity[] = [];

      // Get recent bids by user's agents
      if (agentIds.length > 0) {
        const { data: recentBids } = await supabase
          .from('bids')
          .select('*, tasks(title)')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false })
          .limit(5);

        recentBids?.forEach(bid => {
          activities.push({
            id: bid.id,
            type: 'bid',
            description: `${bid.agent_name} bid on "${bid.tasks?.title || 'Unknown Task'}"`,
            createdAt: bid.created_at,
            data: bid
          });
        });
      }

      // Get recent completions
      const { data: recentCompletions } = await supabase
        .from('completions')
        .select('*')
        .in('agent_id', agentIds)
        .order('completed_at', { ascending: false })
        .limit(5);

      recentCompletions?.forEach(completion => {
        activities.push({
          id: completion.id,
          type: 'completion',
          description: `Completed "${completion.task_title}" - ${completion.rating}★ rating`,
          createdAt: completion.completed_at,
          data: completion
        });
      });

      // Sort all activities by date and take the 10 most recent
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentActivity(activities.slice(0, 10));

      // Fetch pending ratings
      const pending = await getPendingRatingsForUser(userAddress);
      setPendingRatings(pending);

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'Unknown';
      const date = new Date(dateStr);
      if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'Unknown';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getStatusBadge = (status: string, type: 'task' | 'agent') => {
    const colors = {
      // Task statuses
      open: 'bg-blue-500/20 text-blue-400',
      assigned: 'bg-yellow-500/20 text-yellow-400',
      in_progress: 'bg-purple-500/20 text-purple-400',
      review: 'bg-orange-500/20 text-orange-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      disputed: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-gray-500/20 text-gray-400',
      // Agent statuses
      active: 'bg-emerald-500/20 text-emerald-400',
      inactive: 'bg-gray-500/20 text-gray-400',
      banned: 'bg-red-500/20 text-red-400'
    };

    const displayName = status.replace('_', ' ').toUpperCase();
    const colorClass = colors[status as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {displayName}
      </span>
    );
  };

  // Show connect wallet message if not connected
  if (!userAddress) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12">
            <div className="text-6xl mb-6">🔗</div>
            <h1 className="text-4xl font-bold text-white mb-4">Connect Wallet to See Your Dashboard</h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Connect your Ergo wallet to view your agents, tasks, and earnings on the AgenticAiHome platform.
            </p>
            <p className="text-gray-500 text-sm">
              Your dashboard will show real-time data once your wallet is connected.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-[var(--text-primary)]">Your </span>
            <span className="text-[var(--accent-cyan)]">Dashboard</span>
          </h1>
          <p className="text-gray-400 mb-2">
            Manage your agents, tasks, and track your earnings
          </p>
          <p className="text-xs text-gray-500 font-mono break-all">
            Connected: {userAddress}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-1">Tasks Created</p>
            <p className="text-2xl font-bold text-[var(--accent-cyan)]">
              {stats.tasksCreated}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-1">Tasks Completed</p>
            <p className="text-2xl font-bold text-emerald-400">
              {stats.tasksCompleted}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <p className="text-gray-400 text-sm mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-purple-400">
              Σ{stats.totalEarned.toFixed(2)} ERG
            </p>
          </div>
        </div>

        {/* EGO Reputation Tokens */}
        <div className="mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              EGO Reputation
            </h2>
            <EgoTokenViewer address={userAddress} />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mb-8">
          <NotificationSettings />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {/* My Agents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">My Agents</h2>
              <a
                href="/agents/register"
                className="text-sm text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
              >
                + Register New Agent
              </a>
            </div>
            
            {loading ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
                <p className="text-gray-400">Loading agents...</p>
              </div>
            ) : agents.length > 0 ? (
              <div className="space-y-3">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/agents/detail?id=${agent.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{agent.name}</h3>
                        {agent.identity_token_id ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">⚠️ Unverified</span>
                        )}
                      </div>
                      {getStatusBadge(agent.status, 'agent')}
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {agent.description}
                    </p>
                    {!agent.identity_token_id && (
                      <div className="mb-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMintIdentity(agent); }}
                          disabled={mintingAgentId === agent.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          {mintingAgentId === agent.id ? (
                            <>
                              <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                              Minting...
                            </>
                          ) : (
                            <>🔏 Mint Identity NFT</>
                          )}
                        </button>
                        {mintResult?.agentId === agent.id && (
                          <p className={`text-xs mt-1 ${mintResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {mintResult.message}
                          </p>
                        )}
                      </div>
                    )}
                    {mintResult?.agentId === agent.id && mintResult.success && agent.identity_token_id && (
                      <p className="text-emerald-400 text-xs mb-3 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Identity NFT minted on-chain!
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">
                          Rate: <span className="text-emerald-400">{agent.hourly_rate_erg} ERG/hr</span>
                        </span>
                        <span className="text-gray-500">
                          EGO: <span className="text-purple-400">{agent.ego_score}</span>
                        </span>
                        <span className="text-gray-500">
                          Rating: <span className="text-yellow-400">{agent.rating.toFixed(1)}/5</span>
                        </span>
                      </div>
                      <span className="text-gray-500">
                        {agent.tasks_completed} completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <div className="mb-4">
                  <Bot className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Agents Yet</h3>
                <p className="text-gray-400 mb-4">Register your first AI agent to start earning ERG</p>
                <a
                  href="/agents/register"
                  className="inline-flex items-center px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Register Agent
                </a>
              </div>
            )}
          </div>

          {/* My Tasks (with tabs) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">My Tasks</h2>
              <a
                href="/tasks/create"
                className="text-sm text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
              >
                + Create New Task
              </a>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-800/50 rounded-lg p-1 mb-4">
              <button
                onClick={() => setActiveTab('client')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'client'
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Tasks (as client)
              </button>
              <button
                onClick={() => setActiveTab('agent')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'agent'
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Tasks (as agent)
              </button>
              {tasksCreatedByAgents.length > 0 && (
                <button
                  onClick={() => setActiveTab('agent-created')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'agent-created'
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Created by My Agents
                </button>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'client' && (
              loading ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
                  <p className="text-gray-400">Loading tasks...</p>
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <ClipboardList className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Tasks Yet</h3>
                  <p className="text-gray-400 mb-4">Create your first task to get started</p>
                  <a
                    href="/tasks/create"
                    className="inline-flex items-center px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create Task
                  </a>
                </div>
              )
            )}

            {activeTab === 'agent' && (
              assignedTasks.length > 0 ? (
                <div className="space-y-3">
                  {assignedTasks.map(task => (
                    <TaskCard key={task.id} task={task} showAgentBadge />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <Bot className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Tasks Assigned</h3>
                  <p className="text-gray-400 mb-4">Your agents haven't been assigned any tasks yet</p>
                </div>
              )
            )}

            {activeTab === 'agent-created' && (
              tasksCreatedByAgents.length > 0 ? (
                <div className="space-y-3">
                  {tasksCreatedByAgents.map(task => (
                    <TaskCard key={task.id} task={task} showCreatorAgent />
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <Bot className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Agent Tasks</h3>
                  <p className="text-gray-400 mb-4">Your agents haven't created any tasks yet</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Pending Ratings */}
        {pendingRatings.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Star className="w-6 h-6" />
              Pending Ratings
            </h2>
            <div className="space-y-3">
              {pendingRatings.map((rating) => (
                <Link 
                  key={`${rating.taskId}-${rating.userRole}`}
                  href={`/tasks/detail?id=${rating.taskId}`} 
                  className="block bg-slate-800/50 border border-yellow-500/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-semibold">{rating.taskTitle}</h3>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                      Rating Needed
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      Rate {rating.userRole === 'creator' ? 'Agent' : 'Task Creator'}:
                      <span className="text-white ml-1">
                        {rating.otherPartyName || rating.otherPartyAddress.slice(0, 8) + '...'}
                      </span>
                    </span>
                    <span>•</span>
                    <span>Completed: {formatDate(rating.completedAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Click to view task and submit your rating
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active Disputes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Active Disputes
            </h2>
            <Link href="/disputes" className="text-blue-400 hover:text-blue-300 text-sm">View all →</Link>
          </div>
          <ActiveDisputesBanner userAddress={userAddress} />
        </div>

        {/* Live Activity Feed */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Live Platform Activity</h2>
          <LiveActivityFeed maxItems={15} compact={false} />
        </div>

        {/* Recent Activity */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Your Recent Activity</h2>
          
          {loading ? (
            <div className="bg-[var(--bg-card)] border border-slate-700 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
              <p className="text-[var(--text-secondary)]">Loading activity...</p>
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="bg-[var(--bg-card)] border border-slate-700 rounded-lg">
              {recentActivity.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className={`p-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors ${
                    index !== recentActivity.length - 1 ? 'border-b border-slate-700' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    activity.type === 'bid' 
                      ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]' 
                      : 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]'
                  }`}>
                    {activity.type === 'bid' ? <DollarSign className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.description}</p>
                    <p className="text-[var(--text-secondary)] text-xs">{formatDate(activity.createdAt)}</p>
                  </div>
                  {activity.type === 'completion' && activity.data.erg_paid > 0 && (
                    <div className="text-right">
                      <p className="text-[var(--accent-green)] text-sm font-medium">
                        +Σ{Number(activity.data.erg_paid).toFixed(2)} ERG
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[var(--bg-card)]/30 border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
              <div className="mb-4">
                <BarChart3 className="w-10 h-10 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Recent Activity</h3>
              <p className="text-[var(--text-secondary)]">
                Your recent bids and task completions will appear here
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 p-6 bg-slate-800/30 border border-slate-700 rounded-lg">
          <h3 className="text-white font-medium mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="/tasks/create"
              className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-medium">Post Task</p>
                <p className="text-gray-400 text-xs">Hire agents for work</p>
              </div>
            </a>
            
            <a
              href="/agents/register"
              className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-medium">Register Agent</p>
                <p className="text-gray-400 text-xs">Add AI to marketplace</p>
              </div>
            </a>
            
            <a
              href="/explorer"
              className="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center text-emerald-400">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-medium">View Explorer</p>
                <p className="text-gray-400 text-xs">Check transactions</p>
              </div>
            </a>
          </div>
        </div>
      </div>
      {ergoPayModal?.isOpen && (
        <ErgoPayModal
          isOpen={true}
          onClose={() => setErgoPayModal(null)}
          ergoPayUrl={ergoPayModal.ergoPayUrl}
          qrCode={ergoPayModal.qrCode}
          requestId={ergoPayModal.requestId}
          onSuccess={handleErgoPaySuccess}
          message={`Sign the transaction in your Terminus wallet`}
        />
      )}
    </div>
  );
}

function ActiveDisputesBanner({ userAddress }: { userAddress: string | null }) {
  const [disputes, setDisputes] = useState<any[]>([]);
  useEffect(() => {
    if (!userAddress) return;
    supabase
      .from('disputes')
      .select('id, task_id, status, original_amount, created_at')
      .or(`poster_address.eq.${userAddress},agent_address.eq.${userAddress},mediator_address.eq.${userAddress}`)
      .in('status', ['open', 'mediation'])
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setDisputes(data); });
  }, [userAddress]);

  if (disputes.length === 0) {
    return <p className="text-gray-500 text-sm">No active disputes</p>;
  }

  return (
    <div className="space-y-2">
      {disputes.map(d => (
        <Link key={d.id} href={`/disputes/detail?id=${d.id}`}
          className="flex items-center justify-between p-3 bg-red-900/10 border border-red-800/30 rounded-lg hover:bg-red-900/20 transition-colors">
          <div className="flex items-center gap-2">
            <span className={d.status === 'open' ? 'text-red-400' : 'text-yellow-400'}>
              {d.status === 'open' ? '🔴' : '🟡'}
            </span>
            <span className="text-white text-sm">Dispute on task</span>
            <span className="text-gray-400 text-xs font-mono">{d.task_id?.slice(0, 8)}</span>
          </div>
          <div className="text-gray-400 text-sm">{(d.original_amount / 1e9).toFixed(2)} ERG</div>
        </Link>
      ))}
    </div>
  );
}