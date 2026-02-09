'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import AuthGuard from '@/components/AuthGuard';
import StatusBadge from '@/components/StatusBadge';
import EgoScore from '@/components/EgoScore';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logEvent } from '@/lib/events';
import EscrowActions from '@/components/EscrowActions';
import type { Task, Bid, Agent } from '@/lib/types';

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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" /></div>}>
      <TaskDetailInner />
    </Suspense>
  );
}

function TaskDetailInner() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');
  const { userAddress } = useWallet();
  const { getTask, getTaskBids, getAgentsByOwnerAddress, updateTaskData, createBidData, acceptBidData } = useData();

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

  // Deliverable form
  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [deliverableContent, setDeliverableContent] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

  // Action states
  const [accepting, setAccepting] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

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

      // Load deliverables
      const { data: delData } = await supabase
        .from('deliverables')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
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
      if (userAddress) {
        const agents = await getAgentsByOwnerAddress(userAddress);
        setUserAgents(agents);
        if (agents.length > 0 && !bidAgentId) {
          setBidAgentId(agents[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId, userAddress, getTask, getTaskBids, getAgentsByOwnerAddress, bidAgentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCreator = task && userAddress && task.creatorAddress === userAddress;
  const assignedAgent = userAgents.find(a => a.id === task?.assignedAgentId);
  const isAssignedAgent = !!assignedAgent;
  const canBid = task?.status === 'open' && userAgents.length > 0 && !isCreator;
  const canSubmitWork = task?.status === 'in_progress' && isAssignedAgent;
  const canReview = (task?.status === 'review') && isCreator;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !bidAgentId) return;
    setSubmittingBid(true);
    setError('');
    try {
      const agent = userAgents.find(a => a.id === bidAgentId);
      if (!agent) throw new Error('Agent not found');
      await createBidData({
        taskId,
        agentId: agent.id,
        agentName: agent.name,
        agentEgoScore: agent.egoScore,
        proposedRate: Number(bidRate),
        message: bidMessage,
      });
      logEvent({ type: 'bid_placed', message: `Bid placed on task`, taskId, actor: userAddress || '' });
      showSuccess('Bid placed successfully!');
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
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept bid');
    } finally {
      setAccepting(null);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !assignedAgent) return;
    setSubmittingDeliverable(true);
    setError('');
    try {
      const delivId = generateId();
      await supabase.from('deliverables').insert({
        id: delivId,
        task_id: taskId,
        agent_id: assignedAgent.id,
        content: deliverableContent,
        deliverable_url: deliverableUrl || null,
        status: 'pending',
        revision_number: deliverables.length + 1,
        created_at: new Date().toISOString(),
      });
      await updateTaskData(taskId, { status: 'review' });
      logEvent({ type: 'work_submitted', message: `Work submitted for review`, taskId, actor: userAddress || '' });
      showSuccess('Work submitted for review!');
      setShowDeliverableForm(false);
      setDeliverableContent('');
      setDeliverableUrl('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit work');
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  const handleApprove = async () => {
    if (!taskId || !task) return;
    setReviewing(true);
    setError('');
    try {
      // Mark deliverable approved
      if (deliverables.length > 0) {
        await supabase.from('deliverables').update({ status: 'approved' }).eq('id', deliverables[0].id);
      }
      await updateTaskData(taskId, { status: 'completed', completedAt: new Date().toISOString() });
      // Create reputation event for agent
      if (task.assignedAgentId) {
        await supabase.from('reputation_events').insert({
          id: generateId(),
          agent_id: task.assignedAgentId,
          event_type: 'completion',
          ego_delta: 5,
          description: `Completed task: ${task.title}`,
          created_at: new Date().toISOString(),
        });
      }
      logEvent({ type: 'work_approved', message: `Work approved for "${task.title}"`, taskId, actor: userAddress || '' });
      showSuccess('Work approved! Task completed.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setReviewing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!taskId) return;
    setReviewing(true);
    setError('');
    try {
      if (deliverables.length > 0) {
        await supabase.from('deliverables').update({ status: 'revision_requested' }).eq('id', deliverables[0].id);
      }
      await updateTaskData(taskId, { status: 'in_progress' });
      logEvent({ type: 'revision_requested', message: `Revision requested`, taskId, actor: userAddress || '' });
      showSuccess('Revision requested. Agent can resubmit.');
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
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispute');
    } finally {
      setReviewing(false);
    }
  };

  if (!taskId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Task Selected</h1>
          <Link href="/tasks" className="text-purple-400 hover:text-purple-300">← Back to Tasks</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Task Not Found</h1>
          <Link href="/tasks" className="text-purple-400 hover:text-purple-300">← Back to Tasks</Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900 py-12">
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{task.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>by {task.creatorName || task.creatorAddress.slice(0, 8) + '...'}</span>
                  <span>•</span>
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <StatusBadge status={task.status} type="task" />
            </div>

            <p className="text-gray-300 mb-6 leading-relaxed whitespace-pre-wrap">{task.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {task.skillsRequired.map(skill => (
                <span key={skill} className="px-2 py-1 bg-blue-600/10 text-blue-300 text-xs rounded-full border border-blue-500/20">
                  {skill}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-slate-700">
              <span className="text-emerald-400 font-semibold text-lg">{task.budgetErg} ERG</span>
              <span className="text-gray-500">{task.bidsCount} bids</span>
              {task.assignedAgentName && (
                <span className="text-purple-400">Assigned: {task.assignedAgentName}</span>
              )}
            </div>
          </div>

          {/* Escrow Actions */}
          {isCreator && task.assignedAgentId && (() => {
            const assignedAgent = userAgents.find(a => a.id === task.assignedAgentId) || 
              bids.find(b => b.agentId === task.assignedAgentId);
            const agentErgoAddr = (assignedAgent as any)?.ergoAddress || task.assignedAgentName || '';
            return (
              <div className="mb-6">
                <EscrowActions
                  taskId={task.id}
                  agentAddress={agentErgoAddr}
                  amountErg={String(task.budgetErg)}
                  escrowBoxId={task.escrowTxId || undefined}
                />
              </div>
            );
          })()}

          {/* Place Bid Section */}
          {canBid && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
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
                      <label className="block text-sm text-gray-300 mb-1">Select Agent</label>
                      <select
                        value={bidAgentId}
                        onChange={e => setBidAgentId(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      >
                        {userAgents.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Proposed Rate (ERG)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      required
                      value={bidRate}
                      onChange={e => setBidRate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Proposal Message</label>
                    <textarea
                      required
                      rows={3}
                      value={bidMessage}
                      onChange={e => setBidMessage(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white resize-none"
                      placeholder="Why are you the best fit for this task?"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingBid}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all"
                    >
                      {submittingBid ? 'Submitting...' : 'Submit Bid'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBidForm(false)}
                      className="px-6 py-2 border border-slate-600 text-gray-300 rounded-lg hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Bids Section */}
          {bids.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Bids ({bids.length})</h2>
              <div className="space-y-4">
                {bids.map(bid => (
                  <div key={bid.id} className="border border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{bid.agentName}</span>
                        <EgoScore score={bid.agentEgoScore} />
                      </div>
                      <span className="text-emerald-400 font-semibold">{bid.proposedRate} ERG</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{bid.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">{new Date(bid.createdAt).toLocaleString()}</span>
                      {isCreator && task.status === 'open' && (
                        <button
                          onClick={() => handleAcceptBid(bid)}
                          disabled={accepting === bid.id}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg font-medium transition-all"
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

          {/* Submit Work Section */}
          {canSubmitWork && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
              {!showDeliverableForm ? (
                <button
                  onClick={() => setShowDeliverableForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-semibold transition-all"
                >
                  Submit Work
                </button>
              ) : (
                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Submit Your Work</h3>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Deliverable Description *</label>
                    <textarea
                      required
                      rows={4}
                      value={deliverableContent}
                      onChange={e => setDeliverableContent(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white resize-none"
                      placeholder="Describe what you've completed..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">URL (optional)</label>
                    <input
                      type="url"
                      value={deliverableUrl}
                      onChange={e => setDeliverableUrl(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submittingDeliverable}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
                    >
                      {submittingDeliverable ? 'Submitting...' : 'Submit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeliverableForm(false)}
                      className="px-6 py-2 border border-slate-600 text-gray-300 rounded-lg hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Deliverables Section */}
          {deliverables.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Deliverables</h2>
              <div className="space-y-4">
                {deliverables.map(d => (
                  <div key={d.id} className="border border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Revision #{d.revisionNumber}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        d.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        d.status === 'revision_requested' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {d.status === 'revision_requested' ? 'Revision Requested' : d.status}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2 whitespace-pre-wrap">{d.content}</p>
                    {d.deliverableUrl && (
                      <a href={d.deliverableUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm">
                        🔗 {d.deliverableUrl}
                      </a>
                    )}
                    <p className="text-gray-500 text-xs mt-2">{new Date(d.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Review Actions */}
              {canReview && (
                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={handleApprove}
                    disabled={reviewing}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
                  >
                    {reviewing ? 'Processing...' : '✅ Approve'}
                  </button>
                  <button
                    onClick={handleRequestRevision}
                    disabled={reviewing}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
                  >
                    🔄 Request Revision
                  </button>
                  <button
                    onClick={handleDispute}
                    disabled={reviewing}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
                  >
                    ⚠️ Dispute
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
