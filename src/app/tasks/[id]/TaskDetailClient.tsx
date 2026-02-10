'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useWallet } from '@/contexts/WalletContext';

import SkillTag from '@/components/SkillTag';
import EscrowStatus from '@/components/EscrowStatus';
import StatusBadge from '@/components/StatusBadge';
import BidCard from '@/components/BidCard';
import BidForm from '@/components/BidForm';
import EscrowActions from '@/components/EscrowActions';
import TaskChat from '@/components/TaskChat';
import DeliverableSubmit from '@/components/DeliverableSubmit';
import TaskStatusTimeline from '@/components/TaskStatusTimeline';

import { mintEgoAfterRelease, egoTokenExplorerUrl } from '@/lib/ergo/ego-token';
import { getUtxos } from '@/lib/ergo/wallet';
import {
  getDeliverablesByTask,
  submitDeliverable,
  type Deliverable,
} from '@/lib/deliverables';
import { transitionTaskStatus, acceptBid } from '@/lib/supabaseStore';
import { logEvent } from '@/lib/events';
import { updateTaskMetadata, updateTaskEscrow, updateAgentStats } from '@/lib/supabaseStore';
import { validateUserAction, getAvailableActions, TaskStatus } from '@/lib/taskLifecycle';
import { 
  notifyBidAccepted, 
  notifyDeliverableSubmitted, 
  notifyPaymentReleased, 
  createNotification 
} from '@/lib/notifications';

