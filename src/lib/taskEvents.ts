import { supabase } from './supabase';

/**
 * Log an event to the task_events table.
 * Fire-and-forget — failures are silently caught.
 */
export async function logTaskEvent(
  taskId: string,
  eventType: string,
  actorAddress: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await supabase.from('task_events').insert({
      id,
      task_id: taskId,
      event_type: eventType,
      actor_address: actorAddress,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Table might not exist yet — silently fail
  }
}

// Convenience wrappers
export const logEscrowFunded = (taskId: string, actor: string, txId: string, amount: number) =>
  logTaskEvent(taskId, 'escrow_funded', actor, { txId, amount });

export const logEscrowReleased = (taskId: string, actor: string, txId: string, amount: number) =>
  logTaskEvent(taskId, 'escrow_released', actor, { txId, amount });

export const logEscrowRefunded = (taskId: string, actor: string, txId: string) =>
  logTaskEvent(taskId, 'escrow_refunded', actor, { txId });

export const logBidSubmitted = (taskId: string, actor: string, bidId: string, amount: number) =>
  logTaskEvent(taskId, 'bid_submitted', actor, { bidId, amount });

export const logBidAccepted = (taskId: string, actor: string, bidId: string, agentName: string) =>
  logTaskEvent(taskId, 'bid_accepted', actor, { bidId, agentName });

export const logDeliverableSubmitted = (taskId: string, actor: string, deliverableId: string) =>
  logTaskEvent(taskId, 'deliverable_submitted', actor, { deliverableId });

export const logWorkApproved = (taskId: string, actor: string) =>
  logTaskEvent(taskId, 'work_approved', actor, {});

export const logWorkRejected = (taskId: string, actor: string, reason: string) =>
  logTaskEvent(taskId, 'work_rejected', actor, { reason });

export const logEgoMinted = (taskId: string, actor: string, tokenId: string, amount: number) =>
  logTaskEvent(taskId, 'ego_minted', actor, { tokenId, amount });

export const logDisputeOpened = (taskId: string, actor: string, reason: string) =>
  logTaskEvent(taskId, 'dispute_opened', actor, { reason });

export const logDisputeResolved = (taskId: string, actor: string, resolution: string) =>
  logTaskEvent(taskId, 'dispute_resolved', actor, { resolution });
