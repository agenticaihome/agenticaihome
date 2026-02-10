'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';

interface TaskStatusTimelineProps {
  task: Task;
  escrowStatus?: 'unfunded' | 'funded' | 'released' | 'refunded';
  escrowTxId?: string;
  releaseTxId?: string;
}

interface TimelineStep {
  key: string;
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending' | 'skipped';
  timestamp?: string;
  txId?: string;
  icon: React.ReactNode;
}

export default function TaskStatusTimeline({ 
  task, 
  escrowStatus = 'unfunded', 
  escrowTxId,
  releaseTxId 
}: TaskStatusTimelineProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Define the complete task lifecycle
  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        key: 'created',
        title: 'Task Created',
        description: 'Task posted and ready for bids',
        status: 'completed',
        timestamp: task.createdAt,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'bid_accepted',
        title: 'Bid Accepted',
        description: 'Agent selected and task assigned',
        status: task.status === 'open' ? 'pending' : 'completed',
        timestamp: task.acceptedBidId ? task.createdAt : undefined, // Approximate - would need bid accepted timestamp
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'escrow_funded',
        title: 'Escrow Funded',
        description: 'Payment locked in smart contract',
        status: escrowStatus === 'unfunded' ? 'pending' : 'completed',
        timestamp: escrowTxId ? task.createdAt : undefined, // Would need funding timestamp
        txId: escrowTxId,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-6-8a6 6 0 1112 0 6 6 0 01-12 0zm3-2a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 017 8zm0 4a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 017 12z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'work_started',
        title: 'Work Started',
        description: 'Agent begins working on the task',
        status: ['open', 'funded'].includes(task.status) ? 'pending' : 'completed',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'work_submitted',
        title: 'Work Submitted',
        description: 'Agent delivers completed work for review',
        status: task.status === 'review' ? 'active' : (['open', 'funded', 'in_progress'].includes(task.status) ? 'pending' : 'completed'),
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'work_approved',
        title: 'Work Approved',
        description: 'Client reviews and approves deliverables',
        status: task.status === 'completed' ? 'completed' : (task.status === 'review' ? 'active' : 'pending'),
        timestamp: task.completedAt,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'payment_released',
        title: 'Payment Released',
        description: 'ERG transferred to agent automatically',
        status: escrowStatus === 'released' ? 'completed' : 'pending',
        txId: releaseTxId,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
          </svg>
        )
      },
      {
        key: 'rated',
        title: 'Rated',
        description: 'Both parties leave mutual ratings',
        status: 'pending', // Would need to check if ratings exist
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      }
    ];

    // Handle special states
    if (task.status === 'disputed') {
      steps.push({
        key: 'disputed',
        title: 'Dispute Opened',
        description: 'Work quality disputed, mediation required',
        status: 'active',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      });
    }

    if (task.status === 'cancelled') {
      steps.push({
        key: 'cancelled',
        title: 'Task Cancelled',
        description: 'Task cancelled before completion',
        status: 'completed',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )
      });
    }

    return steps;
  };

  const steps = getTimelineSteps();
  const activeStepIndex = steps.findIndex(step => step.status === 'active');
  const completedSteps = steps.filter(step => step.status === 'completed').length;

  const getStepColors = (step: TimelineStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return {
          bg: 'bg-[var(--accent-green)]',
          text: 'text-white',
          border: 'border-[var(--accent-green)]',
          line: 'bg-[var(--accent-green)]'
        };
      case 'active':
        return {
          bg: 'bg-[var(--accent-cyan)]',
          text: 'text-white',
          border: 'border-[var(--accent-cyan)]',
          line: 'bg-[var(--accent-cyan)]'
        };
      case 'pending':
        return {
          bg: 'bg-[var(--bg-secondary)]',
          text: 'text-[var(--text-muted)]',
          border: 'border-[var(--border-color)]',
          line: 'bg-[var(--border-color)]'
        };
      case 'skipped':
        return {
          bg: 'bg-[var(--accent-amber)]/10',
          text: 'text-[var(--accent-amber)]',
          border: 'border-[var(--accent-amber)]/30',
          line: 'bg-[var(--accent-amber)]/30'
        };
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Task Progress</h3>
        <div className="flex items-center gap-4">
          <div className="text-sm text-[var(--text-secondary)]">
            {completedSteps} of {steps.length} steps completed
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 mb-8">
        <div 
          className="bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] h-2 rounded-full transition-all duration-500"
          style={{ width: `${(completedSteps / steps.length) * 100}%` }}
        />
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const colors = getStepColors(step, index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="relative flex items-start">
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={`absolute left-6 top-12 w-0.5 h-8 ${colors.line}`}
                />
              )}
              
              {/* Icon Circle */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center ${colors.text}`}>
                {step.icon}
              </div>

              {/* Content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className={`font-medium ${step.status === 'completed' ? 'text-white' : step.status === 'active' ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'}`}>
                    {step.title}
                  </h4>
                  {step.status === 'active' && (
                    <span className="px-2 py-0.5 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] text-xs rounded-full border border-[var(--accent-cyan)]/20">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-2">{step.description}</p>
                
                {showDetails && (
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    {step.timestamp && (
                      <span>📅 {formatDate(step.timestamp)}</span>
                    )}
                    {step.txId && (
                      <a
                        href={`https://explorer.ergoplatform.com/en/transactions/${step.txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors flex items-center gap-1"
                      >
                        🔗 View Transaction
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-sm">
        <div className="text-[var(--text-secondary)]">
          Current Status: <span className={`font-medium capitalize ${activeStepIndex !== -1 ? 'text-[var(--accent-cyan)]' : 'text-white'}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
        {task.budgetErg && (
          <div className="text-[var(--text-secondary)]">
            Budget: <span className="text-[var(--accent-green)] font-medium">{task.budgetErg} ERG</span>
          </div>
        )}
      </div>
    </div>
  );
}