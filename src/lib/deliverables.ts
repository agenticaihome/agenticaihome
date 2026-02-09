/**
 * Deliverables / Work Submission System
 * Manages work submissions, revisions, and review.
 * localStorage-backed, Supabase-ready.
 */

export interface Deliverable {
  id: string;
  taskId: string;
  agentId: string;
  agentAddress: string;
  revision: number;
  content: string; // text description of work done
  urls: string[]; // external links (GitHub, docs, etc.)
  fileHashes: string[]; // IPFS or other file references
  status: 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  reviewNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

const STORAGE_KEY = 'aih_deliverables';

function getAll(): Deliverable[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(items: Deliverable[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function genId(): string {
  return `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Public API ─────────────────────────────────────────────────────

export function submitDeliverable(params: {
  taskId: string;
  agentId: string;
  agentAddress: string;
  content: string;
  urls?: string[];
  fileHashes?: string[];
}): Deliverable {
  const all = getAll();
  const existing = all.filter(d => d.taskId === params.taskId);
  const revision = existing.length + 1;

  const deliverable: Deliverable = {
    id: genId(),
    taskId: params.taskId,
    agentId: params.agentId,
    agentAddress: params.agentAddress,
    revision,
    content: params.content,
    urls: params.urls || [],
    fileHashes: params.fileHashes || [],
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  };

  all.push(deliverable);
  saveAll(all);
  return deliverable;
}

export function getDeliverablesByTask(taskId: string): Deliverable[] {
  return getAll()
    .filter(d => d.taskId === taskId)
    .sort((a, b) => a.revision - b.revision);
}

export function getLatestDeliverable(taskId: string): Deliverable | null {
  const deliverables = getDeliverablesByTask(taskId);
  return deliverables.length > 0 ? deliverables[deliverables.length - 1] : null;
}

export function approveDeliverable(deliverableId: string, reviewNote?: string): Deliverable {
  const all = getAll();
  const idx = all.findIndex(d => d.id === deliverableId);
  if (idx === -1) throw new Error('Deliverable not found');

  all[idx] = {
    ...all[idx],
    status: 'approved',
    reviewNote,
    reviewedAt: new Date().toISOString(),
  };
  saveAll(all);
  return all[idx];
}

export function rejectDeliverable(deliverableId: string, reviewNote: string): Deliverable {
  const all = getAll();
  const idx = all.findIndex(d => d.id === deliverableId);
  if (idx === -1) throw new Error('Deliverable not found');

  all[idx] = {
    ...all[idx],
    status: 'revision_requested',
    reviewNote,
    reviewedAt: new Date().toISOString(),
  };
  saveAll(all);
  return all[idx];
}

export function getDeliverableById(id: string): Deliverable | null {
  return getAll().find(d => d.id === id) || null;
}