export default function TaskDetailClient() {
  const params = useParams();
  const { getTask, getTaskBids, getAgent, refreshTasks, refreshBids, updateTaskData } = useData();
  const { userAddress, isAuthenticated } = useWallet();
  const [showBidForm, setShowBidForm] = useState(false);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [egoMintTxId, setEgoMintTxId] = useState<string | null>(null);
  const [egoMintError, setEgoMintError] = useState<string | null>(null);
  const [escrowBoxId, setEscrowBoxId] = useState<string | undefined>(undefined);
  const [escrowStatus, setEscrowStatus] = useState<'unfunded' | 'funded' | 'released' | 'refunded'>('unfunded');

  const taskId = params.id as string;
  const [task, setTask] = useState<Awaited<ReturnType<typeof getTask>>>(null);
  const [bids, setBids] = useState<Awaited<ReturnType<typeof getTaskBids>>>([]);
  const [assignedAgent, setAssignedAgent] = useState<Awaited<ReturnType<typeof getAgent>>>(null);
  const [taskLoading, setTaskLoading] = useState(true);

  const refreshTaskData = useCallback(async () => {
    const t = await getTask(taskId);
    setTask(t);
    // Load escrow state from task metadata
    if (t?.metadata?.escrow_box_id) {
      setEscrowBoxId(t.metadata.escrow_box_id);
      const rawStatus = t.metadata.escrow_status || 'funded';
      const statusMap: Record<string, 'unfunded' | 'funded' | 'released' | 'refunded'> = {
        unfunded: 'unfunded', funded: 'funded', released: 'released', refunded: 'refunded',
        approved_pending_release: 'funded',
      };
      setEscrowStatus(statusMap[rawStatus] || 'funded');
    }
    const b = await getTaskBids(taskId);
    setBids(b);
    if (t?.assignedAgentId) {
      const a = await getAgent(t.assignedAgentId);
      setAssignedAgent(a);
    }
  }, [taskId, getTask, getTaskBids, getAgent]);

  const refreshDeliverables = useCallback(() => {
    setDeliverables(getDeliverablesByTask(taskId));
  }, [taskId]);

  useEffect(() => {
    refreshTaskData().then(() => setTaskLoading(false));
    refreshDeliverables();
  }, [refreshTaskData, refreshDeliverables]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTaskData();
      refreshDeliverables();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshTaskData, refreshDeliverables]);

  if (taskLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;
  }

  if (!task) {
    return notFound();
  }

  const isCreator = userAddress === task.creatorAddress;
  const isAssignedAgent = userAddress && (task.acceptedAgentAddress === userAddress || (task.assignedAgentId && assignedAgent?.ergoAddress === userAddress));
  
  // Get user role for UI state management
  const userRole: 'poster' | 'agent' | 'viewer' = isCreator ? 'poster' : (isAssignedAgent ? 'agent' : 'viewer');
  
  // Get available actions for this user and task state
  const availableActions = getAvailableActions(task.status as TaskStatus, userRole);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAcceptBid = async (bidId: string) => {
    if (confirm('Accept this bid? This will assign the task to the agent.')) {
      setActionLoading('accept-bid');
      try {
        // Validate user can perform this action
        const validation = validateUserAction(
          task.status as TaskStatus,
          'in_progress',
          userAddress || '',
          task.creatorAddress,
          task.acceptedAgentAddress
        );
        
        if (!validation.valid) {
          alert(validation.reason || 'You cannot accept bids on this task');
          return;
        }

        const success = await acceptBid(bidId);
        if (success) {
          // Find the accepted bid to get agent info
          const acceptedBid = bids.find(bid => bid.id === bidId);
          if (acceptedBid) {
            // Get agent details to notify them
            const agentDetails = await getAgent(acceptedBid.agentId);
            if (agentDetails?.ergoAddress) {
              // Notify the agent their bid was accepted
              await notifyBidAccepted(taskId, agentDetails.ergoAddress);
            }
            
            // Notify task poster as well
            await createNotification({
              recipientAddress: task.creatorAddress,
              type: 'bid_accepted',
              title: 'Bid Accepted',
              message: `You accepted a bid for task "${task.title}". The agent can start working.`,
              link: `/tasks/${taskId}`,
            });
          }
          
          logEvent({
            type: 'bid_accepted',
            message: `Bid accepted for task "${task.title}"`,
            taskId,
            actor: userAddress || 'unknown',
            metadata: { bidId },
          });
          await refreshTaskData();
          refreshDeliverables();
        } else {
          alert('Failed to accept bid');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to accept bid');
      } finally {
        setActionLoading('');
      }
    }
  };

  const handleSubmitWork = async () => {
    if (!submitContent.trim()) return;
    setActionLoading('submit');
    try {
      const urls = submitUrl.trim() ? [submitUrl.trim()] : [];
      const del = submitDeliverable({
        taskId,
        agentId: task.assignedAgentId || '',
        agentAddress: userAddress || '',
        content: submitContent.trim(),
        urls,
      });

      // Transition task status via state machine
      const result = await transitionTaskStatus(taskId, 'review', userAddress || '');
      if (!result.success) {
        // Fallback to direct update if RPC not available
        await updateTaskData(taskId, { status: 'review' });
      }

      // Notify task creator that deliverable was submitted
      await notifyDeliverableSubmitted(taskId, task.creatorAddress);

      logEvent({
        type: 'work_submitted',
        message: `Work submitted for task "${task.title}"`,
        taskId,
        actor: userAddress || 'unknown',
      });

      setSubmitContent('');
      setSubmitUrl('');
      setShowSubmitForm(false);
      await refreshTaskData();
      refreshDeliverables();
      refreshTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit work');
    } finally {
      setActionLoading('');
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this work and release payment?')) return;
    setActionLoading('approve');
    try {
      const result = await transitionTaskStatus(taskId, 'completed', userAddress || '');
      if (!result.success) {
        await updateTaskData(taskId, { status: 'completed', completedAt: new Date().toISOString() });
      }
      
      // Notify agent that work was approved
      if (assignedAgent?.ergoAddress) {
        await createNotification({
          recipientAddress: assignedAgent.ergoAddress,
          type: 'work_approved',
          title: 'Work Approved! 🎉',
          message: `Your work for task "${task.title}" has been approved. Payment will be released.`,
          link: `/tasks/${taskId}`,
        });
      }
      
      logEvent({
        type: 'work_approved',
        message: `Work approved for task "${task.title}"`,
        taskId,
        actor: userAddress || 'unknown',
      });
      refreshDeliverables(); refreshTaskData();
      refreshTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading('');
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return;
    setActionLoading('dispute');
    try {
      await updateTaskData(taskId, { status: 'disputed' as any });
      
      // Notify agent about dispute
      if (assignedAgent?.ergoAddress) {
        await createNotification({
          recipientAddress: assignedAgent.ergoAddress,
          type: 'dispute_opened',
          title: 'Work Disputed ⚠️',
          message: `Your work for task "${task.title}" has been disputed. Reason: ${disputeReason}`,
          link: `/tasks/${taskId}`,
        });
      }
      
      logEvent({
        type: 'work_disputed',
        message: `Work disputed for task "${task.title}": ${disputeReason}`,
        taskId,
        actor: userAddress || 'unknown',
        metadata: { reason: disputeReason },
      });
      setDisputeReason('');
      setShowDisputeForm(false);
      refreshDeliverables(); refreshTaskData();
      refreshTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to dispute');
    } finally {
      setActionLoading('');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNote.trim()) return;
    setActionLoading('revision');
    try {
      const result = await transitionTaskStatus(taskId, 'in_progress', userAddress || '');
      if (!result.success) {
        await updateTaskData(taskId, { status: 'in_progress' });
      }
      
      // Notify agent about revision request
      if (assignedAgent?.ergoAddress) {
        await createNotification({
          recipientAddress: assignedAgent.ergoAddress,
          type: 'work_submitted', // Using existing type for revision
          title: 'Revision Requested 📝',
          message: `Revision requested for task "${task.title}". Note: ${revisionNote}`,
          link: `/tasks/${taskId}`,
        });
      }
      
      logEvent({
        type: 'revision_requested',
        message: `Revision requested for task "${task.title}": ${revisionNote}`,
        taskId,
        actor: userAddress || 'unknown',
        metadata: { reason: revisionNote },
      });
      setRevisionNote('');
      setShowRevisionForm(false);
      refreshDeliverables(); refreshTaskData();
      refreshTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request revision');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this task?')) return;
    const result = await transitionTaskStatus(taskId, 'cancelled', userAddress || '');
    if (!result.success) {
      await updateTaskData(taskId, { status: 'cancelled' });
    }
    logEvent({
      type: 'task_cancelled',
      message: `Task "${task.title}" cancelled`,
      taskId,
      actor: userAddress || 'unknown',
    });
    refreshDeliverables(); refreshTaskData();
    refreshTasks();
  };

  const canPlaceBid = isAuthenticated && userAddress && (task.status === 'open' || task.status === 'funded') && !isCreator;
  const canAcceptBids = isCreator && (task.status === 'open' || task.status === 'funded') && bids.length > 0;

  const latestDeliverable = deliverables.length > 0 ? deliverables[deliverables.length - 1] : null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/tasks" className="text-purple-400 text-sm hover:text-purple-300 transition-colors mb-4 inline-block">
            ← Back to Task Board
          </a>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-4">{task.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span>Posted by <span className="text-purple-400">{task.creatorName || 'Anonymous'}</span></span>
                <span>•</span>
                <span>{formatDate(task.createdAt)}</span>
                <span>•</span>
                <span>{task.bidsCount} bids</span>
              </div>
            </div>
            <StatusBadge status={task.status} type="task" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="font-semibold text-lg text-white mb-3">Description</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              <div className="mt-6">
                <h3 className="font-medium text-white mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {task.skillsRequired.map((skill: string) => <SkillTag key={skill} skill={skill} size="md" />)}
                </div>
              </div>
            </div>

            {/* Task Chat */}
            <TaskChat 
              taskId={taskId}
              taskCreatorAddress={task.creatorAddress}
              taskAgentAddress={task.acceptedAgentAddress}
            />

            {/* Status Timeline */}
            <TaskStatusTimeline
              task={task}
              escrowStatus={escrowStatus}
              escrowTxId={task.escrowTxId}
              releaseTxId={task.metadata?.release_tx_id}
            />

            {/* Deliverables Section */}
            {deliverables.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h2 className="font-semibold text-lg text-white mb-4">
                  Work Submissions ({deliverables.length})
                </h2>
                <div className="space-y-4">
                  {deliverables.map((del) => (
                    <div key={del.id} className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Revision #{del.revision}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          del.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          del.status === 'revision_requested' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {del.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{del.content}</p>
                      {del.urls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {del.urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-purple-400 text-xs hover:text-purple-300 underline">
                              {url.length > 60 ? url.slice(0, 60) + '...' : url}
                            </a>
                          ))}
                        </div>
                      )}
                      {del.reviewNote && (
                        <div className="mt-2 p-2 bg-slate-800 rounded text-sm text-yellow-300">
                          Review: {del.reviewNote}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">{formatDate(del.submittedAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Work Submission Form (for assigned agent) */}
            {isAssignedAgent && task.status === 'in_progress' && task.assignedAgentId && (
              <DeliverableSubmit 
                taskId={taskId}
                agentId={task.assignedAgentId}
                onDeliverableSubmitted={async () => {
                  await refreshTaskData();
                  refreshDeliverables();
                }}
              />
            )}

            {/* Review Interface (for creator when work is submitted) */}
            {isCreator && task.status === 'review' && latestDeliverable && (
              <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-6">
                <h2 className="font-semibold text-lg text-white mb-4">Review Submitted Work</h2>
                <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                  <p className="text-gray-300 text-sm mb-2">{latestDeliverable.content}</p>
                  {latestDeliverable.urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {latestDeliverable.urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="text-purple-400 text-sm hover:text-purple-300 underline">
                          📎 {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {actionLoading === 'approve' ? 'Approving...' : '✅ Approve & Release Payment'}
                  </button>

                  {!showRevisionForm && !showDisputeForm && (
                    <>
                      <button
                        onClick={() => setShowRevisionForm(true)}
                        className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                      >
                        🔄 Request Revision
                      </button>
                      <button
                        onClick={() => setShowDisputeForm(true)}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                      >
                        ⚠️ Dispute
                      </button>
                    </>
                  )}
                </div>

                {/* Revision form */}
                {showRevisionForm && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      rows={3}
                      placeholder="What needs to be changed?"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleRequestRevision}
                        disabled={!revisionNote.trim() || actionLoading === 'revision'}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg text-sm"
                      >
                        Send Revision Request
                      </button>
                      <button onClick={() => setShowRevisionForm(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Dispute form */}
                {showDisputeForm && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      rows={3}
                      placeholder="Reason for dispute..."
                      className="w-full px-4 py-3 bg-slate-900/50 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleDispute}
                        disabled={!disputeReason.trim() || actionLoading === 'dispute'}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm"
                      >
                        File Dispute
                      </button>
                      <button onClick={() => setShowDisputeForm(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EGO Mint Section — visible after task completion */}
            {isCreator && task.status === 'completed' && assignedAgent && (
              <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-lg p-6">
                <h2 className="font-semibold text-lg text-white mb-3">🏆 Mint EGO Reputation Tokens</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Reward <strong className="text-emerald-400">{assignedAgent.name}</strong> with 10 EGO soulbound reputation tokens on the Ergo blockchain.
                  This costs ~0.0021 ERG (token box + tx fee).
                </p>

                {egoMintTxId ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="text-emerald-400 font-semibold mb-1">✅ EGO Tokens Minted!</div>
                    <a
                      href={`https://explorer.ergoplatform.com/en/transactions/${egoMintTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                    >
                      TX: {egoMintTxId.slice(0, 12)}...{egoMintTxId.slice(-8)} →
                    </a>
                  </div>
                ) : (
                  <>
                    {egoMintError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-3">
                        {egoMintError}
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (!userAddress || !assignedAgent?.ergoAddress) return;
                        setActionLoading('ego-mint');
                        setEgoMintError(null);
                        try {
                          const utxos = await getUtxos();
                          const unsignedTx = await mintEgoAfterRelease({
                            agentAddress: assignedAgent.ergoAddress,
                            agentName: assignedAgent.name,
                            minterAddress: userAddress,
                            minterUtxos: utxos,
                          });
                          const signedTx = await window.ergo!.sign_tx(unsignedTx);
                          const txId = await window.ergo!.submit_tx(signedTx);
                          setEgoMintTxId(txId);
                        } catch (err) {
                          setEgoMintError(err instanceof Error ? err.message : 'Failed to mint EGO tokens');
                        } finally {
                          setActionLoading('');
                        }
                      }}
                      disabled={actionLoading === 'ego-mint'}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      {actionLoading === 'ego-mint' ? 'Minting...' : '🏆 Mint 10 EGO Tokens for Agent'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Bids Section */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-white">Bids ({bids.length})</h2>
                {canPlaceBid && !showBidForm && (
                  <button
                    onClick={() => setShowBidForm(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 text-sm"
                  >
                    Place a Bid
                  </button>
                )}
              </div>

              {showBidForm && canPlaceBid && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Place Your Bid</h3>
                    <button onClick={() => setShowBidForm(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                  </div>
                  <BidForm taskId={taskId} taskCreatorAddress={task.creatorAddress} onBidSubmitted={() => { setShowBidForm(false); }} />
                </div>
              )}

              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map(bid => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      onAccept={canAcceptBids ? handleAcceptBid : undefined}
                      canAccept={canAcceptBids && actionLoading !== 'accept-bid'}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-2">No bids yet</p>
                  <p className="text-gray-500 text-sm">Be the first to bid on this task!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{task.budgetErg} ERG</div>
                <div className="text-gray-400 text-sm">Budget</div>
              </div>
              
              {canPlaceBid && (
                <button
                  onClick={() => setShowBidForm(true)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  Place a Bid
                </button>
              )}

              {(!isAuthenticated || !userAddress) && (task.status === 'open' || task.status === 'funded') && (
                <a href="/auth" className="w-full block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg text-center">
                  Sign In to Bid
                </a>
              )}
            </div>

            {/* Assigned Agent */}
            {assignedAgent && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-sm mb-3 text-gray-400 uppercase tracking-wide">Assigned Agent</h3>
                <a href={`/agents/${assignedAgent.id}`} className="flex items-center gap-3 group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-sm font-bold text-purple-400 border border-purple-500/20">
                    {assignedAgent.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">{assignedAgent.name}</div>
                    <div className="text-gray-400 text-xs">EGO: {assignedAgent.egoScore} • {assignedAgent.hourlyRateErg} ERG/hr</div>
                  </div>
                </a>
              </div>
            )}

            {/* Escrow Actions */}
            {assignedAgent && (isCreator || isAssignedAgent) && escrowStatus !== 'released' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-sm mb-3 text-gray-400 uppercase tracking-wide">Escrow</h3>
                <EscrowActions
                  taskId={taskId}
                  agentAddress={assignedAgent.ergoAddress || ''}
                  agentName={assignedAgent.name || 'Agent'}
                  amountErg={String(
                    bids.find(b => b.id === task.acceptedBidId)?.proposedRate || task.budgetErg || 0
                  )}
                  escrowBoxId={escrowBoxId}
                  escrowStatus={escrowStatus}
                  onFunded={async (txId, boxId) => {
                    setEscrowBoxId(boxId);
                    setEscrowStatus('funded');
                    await updateTaskEscrow(taskId, txId, { escrow_box_id: boxId, escrow_status: 'funded' });
                    await updateTaskData(taskId, { status: 'in_progress' });
                    logEvent({ type: 'escrow_funded', message: `Escrow funded: ${txId}`, taskId, actor: userAddress || '' });
                    refreshTaskData();
                  }}
                  onReleased={async (txId) => {
                    setEscrowStatus('released');
                    await updateTaskMetadata(taskId, { escrow_box_id: escrowBoxId || '', escrow_status: 'released', release_tx_id: txId });
                    await updateTaskData(taskId, { status: 'completed', completedAt: new Date().toISOString() });
                    if (task.assignedAgentId && task.budgetErg) {
                      const egoDelta = Math.min(Math.max(task.budgetErg * 0.3, 2.0), 8.0);
                      await updateAgentStats(task.assignedAgentId, egoDelta, `Task completed: ${task.title}`);
                    }
                    logEvent({ type: 'escrow_released', message: `Payment released: ${txId}`, taskId, actor: userAddress || '' });
                    refreshTaskData();
                  }}
                  onRefunded={async (txId) => {
                    setEscrowStatus('refunded');
                    await updateTaskMetadata(taskId, { escrow_box_id: escrowBoxId || '', escrow_status: 'refunded', refund_tx_id: txId });
                    await updateTaskData(taskId, { status: 'disputed' });
                    logEvent({ type: 'escrow_refunded', message: `Escrow refunded: ${txId}`, taskId, actor: userAddress || '' });
                    refreshTaskData();
                  }}
                />
              </div>
            )}

            {/* Task Details */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h3 className="font-semibold text-sm mb-4 text-gray-400 uppercase tracking-wide">Task Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <StatusBadge status={task.status} type="task" />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Bids</span>
                  <span className="text-white">{task.bidsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Posted</span>
                  <span className="text-white">{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
                {task.escrowTxId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Escrow TX</span>
                    <span className="text-purple-400 text-xs font-mono">
                      {task.escrowTxId.slice(0, 8)}...{task.escrowTxId.slice(-8)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator Actions */}
            {isCreator && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-sm mb-4 text-gray-400 uppercase tracking-wide">Creator Actions</h3>
                <div className="space-y-3">
                  {(task.status === 'open' || task.status === 'funded') && (
                    <button
                      onClick={handleCancel}
                      className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors border border-red-500/20"
                    >
                      Cancel Task
                    </button>
                  )}
                  {(task.status === 'open' || task.status === 'funded') && bids.length > 0 && (
                    <p className="text-sm text-gray-400">Review bids above and accept the best one.</p>
                  )}
                  {task.status === 'in_progress' && (
                    <p className="text-sm text-gray-400">Work is in progress. Wait for the agent to submit.</p>
                  )}
                  {task.status === 'review' && (
                    <p className="text-sm text-gray-400">Review the submitted work above.</p>
                  )}
                  {task.status === 'completed' && (
                    <p className="text-sm text-emerald-400">✅ Task completed successfully!</p>
                  )}
                  {task.status === 'cancelled' && (
                    <p className="text-sm text-gray-400">This task has been cancelled.</p>
                  )}
                  {task.status === 'refunded' && (
                    <p className="text-sm text-purple-400">Escrow has been refunded.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
