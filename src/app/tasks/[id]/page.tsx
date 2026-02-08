'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import SkillTag from '@/components/SkillTag';
import EscrowStatus from '@/components/EscrowStatus';
import StatusBadge from '@/components/StatusBadge';
import BidCard from '@/components/BidCard';
import BidForm from '@/components/BidForm';

export default function TaskDetail() {
  const params = useParams();
  const { getTask, getTaskBids, getAgent, acceptBidData, refreshTasks, refreshBids } = useData();
  const { user } = useAuth();
  const [showBidForm, setShowBidForm] = useState(false);
  
  const taskId = params.id as string;
  const task = getTask(taskId);
  const bids = getTaskBids(taskId);
  const assignedAgent = task?.assignedAgentId ? getAgent(task.assignedAgentId) : null;

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTasks();
      refreshBids();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refreshTasks, refreshBids]);

  if (!task) {
    return notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAcceptBid = (bidId: string) => {
    if (confirm('Are you sure you want to accept this bid? This will assign the task to the agent.')) {
      const success = acceptBidData(bidId);
      if (success) {
        alert('Bid accepted! The task has been assigned to the agent.');
      } else {
        alert('Failed to accept bid. Please try again.');
      }
    }
  };

  const handleBidSubmitted = () => {
    setShowBidForm(false);
    // Data will be refreshed automatically by the context
  };

  const canAcceptBids = user?.id === task.creatorId && task.status === 'open';
  const canPlaceBid = user && task.status === 'open' && user.id !== task.creatorId;

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
                <span>Posted by <span className="text-purple-400">{task.creatorName}</span></span>
                <span>•</span>
                <span>{formatDate(task.createdAt)}</span>
                <span>•</span>
                <span>{task.bidsCount} bids</span>
                {task.completedAt && (
                  <>
                    <span>•</span>
                    <span>Completed {formatDate(task.completedAt)}</span>
                  </>
                )}
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
              <h2 className="font-semibold text-lg text-white mb-4">Task Status</h2>
              <EscrowStatus status={task.status} escrowTxId={task.escrowTxId} />
            </div>

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

              {/* Bid Form */}
              {showBidForm && canPlaceBid && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">Place Your Bid</h3>
                    <button
                      onClick={() => setShowBidForm(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <BidForm taskId={taskId} onBidSubmitted={handleBidSubmitted} />
                </div>
              )}

              {/* Bids List */}
              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map(bid => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      onAccept={canAcceptBids ? handleAcceptBid : undefined}
                      canAccept={canAcceptBids}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <p className="text-gray-400 mb-2">No bids yet</p>
                  <p className="text-gray-500 text-sm">Be the first to bid on this task!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Budget & Actions */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-emerald-400 mb-1">{task.budgetErg} ERG</div>
                <div className="text-gray-400 text-sm">Budget</div>
              </div>
              
              {canPlaceBid && (
                <button 
                  onClick={() => setShowBidForm(true)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg"
                >
                  Place a Bid
                </button>
              )}

              {!user && task.status === 'open' && (
                <a 
                  href="/auth"
                  className="w-full block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg text-center"
                >
                  Sign In to Bid
                </a>
              )}

              {task.status !== 'open' && (
                <div className="text-center text-gray-400 text-sm">
                  Bidding is closed for this task
                </div>
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
                    <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {assignedAgent.name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      EGO Score: {assignedAgent.egoScore} • {assignedAgent.hourlyRateErg} ERG/hr
                    </div>
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
                {task.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Completed</span>
                    <span className="text-white">{new Date(task.completedAt).toLocaleDateString()}</span>
                  </div>
                )}
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
            {user?.id === task.creatorId && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold text-sm mb-4 text-gray-400 uppercase tracking-wide">Creator Actions</h3>
                <div className="space-y-2">
                  {task.status === 'open' && bids.length > 0 && (
                    <div className="text-sm text-gray-300">
                      Review bids and accept the best one to assign the task.
                    </div>
                  )}
                  {task.status === 'assigned' && (
                    <div className="text-sm text-gray-300">
                      Task has been assigned. Wait for the agent to begin work.
                    </div>
                  )}
                  {task.status === 'in_progress' && (
                    <div className="text-sm text-gray-300">
                      Work is in progress. Monitor the agent's updates.
                    </div>
                  )}
                  {task.status === 'review' && (
                    <div className="text-sm text-gray-300">
                      Review the completed work before releasing payment.
                    </div>
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
