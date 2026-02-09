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

import {
  getTaskFlow,
  initTaskFlow,
  approveWork,
  disputeWork,
  cancelTask,
  requestRevision,
  type TaskFlowEntry,
  type TaskFlowState,
} from '@/lib/taskFlow';
import {
  getDeliverablesByTask,
  submitDeliverable,
  type Deliverable,
} from '@/lib/deliverables';
import { logEvent } from '@/lib/events';

export default function TaskDetailClient() {
  const params = useParams();
  const { getTask, getTaskBids, getAgent, acceptBidData, refreshTasks, refreshBids, updateTaskData } = useData();
  const { userAddress, isAuthenticated } = useWallet();
  const [showBidForm, setShowBidForm] = useState(false);
  const [flow, setFlow] = useState<TaskFlowEntry | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [submitContent, setSubmitContent] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const taskId = params.id as string;
  const [task, setTask] = useState<Awaited<ReturnType<typeof getTask>>>(null);
  const [bids, setBids] = useState<Awaited<ReturnType<typeof getTaskBids>>>([]);
  const [assignedAgent, setAssignedAgent] = useState<Awaited<ReturnType<typeof getAgent>>>(null);
  const [taskLoading, setTaskLoading] = useState(true);

  const refreshTaskData = useCallback(async () => {
    const t = await getTask(taskId);
    setTask(t);
    const b = await getTaskBids(taskId);
    setBids(b);
    if (t?.assignedAgentId) {
      const a = await getAgent(t.assignedAgentId);
      setAssignedAgent(a);
    }
  }, [taskId, getTask, getTaskBids, getAgent]);

  const refreshFlow = useCallback(() => {
    const f = getTaskFlow(taskId);
    setFlow(f);
    setDeliverables(getDeliverablesByTask(taskId));
  }, [taskId]);

  useEffect(() => {
    refreshTaskData().then(() => setTaskLoading(false));
    refreshFlow();
  }, [refreshTaskData, refreshFlow]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTaskData();
      refreshFlow();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshTaskData, refreshFlow]);

  if (taskLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>;
  }

  if (!task) {
    return notFound();
  }

  const isCreator = userAddress === task.creatorAddress;
  const isAssignedAgent = userAddress && task.assignedAgentId && assignedAgent?.ergoAddress === userAddress;
  const flowState: TaskFlowState = flow?.state || 'DRAFT';

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
      const success = await acceptBidData(bidId);
      if (success) {
        // Init flow if needed and update
        if (!flow) initTaskFlow(taskId, userAddress || 'unknown');
        logEvent({
          type: 'bid_accepted',
          message: `Bid accepted for task "${task.title}"`,
          taskId,
          actor: userAddress || 'unknown',
          metadata: { bidId },
        });
        refreshFlow();
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

      // Update task status
      await updateTaskData(taskId, { status: 'review' });

      logEvent({
        type: 'work_submitted',
        message: `Work submitted for task "${task.title}"`,
        taskId,
        actor: userAddress || 'unknown',
      });

      setSubmitContent('');
      setSubmitUrl('');
      setShowSubmitForm(false);
      refreshFlow();
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
      await updateTaskData(taskId, { status: 'completed', completedAt: new Date().toISOString() });
      logEvent({
        type: 'work_approved',
        message: `Work approved for task "${task.title}"`,
        taskId,
        actor: userAddress || 'unknown',
      });
      refreshFlow();
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
      await updateTaskData(taskId, { status: 'disputed' });
      logEvent({
        type: 'work_disputed',
        message: `Work disputed for task "${task.title}": ${disputeReason}`,
        taskId,
        actor: userAddress || 'unknown',
        metadata: { reason: disputeReason },
      });
      setDisputeReason('');
      setShowDisputeForm(false);
      refreshFlow();
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
      await updateTaskData(taskId, { status: 'in_progress' });
      logEvent({
        type: 'revision_requested',
        message: `Revision requested for task "${task.title}": ${revisionNote}`,
        taskId,
        actor: userAddress || 'unknown',
        metadata: { reason: revisionNote },
      });
      setRevisionNote('');
      setShowRevisionForm(false);
      refreshFlow();
      refreshTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request revision');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this task?')) return;
    await updateTaskData(taskId, { status: 'open' }); // or remove
    logEvent({
      type: 'task_cancelled',
      message: `Task "${task.title}" cancelled`,
      taskId,
      actor: userAddress || 'unknown',
    });
    refreshFlow();
    refreshTasks();
  };

  const canPlaceBid = isAuthenticated && userAddress && task.status === 'open' && !isCreator;

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

            {/* Status Tracker */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <h2 className="font-semibold text-lg text-white mb-4">Task Lifecycle</h2>
              <EscrowStatus
                status={task.status}
                flowState={flow?.state}
                escrowTxId={task.escrowTxId || flow?.escrowTxId}
                fundedAmount={flow?.fundedAmount}
              />
            </div>

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
            {isAssignedAgent && (task.status === 'in_progress' || task.status === 'assigned') && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h2 className="font-semibold text-lg text-white mb-4">Submit Your Work</h2>
                {!showSubmitForm ? (
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium transition-all"
                  >
                    Submit Deliverable
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Description of work completed *</label>
                      <textarea
                        value={submitContent}
                        onChange={(e) => setSubmitContent(e.target.value)}
                        rows={5}
                        placeholder="Describe what you built, how it works, and any relevant details..."
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">URL (optional)</label>
                      <input
                        type="url"
                        value={submitUrl}
                        onChange={(e) => setSubmitUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmitWork}
                        disabled={!submitContent.trim() || actionLoading === 'submit'}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        {actionLoading === 'submit' ? 'Submitting...' : 'Submit Work'}
                      </button>
                      <button
                        onClick={() => setShowSubmitForm(false)}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                  <BidForm taskId={taskId} onBidSubmitted={() => { setShowBidForm(false); }} />
                </div>
              )}

              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map(bid => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      onAccept={isCreator && task.status === 'open' ? handleAcceptBid : undefined}
                      canAccept={isCreator && task.status === 'open'}
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

              {(!isAuthenticated || !userAddress) && task.status === 'open' && (
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
                  {task.status === 'open' && (
                    <button
                      onClick={handleCancel}
                      className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors border border-red-500/20"
                    >
                      Cancel Task
                    </button>
                  )}
                  {task.status === 'open' && bids.length > 0 && (
                    <p className="text-sm text-gray-400">Review bids above and accept the best one.</p>
                  )}
                  {(task.status === 'assigned' || task.status === 'in_progress') && (
                    <p className="text-sm text-gray-400">Work is in progress. Wait for the agent to submit.</p>
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
