'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TaskEvent {
  id: string;
  taskId: string;
  eventType: string;
  actorAddress: string;
  metadata: Record<string, any>;
  createdAt: string;
}

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  'status_transition': { icon: '🔄', color: 'text-blue-400', label: 'Status Changed' },
  'escrow_funded': { icon: '💰', color: 'text-green-400', label: 'Escrow Funded' },
  'escrow_released': { icon: '✅', color: 'text-emerald-400', label: 'Payment Released' },
  'escrow_refunded': { icon: '↩️', color: 'text-yellow-400', label: 'Escrow Refunded' },
  'bid_submitted': { icon: '🎯', color: 'text-purple-400', label: 'Bid Submitted' },
  'bid_accepted': { icon: '🤝', color: 'text-cyan-400', label: 'Bid Accepted' },
  'deliverable_submitted': { icon: '📦', color: 'text-indigo-400', label: 'Work Submitted' },
  'work_approved': { icon: '⭐', color: 'text-amber-400', label: 'Work Approved' },
  'work_rejected': { icon: '🔄', color: 'text-orange-400', label: 'Revision Requested' },
  'ego_minted': { icon: '💎', color: 'text-purple-400', label: 'EGO Tokens Minted' },
  'dispute_opened': { icon: '⚖️', color: 'text-red-400', label: 'Dispute Opened' },
  'dispute_resolved': { icon: '🕊️', color: 'text-green-400', label: 'Dispute Resolved' },
};

function getEventConfig(eventType: string) {
  return EVENT_CONFIG[eventType] || { icon: '📋', color: 'text-gray-400', label: eventType };
}

function formatAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || 'System';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getTransitionDescription(metadata: Record<string, any>): string {
  if (metadata.from && metadata.to) {
    return `${metadata.from} → ${metadata.to}`;
  }
  return '';
}

export default function TaskTimeline({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('task_events')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          // Table might not exist yet
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            setEvents([]);
            return;
          }
          throw error;
        }

        setEvents((data || []).map((row: any) => ({
          id: row.id,
          taskId: row.task_id,
          eventType: row.event_type,
          actorAddress: row.actor_address || '',
          metadata: row.metadata || {},
          createdAt: row.created_at,
        })));
      } catch (err) {
        console.error('Failed to load task events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [taskId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-[var(--bg-secondary)]/50 rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center text-sm text-[var(--text-secondary)] py-4">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
        Activity Log
      </h4>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--border-color)]" />

        {events.map((event, index) => {
          const config = getEventConfig(event.eventType);
          const transitionDesc = getTransitionDescription(event.metadata);

          return (
            <div key={event.id} className="relative flex items-start gap-3 py-2 pl-1">
              {/* Timeline dot */}
              <div className="relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm flex-shrink-0">
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {transitionDesc && (
                    <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)]/50 px-2 py-0.5 rounded">
                      {transitionDesc}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                  <span>{formatTime(event.createdAt)}</span>
                  {event.actorAddress && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{formatAddress(event.actorAddress)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
