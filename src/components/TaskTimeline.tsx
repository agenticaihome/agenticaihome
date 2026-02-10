'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  icon: string;
  status: 'completed' | 'current' | 'future';
  timestamp?: string;
  txId?: string;
}

interface TaskTimelineProps {
  task: Task;
  className?: string;
}

export default function TaskTimeline({ task, className = '' }: TaskTimelineProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load task events if the table exists
  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_events')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading task events:', error);
      } else if (data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error loading task events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [task.id]);

  // Generate timeline steps based on task data and events
  const generateTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [];
    const taskStatus = task.status;
    const metadata = task.metadata || {};
    
    // Step 1: Task Created
    steps.push({
      key: 'created',
      label: 'Task Created',
      description: 'Task posted to marketplace',
      icon: '📝',
      status: 'completed',
      timestamp: task.createdAt,
    });

    // Step 2: Bid Accepted (if there's an assigned agent)
    if (task.assignedAgentId) {
      steps.push({
        key: 'bid_accepted',
        label: 'Bid Accepted',
        description: `${task.assignedAgentName || 'Agent'} was selected`,
        icon: '🤝',
        status: 'completed',
        // Find timestamp from events or fallback to created date
        timestamp: events.find(e => e.event_type === 'bid_accepted')?.created_at || task.createdAt,
      });
    } else {
      steps.push({
        key: 'bid_accepted',
        label: 'Awaiting Bid Selection',
        description: 'Waiting for task creator to accept a bid',
        icon: '🤝',
        status: taskStatus === 'open' ? 'current' : 'future',
      });
    }

    // Step 3: Escrow Funded
    if (metadata.escrow_box_id || task.escrowTxId) {
      steps.push({
        key: 'escrow_funded',
        label: 'Escrow Funded',
        description: 'Payment secured in escrow',
        icon: '🔒',
        status: 'completed',
        timestamp: events.find(e => e.event_type === 'escrow_funded')?.created_at,
        txId: task.escrowTxId || metadata.escrow_tx_id,
      });
    } else if (task.assignedAgentId) {
      steps.push({
        key: 'escrow_funded',
        label: 'Fund Escrow',
        description: 'Waiting for task creator to fund escrow',
        icon: '🔒',
        status: 'current',
      });
    } else {
      steps.push({
        key: 'escrow_funded',
        label: 'Escrow Funding',
        description: 'Escrow will be funded after bid acceptance',
        icon: '🔒',
        status: 'future',
      });
    }

    // Step 4: Work Submitted
    if (['review', 'completed', 'disputed'].includes(taskStatus)) {
      steps.push({
        key: 'work_submitted',
        label: 'Work Submitted',
        description: 'Agent submitted deliverable for review',
        icon: '📦',
        status: 'completed',
        timestamp: events.find(e => e.event_type === 'work_submitted')?.created_at,
      });
    } else if (taskStatus === 'in_progress') {
      steps.push({
        key: 'work_submitted',
        label: 'Work in Progress',
        description: 'Agent is working on the task',
        icon: '📦',
        status: 'current',
      });
    } else {
      steps.push({
        key: 'work_submitted',
        label: 'Work Submission',
        description: 'Agent will submit work when ready',
        icon: '📦',
        status: 'future',
      });
    }

    // Step 5: Under Review
    if (taskStatus === 'review') {
      steps.push({
        key: 'under_review',
        label: 'Under Review',
        description: 'Task creator is reviewing the work',
        icon: '👀',
        status: 'current',
      });
    } else if (['completed'].includes(taskStatus)) {
      steps.push({
        key: 'under_review',
        label: 'Reviewed',
        description: 'Work has been reviewed and approved',
        icon: '✅',
        status: 'completed',
        timestamp: events.find(e => e.event_type === 'work_approved')?.created_at,
      });
    } else if (taskStatus === 'disputed') {
      steps.push({
        key: 'under_review',
        label: 'Disputed',
        description: 'Work is under dispute resolution',
        icon: '⚠️',
        status: 'current',
      });
    } else {
      steps.push({
        key: 'under_review',
        label: 'Review Pending',
        description: 'Awaiting work submission',
        icon: '👀',
        status: 'future',
      });
    }

    // Step 6: Payment Released
    if (taskStatus === 'completed' && (metadata.escrow_status === 'released' || metadata.release_tx_id)) {
      steps.push({
        key: 'payment_released',
        label: 'Payment Released',
        description: 'Funds transferred to agent',
        icon: '💰',
        status: 'completed',
        timestamp: events.find(e => e.event_type === 'payment_released')?.created_at,
        txId: metadata.release_tx_id,
      });
    } else if (taskStatus === 'completed' && metadata.escrow_status === 'approved_pending_release') {
      steps.push({
        key: 'payment_released',
        label: 'Release Payment',
        description: 'Work approved, ready to release payment',
        icon: '💰',
        status: 'current',
      });
    } else if (taskStatus === 'completed') {
      steps.push({
        key: 'payment_released',
        label: 'Payment Complete',
        description: 'Task completed and paid',
        icon: '💰',
        status: 'completed',
        timestamp: task.completedAt,
      });
    } else {
      steps.push({
        key: 'payment_released',
        label: 'Payment Release',
        description: 'Payment will be released upon approval',
        icon: '💰',
        status: 'future',
      });
    }

    // Step 7: Task Rated (optional final step)
    if (taskStatus === 'completed') {
      // This could be expanded to check for actual ratings
      steps.push({
        key: 'rated',
        label: 'Task Complete',
        description: 'Ready for ratings and feedback',
        icon: '⭐',
        status: 'current',
      });
    } else {
      steps.push({
        key: 'rated',
        label: 'Rating & Feedback',
        description: 'Final ratings will be collected',
        icon: '⭐',
        status: 'future',
      });
    }

    return steps;
  };

  const timelineSteps = generateTimelineSteps();

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStepStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          dot: 'bg-green-500 border-green-400',
          line: 'bg-green-500',
          text: 'text-green-400',
          bg: 'bg-green-500/10 border-green-500/30',
        };
      case 'current':
        return {
          dot: 'bg-cyan-500 border-cyan-400 animate-pulse',
          line: 'bg-gray-600',
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/30',
        };
      default: // future
        return {
          dot: 'bg-gray-600 border-gray-500',
          line: 'bg-gray-600',
          text: 'text-gray-400',
          bg: 'bg-gray-500/5 border-gray-600',
        };
    }
  };

  return (
    <div className={`border border-gray-800 rounded-lg bg-gray-900 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">🗓️</span>
        <h3 className="text-xl font-semibold text-white">Task Progress</h3>
      </div>

      <div className="relative">
        {timelineSteps.map((step, index) => {
          const styles = getStepStyles(step.status);
          const isLast = index === timelineSteps.length - 1;

          return (
            <div key={step.key} className="relative flex items-start pb-8">
              {/* Timeline line */}
              {!isLast && (
                <div className={`absolute left-4 top-8 w-0.5 h-full ${styles.line}`} />
              )}

              {/* Timeline dot */}
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${styles.dot} flex-shrink-0`}>
                <span className="text-sm">{step.icon}</span>
              </div>

              {/* Timeline content */}
              <div className="ml-6 flex-1">
                <div className={`rounded-lg p-4 border ${styles.bg}`}>
                  <div className="flex items-start justify-between mb-1">
                    <h4 className={`font-semibold ${styles.text}`}>
                      {step.label}
                    </h4>
                    {step.timestamp && (
                      <span className="text-gray-500 text-xs">
                        {formatTimestamp(step.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{step.description}</p>
                  
                  {step.txId && (
                    <a
                      href={`https://explorer.ergoplatform.com/en/transactions/${step.txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs"
                    >
                      <span>🔗</span>
                      View Transaction
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="text-center text-gray-400 text-sm mt-4">
          <div className="inline-flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
            Loading timeline events...
          </div>
        </div>
      )}
    </div>
  );
}