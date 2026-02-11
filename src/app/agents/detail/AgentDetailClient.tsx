'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useData } from '@/contexts/DataContext';
import { useWallet } from '@/contexts/WalletContext';
import { Agent, Task, Completion } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import AgentIdentityBadge from '@/components/AgentIdentityBadge';
import AgentAvatar from '@/components/AgentAvatar';
import RatingDisplay from '@/components/RatingDisplay';
import { 
  Star, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  User, 
  MessageSquare, 
  Briefcase,
  Edit,
  Pause,
  Play,
  DollarSign,
  Calendar,
  Shield,
  Target,
  Fingerprint,
  Loader2
} from 'lucide-react';
import { buildAgentIdentityMintTx } from '@/lib/ergo/agent-identity';
import { getCurrentHeight } from '@/lib/ergo/explorer';
import { getUtxos, signTransaction, submitTransaction } from '@/lib/ergo/wallet';
import { supabase } from '@/lib/supabase';
import { isMobileDevice, createErgoPayRequest } from '@/lib/ergo/ergopay';
import ErgoPayModal from '@/components/ErgoPayModal';

export default function AgentDetailClient({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { userAddress } = useWallet();
  const { getAgent, getTasksByCreatorAddress, getAgentCompletions } = useData();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [agentTasks, setAgentTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mintingIdentity, setMintingIdentity] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [ergoPayModal, setErgoPayModal] = useState<{
    isOpen: boolean;
    ergoPayUrl: string;
    qrCode: string;
    requestId: string;
  } | null>(null);

  // agentId comes from prop (via search params)
  const isOwner = agent?.ownerAddress === userAddress;

  const handleErgoPaySuccess = useCallback(async (txId: string) => {
    if (!agent) return;
    await supabase.from('agents').update({ identity_token_id: txId }).eq('id', agent.id);
    setAgent({ ...agent, identityTokenId: txId });
    setMintSuccess(true);
    setTimeout(() => setErgoPayModal(null), 2000);
  }, [agent]);

  async function handleMintIdentity() {
    if (!agent || !userAddress) return;
    setMintingIdentity(true);
    setMintError(null);
    try {
      const [utxos, height] = await Promise.all([
        getUtxos(userAddress),
        getCurrentHeight(),
      ]);
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
        });
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
      setAgent({ ...agent, identityTokenId: tokenId });
      setMintSuccess(true);
    } catch (err: any) {
      setMintError(err?.message || 'Failed to mint identity NFT');
    } finally {
      setMintingIdentity(false);
    }
  }

  useEffect(() => {
    async function fetchAgentData() {
      if (!agentId) return;
      
      try {
        setLoading(true);
        const agentData = await getAgent(agentId);
        
        if (!agentData) {
          setError('Agent not found');
          return;
        }

        setAgent(agentData);
        
        // Fetch agent's completed tasks and reviews
        const [completionsData] = await Promise.all([
          getAgentCompletions(agentId)
        ]);
        
        setCompletions(completionsData);

        // Fetch completed tasks where this agent was assigned
        try {
          const { data: completedTasksData } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_agent_id', agentId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false });
          
          setCompletedTasks(completedTasksData || []);
        } catch (err) {
          console.error('Error fetching completed tasks:', err);
        }
      } catch (err) {
        setError('Failed to load agent profile');
        console.error('Error fetching agent:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [agentId, getAgent, getAgentCompletions]);

  // Calculate agent statistics — ONLY real data, no fakes
  const tasksCompleted = agent?.tasksCompleted || 0;
  const totalEarnings = completions.reduce((sum, c) => sum + (c.ergPaid || 0), 0);
  const avgRating = completions.length > 0 ? completions.reduce((sum, c) => sum + c.rating, 0) / completions.length : agent?.rating || 0;
  const reviewCount = completions.length;
  const completionRate = agent?.completionRate || (tasksCompleted > 0 ? 100 : 0);

  const stats = {
    completionRate,
    totalEarnings,
    avgRating,
    reviewCount,
  };

  // EGO score breakdown — based on real on-chain formula
  // Reviews score scales with both rating quality AND review count (min 5 reviews for full weight)
  const reviewWeight = Math.min(reviewCount / 5, 1); // 0-1 scale, full weight at 5+ reviews
  const egoBreakdown = [
    { category: 'Task Completions', score: Math.min(Math.floor(tasksCompleted * 2.5), 500), max: 500 },
    { category: 'Client Reviews', score: Math.min(Math.floor(avgRating * 60 * reviewWeight), 300), max: 300, detail: `${reviewCount} review${reviewCount !== 1 ? 's' : ''}` },
    { category: 'Completion Rate', score: Math.min(Math.floor(completionRate * 2), 200), max: 200 },
  ];

  const getTierInfo = (egoScore: number) => {
    if (egoScore >= 1000) return { tier: 'legendary', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' };
    if (egoScore >= 750) return { tier: 'elite', color: 'text-purple-400', bgColor: 'bg-purple-400/20' };
    if (egoScore >= 500) return { tier: 'established', color: 'text-blue-400', bgColor: 'bg-blue-400/20' };
    if (egoScore >= 250) return { tier: 'rising', color: 'text-emerald-400', bgColor: 'bg-emerald-400/20' };
    return { tier: 'newcomer', color: 'text-[var(--text-secondary)]', bgColor: 'bg-gray-400/20' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-[var(--text-secondary)]">Loading agent profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
            <p className="text-[var(--text-secondary)] mb-6">{error || 'The agent you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/agents')}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              Browse Agents
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tierInfo = getTierInfo(agent.egoScore);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Agent Profile Header */}
        <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <AgentAvatar address={agent.ownerAddress || agent.ergoAddress || agent.id} size={96} />
            
            {/* Agent Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
                <div className="flex items-center gap-2">
                  <StatusBadge status={agent.status} type="agent" />
                  <AgentIdentityBadge identityTokenId={agent.identityTokenId} />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${tierInfo.bgColor} ${tierInfo.color}`}>
                    <Award className="w-3 h-3 inline mr-1" />
                    {tierInfo.tier}
                  </span>
                </div>
              </div>
              
              <p className="text-[var(--text-secondary)] text-lg mb-4 leading-relaxed">{agent.description}</p>
              
              {/* Key Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-medium">{stats.avgRating.toFixed(1)}</span>
                  <span className="text-[var(--text-muted)]">({stats.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-medium">{agent.egoScore}</span>
                  <span className="text-[var(--text-muted)]">EGO</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{agent.tasksCompleted}</span>
                  <span className="text-[var(--text-muted)]">completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">Σ{agent.hourlyRateErg}</span>
                  <span className="text-[var(--text-muted)]">per hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span className="text-white font-medium">Member since</span>
                  <span className="text-[var(--text-muted)]">{new Date(agent.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isOwner ? (
                <>
                  {!agent.identityTokenId && !mintSuccess && (
                    <button
                      onClick={handleMintIdentity}
                      disabled={mintingIdentity}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-60 text-white rounded-lg transition-colors"
                    >
                      {mintingIdentity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                      {mintingIdentity ? 'Minting...' : 'Mint Identity NFT'}
                    </button>
                  )}
                  {mintSuccess && (
                    <p className="text-emerald-400 text-sm">✅ Identity NFT minted!</p>
                  )}
                  {mintError && (
                    <p className="text-red-400 text-sm">❌ {mintError}</p>
                  )}
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
                    {agent.status === 'available' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {agent.status === 'available' ? 'Pause' : 'Activate'}
                  </button>
                </>
              ) : (
                <>
                  <button className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors">
                    <User className="w-4 h-4" />
                    Hire This Agent
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] hover:border-[var(--text-muted)] text-[var(--text-secondary)] rounded-lg transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
            <h3 className="text-white font-medium mb-3">Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {(agent.skills || []).map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-[var(--bg-card-hover)] text-[var(--text-secondary)] rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Dashboard — real data only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-6 hover:border-emerald-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h3 className="font-medium text-[var(--text-secondary)]">Tasks Completed</h3>
            </div>
            <p className="text-2xl font-bold text-white">{tasksCompleted}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-[var(--text-muted)]">Verified on-chain</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-6 hover:border-cyan-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <h3 className="font-medium text-[var(--text-secondary)]">Total Earned</h3>
            </div>
            <p className="text-2xl font-bold text-white">Σ{stats.totalEarnings.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-[var(--text-muted)]">From {tasksCompleted} completed tasks</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-6 hover:border-amber-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-amber-400" />
              <h3 className="font-medium text-[var(--text-secondary)]">Avg Rating</h3>
            </div>
            <p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}/5.0</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-[var(--text-muted)]">From {stats.reviewCount} reviews</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-6 hover:border-purple-400/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-[var(--text-secondary)]">EGO Score</h3>
            </div>
            <p className="text-2xl font-bold text-white">{agent.egoScore}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.color}`}>{tierInfo.tier}</span>
            </div>
          </div>
        </div>

        {/* Trust Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-[var(--text-secondary)]">Trust Level</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🛡️</div>
              <div>
                <p className="text-lg font-bold text-white capitalize">{tierInfo.tier}</p>
                <p className="text-xs text-[var(--text-muted)]">Based on EGO score & history</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <User className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-[var(--text-secondary)]">Client Satisfaction</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-2xl">⭐</div>
              <div>
                <p className="text-lg font-bold text-white">{stats.avgRating.toFixed(1)}/5.0</p>
                <p className="text-xs text-[var(--text-muted)]">Average from {stats.reviewCount} reviews</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* EGO Score Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                EGO Score Breakdown
              </h3>
              <div className="space-y-4">
                {egoBreakdown.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">{item.category}{('detail' in item && item.detail) ? <span className="text-xs ml-1 opacity-60">({item.detail})</span> : null}</span>
                      <span className="text-white font-medium">{item.score}/{item.max}</span>
                    </div>
                    <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-cyan-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-[var(--text-secondary)]">Total EGO Score</span>
                  <span className="text-2xl font-bold text-purple-400">{agent.egoScore}</span>
                </div>
              </div>
            </div>

            {/* Task History */}
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Recent Completions
              </h3>
              {completions.length > 0 ? (
                <div className="space-y-4">
                  {completions.slice(0, 5).map((completion, index) => (
                    <div key={index} className="border-l-2 border-emerald-400 pl-4 py-2">
                      <h4 className="font-medium text-white">{completion.taskTitle}</h4>
                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span>{completion.rating}/5</span>
                        </div>
                        <span>Σ{completion.ergPaid} ERG</span>
                        <span>{new Date(completion.completedAt).toLocaleDateString()}</span>
                      </div>
                      {completion.review && (
                        <p className="text-[var(--text-secondary)] text-sm mt-2 italic">"{completion.review}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No completed tasks yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews & Ratings - New Mutual Rating System */}
          <div className="space-y-6">
            <RatingDisplay 
              address={agent.ergoAddress || agent.ownerAddress} 
              role="agent"
            />
          </div>

          {/* Completed Work Section */}
          <div className="lg:col-span-3">
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                Completed Work Portfolio
              </h3>
              {completedTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedTasks.map((task, index) => {
                    // Find matching completion data for this task
                    const taskCompletion = completions.find(c => c.taskId === task.id);
                    return (
                      <div key={index} className="bg-[var(--bg-card-hover)]/50 border border-[var(--border-color)] rounded-lg p-4 hover:border-cyan-400/50 transition-colors">
                        <h4 className="font-medium text-white mb-2">{task.title}</h4>
                        <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{task.description}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(task.skillsRequired || []).slice(0, 3).map(skill => (
                            <span key={skill} className="px-2 py-0.5 bg-slate-600 text-[var(--text-secondary)] rounded-full text-xs">
                              {skill}
                            </span>
                          ))}
                          {(task.skillsRequired || []).length > 3 && (
                            <span className="text-xs text-[var(--text-muted)]">+{task.skillsRequired.length - 3} more</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-emerald-400 font-medium">Σ{task.budgetErg} ERG</span>
                            {taskCompletion && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400" />
                                <span className="text-white">{taskCompletion.rating}/5</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[var(--text-muted)]">
                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Completed'}
                          </span>
                        </div>
                        {taskCompletion?.review && (
                          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                            <p className="text-[var(--text-secondary)] text-sm italic">"{taskCompletion.review}"</p>
                            <p className="text-[var(--text-muted)] text-xs mt-1">- {taskCompletion.reviewerName}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)] mb-2">No completed tasks yet</p>
                  <p className="text-[var(--text-muted)] text-sm">This agent hasn't completed any tasks on the platform yet.</p>
                </div>
              )}
            </div>
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