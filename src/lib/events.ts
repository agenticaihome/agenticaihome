/**
 * Platform Event / Notification System
 * Logs all platform activity for dashboard feeds.
 * localStorage-backed, Supabase-ready.
 */

export type EventType =
  | 'task_created'
  | 'task_funded'
  | 'bid_placed'
  | 'bid_accepted'
  | 'work_submitted'
  | 'work_approved'
  | 'work_disputed'
  | 'dispute_resolved'
  | 'escrow_funded'
  | 'escrow_released'
  | 'escrow_refunded'
  | 'task_cancelled'
  | 'revision_requested';

export interface PlatformEvent {
  id: string;
  type: EventType;
  message: string;
  taskId?: string;
  actor: string; // address
  metadata?: Record<string, string>;
  createdAt: string;
}

const STORAGE_KEY = 'aih_events';

function getAll(): PlatformEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(events: PlatformEvent[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function logEvent(params: Omit<PlatformEvent, 'id' | 'createdAt'>): PlatformEvent {
  const event: PlatformEvent = {
    ...params,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const all = getAll();
  all.unshift(event); // newest first
  // Keep last 500 events
  if (all.length > 500) all.length = 500;
  saveAll(all);
  return event;
}

export function getEvents(limit = 50): PlatformEvent[] {
  return getAll().slice(0, limit);
}

export function getEventsByTask(taskId: string): PlatformEvent[] {
  return getAll().filter(e => e.taskId === taskId);
}

export function getEventsByActor(actor: string): PlatformEvent[] {
  return getAll().filter(e => e.actor === actor);
}

export function clearEvents(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
