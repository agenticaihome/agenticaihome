'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import EgoScore from '@/components/EgoScore';
import Link from 'next/link';
import { logEvent } from '@/lib/events';
import { createDeliverable, updateDeliverableStatus, getDeliverablesForTask, updateAgentStats, updateTaskMetadata, updateTaskEscrow, withWalletAuth, verifiedCreateBid, verifiedCreateDeliverable, submitRating, getRatingForTask } from '@/lib/supabaseStore';
import { notifyWorkApproved, notifyRevisionRequested, notifyDisputeOpened, notifyRatingReceived, notifyBidReceived, notifyBidAccepted, notifyDeliverableSubmitted } from '@/lib/notifications';
import EscrowActions from '@/components/EscrowActions';
import MilestoneEscrowActions from '@/components/MilestoneEscrowActions';
import MilestoneProgress from '@/components/MilestoneProgress';
import RatingForm from '@/components/RatingForm';
import TaskChat from '@/components/TaskChat';
import DeliverableSubmit from '@/components/DeliverableSubmit';
import DisputePanel from '@/components/DisputePanel';
import CelautStatus from '@/components/CelautStatus';
import TaskTimeline from '@/components/TaskTimeline';
import TaskActionBar from '@/components/TaskActionBar';
import type { Task, Bid, Agent } from '@/lib/types';
import type { Milestone } from '@/lib/ergo/milestone-escrow';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface Deliverable {
  id: string;
  taskId: string;
  agentId: string;
  content: string;
  deliverableUrl?: string;
  fileHash?: string;
  status: string;
  reviewNotes?: string;
  revisionNumber: number;
  createdAt: string;
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" /></div>}>
      <TaskDetailInner />
    </Suspense>
  );
}

function TaskDetailInner() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');
  const { userAddress } = useWallet();
  const { getTask, getTaskBids, getAgent, getAgentsByOwnerAddress, updateTaskData, createBidData, acceptBidData } = useData();

  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bid form
  const [showBidForm, setShowBidForm] = useState(false);
  const [bidRate, setBidRate] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidAgentId, setBidAgentId] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);

  // Deliverable form - now handled by DeliverableSubmit component

  // Action states
  const [accepting, setAccepting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [walletVerified, setWalletVerified] = useState<boolean | null>(null);

  // Rating states
  // showCreatorRating/showAgentRating removed — forms auto-show when task is completed
  const [creatorRatingExists, setCreatorRatingExists] = useState(false);
  const [agentRatingExists, setAgentRatingExists] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Escrow state
  const [escrowBoxId, setEscrowBoxId] = useState<string | undefined>(undefined);
  const [escrowStatus, setEscrowStatus] = useState<'unfunded' | 'funded' | 'released' | 'refunded'>('unfunded');
  const [escrowTxId, setEscrowTxId] = useState<string | undefined>(undefined);
  const [fetchedAgent, setFetchedAgent] = useState<Agent | null>(null);
  
  // Milestone escrow state
  const [currentMilestone, setCurrentMilestone] = useState<number>(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<{
    milestoneIndex: number;
    txId: string;
    releasedAmount: number;
    completedAt: string;
  }[]>([]);

  const loadData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [t, b] = await Promise.all([
        getTask(taskId),
        getTaskBids(taskId),
      ]);
      setTask(t);
      setBids(b);

      // Load escrow state from task metadata
      if (t) {
        const meta = t.metadata;
        if (meta?.escrow_box_id) {
          setEscrowBoxId(meta.escrow_box_id);
          // Map non-standard statuses to valid escrow states
          const rawStatus = meta.escrow_status || 'funded';
          const statusMap: Record<string, 'unfunded' | 'funded' | 'released' | 'refunded'> = {
            unfunded: 'unfunded', funded: 'funded', released: 'released', refunded: 'refunded',
            approved_pending_release: 'funded', // approved but not yet released on-chain
          };
          setEscrowStatus(statusMap[rawStatus] || 'funded');
        }
        if (t.escrowTxId) {
          setEscrowTxId(t.escrowTxId);
        }
        
        // Load milestone data if this is a milestone escrow task
        if (meta?.escrowType === 'milestone' && meta?.milestones) {
          try {
            const milestonesData = typeof meta.milestones === 'string' 
              ? JSON.parse(meta.milestones) 
              : meta.milestones;
            setMilestones(milestonesData);
            setCurrentMilestone(meta?.currentMilestone || 0);
            
            // Load completed milestones if available
            if (meta?.completedMilestones) {
              const completed = typeof meta.completedMilestones === 'string'
                ? JSON.parse(meta.completedMilestones)
                : meta.completedMilestones;
              setCompletedMilestones(completed);
            }
          } catch (err) {
            console.error('Error parsing milestone data:', err);
          }
        }
      }

      // Load deliverables
      const delData = await getDeliverablesForTask(taskId);
      setDeliverables((delData || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        taskId: d.task_id as string,
        agentId: d.agent_id as string,
        content: (d.content as string) || '',
        deliverableUrl: d.deliverable_url as string | undefined,
        fileHash: d.file_hash as string | undefined,
        status: (d.status as string) || 'pending',
        reviewNotes: d.review_notes as string | undefined,
        revisionNumber: (d.revision_number as number) || 1,
        createdAt: (d.created_at as string) || '',
      })));

      // Load user's agents
      let agents: Agent[] = [];
      if (userAddress) {
        agents = await getAgentsByOwnerAddress(userAddress);
        setUserAgents(agents);
        if (agents.length > 0 && !bidAgentId) {
          setBidAgentId(agents[0].id);
        }
      }

      // Fetch the assigned agent (may not be owned by current user)
      if (t?.assignedAgentId) {
        const agentData = await getAgent(t.assignedAgentId);
        setFetchedAgent(agentData);
      }

      // Check for existing ratings when task is completed
      // Pass agents directly since setUserAgents hasn't re-rendered yet
      if (t?.status === 'completed' && userAddress) {
        await checkExistingRatings(t);
      }
    } catch (err) {
      console.error('Error loading task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId, userAddress, getTask, getTaskBids, getAgentsByOwnerAddress, bidAgentId]);

  const checkExistingRatings = async (task: Task) => {
    if (!userAddress) return;
    try {
      const existing = await getRatingForTask(task.id, userAddress);
      if (existing) {
        // User already rated — figure out which role
        if (task.creatorAddress === userAddress) setCreatorRatingExists(true);
        else setAgentRatingExists(true);
      }
    } catch (err) {
      console.error('Error checking existing ratings:', err);
    }
  };

  const handleRatingSubmit = async (ratingData: {
    taskId: string;
    raterAddress: string;
    rateeAddress: string;
    raterRole: 'creator' | 'agent';
    score: number;
    criteria: Record<string, number>;
    comment: string;
  }) => {
    setSubmittingRating(true);
    setError('');
    
    try {
      await submitRating(ratingData);
      
      if (ratingData.raterRole === 'creator') {
        setCreatorRatingExists(true);
      } else {
        setAgentRatingExists(true);
      }
      
      showSuccess('Rating submitted successfully!');
      
      // Fire-and-forget: notification + log (don't block the UI)
      notifyRatingReceived(
        ratingData.rateeAddress,
        ratingData.raterAddress,
        ratingData.taskId,
        ratingData.score
      ).catch(() => {});
      
      logEvent({ 
        type: 'rating_submitted', 
        message: `${ratingData.score}-star rating submitted by ${ratingData.raterRole}`,
        taskId: taskId || undefined,
        actor: userAddress || ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
      throw err; // Re-throw so RatingForm can display the error inline
    } finally {
      setSubmittingRating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCreator = task && userAddress && task.creatorAddress === userAddress;
  const ownedAssignedAgent = userAgents.find(a => a.id === task?.assignedAgentId);
  const assignedAgent = ownedAssignedAgent || fetchedAgent;
  const isAssignedAgent = !!ownedAssignedAgent;
  const canBid = task?.status === 'open' && userAgents.length > 0 && !isCreator;
  const canSubmitWork = task?.status === 'in_progress' && isAssignedAgent;
  const isApprovedPendingRelease = task?.metadata?.escrow_status === 'approved_pending_release';
  const canReview = (task?.status === 'review') && isCreator && !isApprovedPendingRelease;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 15000);
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !bidAgentId) return;
    setSubmittingBid(true);
    setError('');
    try {
      const agent = userAgents.find(a => a.id === bidAgentId);
      if (!agent) throw new Error('Agent not found');
      const bidPayload = {
        taskId,
        agentId: agent.id,
        agentName: agent.name,
        agentEgoScore: agent.egoScore,
        proposedRate: Number(bidRate),
        message: bidMessage,
        status: 'pending' as const,
      };
      try {
        const auth = await withWalletAuth(userAddress!, async (msg) => {
          const ergo = (window as any).ergo;
          if (!ergo?.auth) throw new Error('No wallet auth');
          return await ergo.auth(userAddress, msg);
        });
        await verifiedCreateBid(bidPayload, auth);
        setWalletVerified(true);
      } catch {
        await createBidData(bidPayload);
        setWalletVerified(false);
      }
      logEvent({ type: 'bid_placed', message: `Bid placed on task`, taskId, actor: userAddress || '' });
      showSuccess('Bid placed successfully!');
      
      // Send notification to task creator
      if (task && userAddress) {
        await notifyBidReceived(taskId, task.creatorAddress, userAddress);
      }
      
      setShowBidForm(false);
      setBidRate('');
      setBidMessage('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    if (!taskId) return;
    setAccepting(bid.id);
    setError('');
    try {
      await acceptBidData(bid.id);
      // Also update task status to in_progress
      await updateTaskData(taskId, {
        status: 'in_progress',
        assignedAgentId: bid.agentId,
        assignedAgentName: bid.agentName,
      });
      logEvent({ type: 'bid_accepted', message: `Bid from ${bid.agentName} accepted`, taskId, actor: userAddress || '' });
      showSuccess(`Bid from ${bid.agentName} accepted!`);
      
      // Find the agent's owner address to send notification
      const agent = userAgents.find(a => a.id === bid.agentId) || await getAgent(bid.agentId);
      if (agent?.ownerAddress) {
        await notifyBidAccepted(taskId, agent.ownerAddress);
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept bid');
    } finally {
      setAccepting(null);
    }
  };

  // handleSubmitWork function removed - now handled by DeliverableSubmit component

  const handleApprove = async () => {
    if (!taskId || !task) return;
    setReviewing(true);
    setError('');
    try {
      // Mark deliverable approved
      if (deliverables.length > 0) {
        await updateDeliverableStatus(deliverables[0].id, 'approved');
      }
      
      // If escrow is funded, don't mark completed yet — wait for on-chain release
      if (escrowStatus === 'funded' && escrowBoxId) {
        // Mark as approved but awaiting payment release
        await updateTaskMetadata(taskId, { escrow_box_id: escrowBoxId, escrow_status: 'approved_pending_release' });
        logEvent({ type: 'work_approved', message: `Work approved — release payment to complete`, taskId, actor: userAddress || '' });
        showSuccess('Work approved! Now release the escrow payment to complete the task.');
      } else {
        // No escrow — just complete directly
        await updateTaskData(taskId, { status: 'completed', completedAt: new Date().toISOString() });
        
        // Update agent stats via store
        if (task.assignedAgentId && task.budgetErg) {
          const egoDelta = Math.min(Math.max(task.budgetErg * 0.3, 2.0), 8.0);
          await updateAgentStats(task.assignedAgentId, egoDelta, `Task completed: ${task.title} (${task.budgetErg} ERG)`);
        }
        
        logEvent({ type: 'work_approved', message: `Work approved for "${task.title}"`, taskId, actor: userAddress || '' });
        showSuccess('Work approved! Task completed.');
      }

      // Send notification to agent
      if (task?.acceptedAgentAddress) {
        await notifyWorkApproved(taskId, task.acceptedAgentAddress);
      }
      await loadData();
      
      // Check if user should rate after completion
      if (userAddress) {
        await checkExistingRatings(task);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setReviewing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!taskId) return;
    if (!revisionNotes.trim()) {
      setError('Tell the agent what needs to change');
      return;
    }
    setReviewing(true);
    setError('');
    try {
      if (deliverables.length > 0) {
        await updateDeliverableStatus(deliverables[0].id, 'revision_requested', revisionNotes.trim());
      }
      await updateTaskData(taskId, { status: 'in_progress' });
      logEvent({ type: 'revision_requested', message: `Revision requested: ${revisionNotes.trim()}`, taskId, actor: userAddress || '' });
      showSuccess('Revision sent to agent.');
      setRevisionNotes('');
      setShowRevisionInput(false);
      
      if (task?.acceptedAgentAddress) {
        await notifyRevisionRequested(taskId, task.acceptedAgentAddress);
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request revision');
    } finally {
      setReviewing(false);
    }
  };

  const handleDispute = async () => {
    if (!taskId) return;
    setReviewing(true);
    setError('');
    try {
      await updateTaskData(taskId, { status: 'disputed' });
      logEvent({ type: 'work_disputed', message: `Task disputed`, taskId, actor: userAddress || '' });
      showSuccess('Task disputed.');
      
      // Send notification to both parties
      if (task?.acceptedAgentAddress) {
        await notifyDisputeOpened(taskId, task.creatorAddress, task.acceptedAgentAddress);
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispute');
    } finally {
      setReviewing(false);
    }
  };

  if (!taskId) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Task Selected</h1>
          <Link href="/tasks" className="text-purple-400 hover:text-purple-300">← Back to Tasks</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Task Not Found</h1>
          <Link href="/tasks" className="text-purple-400 hover:text-purple-300">← Back to Tasks</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link href="/tasks" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-block">← Back to Tasks</Link>

          {/* Success/Error Messages */}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              ✅ {successMsg}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Task Header */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-8 mb-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">{task.title}</h1>
                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <span>by {task.creatorName || task.creatorAddress.slice(0, 8) + '...'}</span>
                  <span>•</span>
                  <span>{formatDate(task.createdAt)}</span>
                </div>
              </div>
              <StatusBadge status={task.status} type="task" />
            </div>

            <p className="text-[var(--text-secondary)] mb-6 leading-relaxed whitespace-pre-wrap break-words">{task.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {task.skillsRequired.map(skill => (
                <span key={skill} className="px-2 py-1 bg-blue-600/10 text-blue-300 text-xs rounded-full border border-blue-500/20">
                  {skill}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-[var(--border-color)]">
              <span className="text-emerald-400 font-semibold text-lg">{task.budgetErg} ERG</span>
              <span className="text-[var(--text-muted)]">{task.bidsCount} bids</span>
              {task.assignedAgentName && (
                <span className="text-purple-400">Assigned: {task.assignedAgentName}</span>
              )}
            </div>
          </div>

          {/* Task Timeline */}
          <TaskTimeline task={task} className="mb-6" />

          {/* Task Action Bar */}
          <TaskActionBar
            task={task}
            userAgents={userAgents}
            bids={bids}
            isCreator={!!isCreator}
            isAssignedAgent={!!isAssignedAgent}
            onPlaceBid={() => setShowBidForm(true)}
            onReviewBids={() => {
              const bidsSection = document.getElementById('bids-section');
              bidsSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            onSubmitWork={() => {
              const submitSection = document.getElementById('submit-work-section');
              submitSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            onReviewWork={() => {
              const deliverablesSection = document.getElementById('deliverables-section');
              deliverablesSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            onRateAgent={() => {
              document.getElementById('rating-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onRateCreator={() => {
              document.getElementById('rating-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="mb-6"
          />

          {/* Rating — just show it, no extra clicks */}
          {task?.status === 'completed' && userAddress && (
            <div id="rating-section" className="mb-6">
              {/* Creator rates Agent */}
              {task.creatorAddress === userAddress && task.acceptedAgentAddress && (
                <RatingForm
                  taskId={task.id}
                  raterAddress={userAddress}
                  rateeAddress={task.acceptedAgentAddress}
                  raterRole="creator"
                  rateeName={task.assignedAgentName || 'Agent'}
                  onSubmit={handleRatingSubmit}
                  onSkip={() => {}}
                  existingRating={creatorRatingExists}
                />
              )}

              {/* Agent rates Creator */}
              {userAgents.some(a => a.id === task.assignedAgentId) && (
                <RatingForm
                  taskId={task.id}
                  raterAddress={userAddress}
                  rateeAddress={task.creatorAddress}
                  raterRole="agent"
                  rateeName={task.creatorName || 'Task Creator'}
                  onSubmit={handleRatingSubmit}
                  onSkip={() => {}}
                  existingRating={agentRatingExists}
                />
              )}
            </div>
          )}

          {/* Dispute Panel - Show when task is disputed */}
          {task.status === 'disputed' && (
            <div className="mb-6">
              <DisputePanel
                taskId={task.id}
                taskCreatorAddress={task.creatorAddress}
                taskAgentAddress={task.acceptedAgentAddress || ''}
                userRole={isCreator ? 'creator' : 'agent'}
              />
            </div>
          )}

          {/* Task Chat - Show when task has an assigned agent */}
          {task && task.assignedAgentId && ['in_progress', 'review', 'funded', 'completed'].includes(task.status) && (
            <div className="mb-6">
              <TaskChat
                taskId={task.id}
                taskCreatorAddress={task.creatorAddress}
                taskAgentAddress={task.acceptedAgentAddress}
              />
            </div>
          )}

          {/* Place Bid Section */}
          {canBid && (
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-6 mb-6">
              {!showBidForm ? (
                <button
                  onClick={() => setShowBidForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all"
                >
                  Place a Bid
                </button>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Place Your Bid</h3>
                  {userAgents.length > 1 && (
                    <div>
                      <label className="block text-sm text-[var(--text-secondary)] mb-1">Select Agent</label>
                      <select
                        value={bidAgentId}
                        onChange={e => setBidAgentId(e.target.value)}
                        className="w-full px-4 py-2 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg text-white"
                      >
                        {userAgents.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Proposed Rate (ERG)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      required
                      value={bidRate}
                      onChange={e => setBidRate(e.target.value)}
                      className="w-full px-4 py-2 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg text-white"
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Proposal Message</label>
                    <textarea
                      required
                      rows={3}
                      value={bidMessage}
                      onChange={e => setBidMessage(e.target.value)}
                      className="w-full px-4 py-2 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-lg text-white resize-none"
                      placeholder="Why are you the best fit for this task?"
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <button
                      type="submit"
                      disabled={submittingBid}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-[var(--bg-card)] text-white rounded-lg font-medium transition-all"
                    >
                      {submittingBid ? 'Submitting...' : 'Submit Bid'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBidForm(false)}
                      className="px-6 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-card-hover)]"
                    >
                      Cancel
                    </button>
                    {walletVerified === true && <span className="text-xs text-emerald-400">🔒 Verified</span>}
                    {walletVerified === false && <span className="text-xs text-yellow-400">⚠️ Unverified</span>}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Bids Section */}
          {bids.length > 0 && (
            <div id="bids-section" className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Bids ({bids.length})</h2>
              <div className="space-y-4">
                {bids.map(bid => (
                  <div key={bid.id} className="border border-[var(--border-color)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{bid.agentName}</span>
                        <EgoScore score={bid.agentEgoScore} />
                      </div>
                      <span className="text-emerald-400 font-semibold">{bid.proposedRate} ERG</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-sm mb-3">{bid.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)] text-xs">{formatDateTime(bid.createdAt)}</span>
                      {isCreator && task.status === 'open' && (
                        <button
                          onClick={() => handleAcceptBid(bid)}
                          disabled={accepting === bid.id}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-[var(--bg-card)] text-white text-sm rounded-lg font-medium transition-all"
                        >
                          {accepting === bid.id ? 'Accepting...' : 'Accept Bid'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Work Section - Using DeliverableSubmit Component */}
          {canSubmitWork && ownedAssignedAgent && (
            <div id="submit-work-section" className="mb-6">
              <DeliverableSubmit
                taskId={task.id}
                agentId={ownedAssignedAgent.id}
                onDeliverableSubmitted={async () => {
                  // Send notification to task creator
                  await notifyDeliverableSubmitted(task.id, task.creatorAddress);
                  await loadData();
                }}
              />
            </div>
          )}

          {/* Deliverables Section */}
          {deliverables.length > 0 && (
            <div id="deliverables-section" className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Deliverables</h2>
              <div className="space-y-4">
                {deliverables.map(d => (
                  <div key={d.id} className="border border-[var(--border-color)] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--text-secondary)] text-sm">Revision #{d.revisionNumber}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        d.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        d.status === 'revision_requested' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {d.status === 'revision_requested' ? 'Revision Requested' : d.status}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] mb-2 whitespace-pre-wrap break-words">{d.content}</p>
                    {d.deliverableUrl && (
                      <a href={d.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm">
                        🔗 {d.deliverableUrl}
                      </a>
                    )}
                    {d.reviewNotes && d.status === 'revision_requested' && (
                      <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-xs text-orange-400 font-medium mb-1">Revision feedback:</p>
                        <p className="text-sm text-orange-300 whitespace-pre-wrap break-words">{d.reviewNotes}</p>
                      </div>
                    )}
                    <p className="text-[var(--text-muted)] text-xs mt-2">{formatDateTime(d.createdAt)}</p>
                  </div>
                ))}
              </div>

              {/* Review Actions */}
              {canReview && (
                <div className="mt-6 pt-4 border-t border-[var(--border-color)] space-y-3">
                  {!showRevisionInput ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleApprove}
                        disabled={reviewing}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-[var(--bg-card)] text-white rounded-xl font-medium transition-colors"
                      >
                        {reviewing ? 'Processing...' : '✅ Looks Good — Approve'}
                      </button>
                      <button
                        onClick={() => setShowRevisionInput(true)}
                        disabled={reviewing}
                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-[var(--bg-card)] text-white rounded-xl font-medium transition-colors"
                      >
                        🔄 Needs Changes
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">
                        What needs to change?
                      </label>
                      <textarea
                        value={revisionNotes}
                        onChange={e => setRevisionNotes(e.target.value)}
                        placeholder="Be specific — what should the agent fix or improve?"
                        rows={3}
                        className="w-full px-4 py-3 bg-[var(--bg-primary)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500 transition-colors resize-none"
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleRequestRevision}
                          disabled={reviewing || !revisionNotes.trim()}
                          className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-[var(--bg-card)] disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                        >
                          {reviewing ? 'Sending...' : 'Send Revision Request'}
                        </button>
                        <button
                          onClick={() => { setShowRevisionInput(false); setRevisionNotes(''); }}
                          className="px-4 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Dispute — separate, less prominent */}
                  <button
                    onClick={handleDispute}
                    disabled={reviewing}
                    className="w-full py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Something wrong? Open a dispute →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Escrow Actions — Only task creator can fund/release/refund */}
          {task && task.assignedAgentId && isCreator && escrowStatus !== 'released' && (
            <div className="mb-6">
              {/* Check if this is a milestone escrow task */}
              {task.metadata?.escrowType === 'milestone' && milestones.length > 0 ? (
                <MilestoneEscrowActions
                  taskId={task.id}
                  agentAddress={
                    // Agent's ergo address — where funds go on release
                    task.acceptedAgentAddress || assignedAgent?.ergoAddress || assignedAgent?.ownerAddress || ''
                  }
                  agentName={assignedAgent?.name || 'Agent'}
                  amountErg={String(
                    // Use accepted bid rate if available, otherwise task budget
                    bids.find(b => b.id === task.acceptedBidId)?.proposedRate || task.budgetErg || 0
                  )}
                  milestones={milestones}
                  escrowBoxId={escrowBoxId}
                  currentMilestone={currentMilestone}
                  escrowStatus={escrowStatus}
                  onFunded={async (txId, boxId) => {
                    setEscrowBoxId(boxId);
                    setEscrowTxId(txId);
                    setEscrowStatus('funded');
                    // Persist milestone escrow info to Supabase via store
                    await updateTaskEscrow(task.id, txId, { 
                      escrow_box_id: boxId, 
                      escrow_status: 'funded',
                      escrowType: 'milestone',
                      currentMilestone: '0'
                    });
                    await updateTaskData(task.id, { status: 'in_progress' });
                    logEvent({ type: 'escrow_funded', message: `Milestone escrow funded: ${txId}`, taskId: task.id, actor: userAddress || '' });
                    showSuccess(`Milestone escrow funded! TX: ${txId.slice(0, 12)}...`);
                    await loadData();
                  }}
                  onMilestoneReleased={async (txId, milestoneIndex) => {
                    const isFinal = milestoneIndex === milestones.length - 1;
                    
                    if (isFinal) {
                      setEscrowStatus('released');
                      await updateTaskMetadata(task.id, { 
                        escrow_box_id: escrowBoxId || '', 
                        escrow_status: 'released', 
                        release_tx_id: txId,
                        currentMilestone: String(milestoneIndex + 1)
                      });
                      await updateTaskData(task.id, { status: 'completed', completedAt: new Date().toISOString() });
                      
                      // Update agent stats for full completion
                      if (task.assignedAgentId && task.budgetErg) {
                        const egoDelta = Math.min(Math.max(task.budgetErg * 0.3, 2.0), 8.0);
                        await updateAgentStats(task.assignedAgentId, egoDelta, `Milestone task completed: ${task.title} (${task.budgetErg} ERG)`);
                      }
                      
                      showSuccess(`🎉 Final milestone completed! Task finished. TX: ${txId.slice(0, 12)}...`);
                    } else {
                      // Just move to next milestone
                      setCurrentMilestone(milestoneIndex + 1);
                      const newCompleted = [...completedMilestones, {
                        milestoneIndex,
                        txId,
                        releasedAmount: parseFloat(milestones[milestoneIndex]?.percentage ? 
                          String((parseFloat(String(
                            bids.find(b => b.id === task.acceptedBidId)?.proposedRate || task.budgetErg || 0
                          )) * milestones[milestoneIndex].percentage) / 100) : '0'),
                        completedAt: new Date().toISOString()
                      }];
                      setCompletedMilestones(newCompleted);
                      
                      await updateTaskMetadata(task.id, { 
                        currentMilestone: String(milestoneIndex + 1),
                        completedMilestones: JSON.stringify(newCompleted)
                      });
                      
                      showSuccess(`✓ Milestone ${milestoneIndex + 1} completed! TX: ${txId.slice(0, 12)}...`);
                    }
                    
                    logEvent({ type: 'escrow_released', message: `Milestone ${milestoneIndex + 1} released: ${txId}`, taskId: task.id, actor: userAddress || '' });
                    await loadData();

                    // Check if user should rate after final completion
                    if (isFinal && userAddress) {
                      await checkExistingRatings(task);
                    }
                  }}
                  onRefunded={async (txId) => {
                    setEscrowStatus('refunded');
                    await updateTaskMetadata(task.id, { escrow_box_id: escrowBoxId || '', escrow_status: 'refunded', refund_tx_id: txId });
                    await updateTaskData(task.id, { status: 'disputed' });
                    logEvent({ type: 'escrow_refunded', message: `Milestone escrow refunded: ${txId}`, taskId: task.id, actor: userAddress || '' });
                    showSuccess(`Milestone escrow refunded! TX: ${txId.slice(0, 12)}...`);
                    await loadData();
                  }}
                />
              ) : (
                // Regular escrow
                <EscrowActions
                  taskId={task.id}
                  agentAddress={
                    // Agent's ergo address — where funds go on release
                    task.acceptedAgentAddress || assignedAgent?.ergoAddress || assignedAgent?.ownerAddress || ''
                  }
                  agentName={assignedAgent?.name || 'Agent'}
                  amountErg={String(
                    // Use accepted bid rate if available, otherwise task budget
                    bids.find(b => b.id === task.acceptedBidId)?.proposedRate || task.budgetErg || 0
                  )}
                  escrowBoxId={escrowBoxId}
                  escrowStatus={escrowStatus}
                  onFunded={async (txId, boxId) => {
                    setEscrowBoxId(boxId);
                    setEscrowTxId(txId);
                    setEscrowStatus('funded');
                    // Persist escrow info to Supabase via store
                    await updateTaskEscrow(task.id, txId, { escrow_box_id: boxId, escrow_status: 'funded' });
                    await updateTaskData(task.id, { status: 'in_progress' });
                    logEvent({ type: 'escrow_funded', message: `Escrow funded: ${txId}`, taskId: task.id, actor: userAddress || '' });
                    showSuccess(`Escrow funded! TX: ${txId.slice(0, 12)}...`);
                    await loadData();
                  }}
                  onReleased={async (txId) => {
                    setEscrowStatus('released');
                    // Persist release status via store
                    await updateTaskMetadata(task.id, { escrow_box_id: escrowBoxId || '', escrow_status: 'released', release_tx_id: txId });
                    await updateTaskData(task.id, { status: 'completed', completedAt: new Date().toISOString() });
                    
                    // Update agent stats via store
                    if (task.assignedAgentId && task.budgetErg) {
                      const egoDelta = Math.min(Math.max(task.budgetErg * 0.3, 2.0), 8.0);
                      await updateAgentStats(task.assignedAgentId, egoDelta, `Task completed with escrow release: ${task.title} (${task.budgetErg} ERG)`);
                    }
                    
                    logEvent({ type: 'escrow_released', message: `Payment released: ${txId}`, taskId: task.id, actor: userAddress || '' });
                    showSuccess(`💰 Payment released! 99% to agent, 1% to treasury. TX: ${txId.slice(0, 12)}...`);
                    await loadData();

                    // Check if user should rate after completion
                    if (userAddress) {
                      await checkExistingRatings(task);
                    }
                  }}
                  onRefunded={async (txId) => {
                    setEscrowStatus('refunded');
                    await updateTaskMetadata(task.id, { escrow_box_id: escrowBoxId || '', escrow_status: 'refunded', refund_tx_id: txId });
                    await updateTaskData(task.id, { status: 'disputed' });
                    logEvent({ type: 'escrow_refunded', message: `Escrow refunded: ${txId}`, taskId: task.id, actor: userAddress || '' });
                    showSuccess(`Escrow refunded! TX: ${txId.slice(0, 12)}...`);
                    await loadData();
                  }}
                />
              )}
            </div>
          )}

          {/* Celaut Execution Status */}
          {task && task.metadata?.executionMode === 'celaut' && (
            <div className="mb-6">
              <CelautStatus
                enabled
                showNodeSelector={false}
                runningServices={task.metadata?.celautServices ?? []}
              />
            </div>
          )}

          {/* Milestone Progress Tracker */}
          {task && task.metadata?.escrowType === 'milestone' && milestones.length > 0 && (
            <div className="mb-6">
              <MilestoneProgress
                milestones={milestones}
                currentMilestone={currentMilestone}
                totalAmountErg={parseFloat(String(
                  bids.find(b => b.id === task.acceptedBidId)?.proposedRate || task.budgetErg || 0
                ))}
                completedMilestones={completedMilestones}
              />
            </div>
          )}

        </div>
      </div>
  );
}
