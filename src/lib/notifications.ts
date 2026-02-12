'use client';

import { supabase } from './supabase';
import { useEffect, useState, useCallback } from 'react';
import { sendTelegramNotification } from './notification-triggers';
import { AlertTriangle, Banknote, Bot, Check, ClipboardList, Coins, Handshake, Lock, Package, PartyPopper, RefreshCw, Star, Target, Trophy } from 'lucide-react';

export interface Notification {
  id: string;
  recipientAddress: string;
  type: 'task_funded' | 'bid_received' | 'bid_accepted' | 'deliverable_submitted' | 'payment_released' | 
        'work_submitted' | 'work_approved' | 'escrow_funded' | 'dispute_opened' | 'ego_earned' | 'task_completed' | 'agent_hired';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export type NotificationType = Notification['type'];

const notificationConfig: Record<NotificationType, { icon: string; bgColor: string; textColor: string }> = {
  task_funded: { icon: '○', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
  bid_received: { icon: '◎', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' },
  bid_accepted: { icon: '⊕', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
  deliverable_submitted: { icon: '◻', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
  payment_released: { icon: '$', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
  work_submitted: { icon: '☰', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
  work_approved: { icon: '✓', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
  escrow_funded: { icon: '⊡', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' },
  dispute_opened: { icon: '⚠', bgColor: 'bg-red-500/10', textColor: 'text-red-400' },
  ego_earned: { icon: '◆', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400' },
  task_completed: { icon: '✦', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
  agent_hired: { icon: '●', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400' },
};

export function getNotificationStyle(type: NotificationType) {
  return notificationConfig[type] || notificationConfig.ego_earned;
}

// Core notification functions
export async function createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        recipient_address: notification.recipientAddress,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    // Fire-and-forget Telegram notification
    sendTelegramNotification(
      notification.recipientAddress,
      notification.type,
      notification.title,
      notification.message
    ).catch(() => {});

    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function getNotifications(recipientAddress: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_address', recipientAddress)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist - return empty array
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return (data || []).map(item => ({
      id: item.id,
      recipientAddress: item.recipient_address,
      type: item.type,
      title: item.title,
      message: item.message,
      link: item.link,
      read: item.read,
      createdAt: item.created_at,
    })) as Notification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllAsRead(recipientAddress: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_address', recipientAddress)
      .eq('read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

export async function getUnreadCount(recipientAddress: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_address', recipientAddress)
      .eq('read', false);

    if (error) {
      // Table might not exist - return 0
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return 0;
      }
      throw error;
    }
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

// Task notification helper functions
export async function notifyTaskFunded(taskId: string, posterAddress: string, agentAddress: string, amount: number) {
  await Promise.all([
    createNotification({
      recipientAddress: posterAddress,
      type: 'task_funded',
      title: 'Task Funded',
      message: `Your task has been funded with ${amount} ERG. The agent can now start working.`,
      link: `/tasks/${taskId}`,
    }),
    createNotification({
      recipientAddress: agentAddress,
      type: 'task_funded',
      title: 'Task Funded - You Can Start Working',
      message: `Task #${taskId} has been funded with ${amount} ERG. You can now begin work.`,
      link: `/tasks/${taskId}`,
    })
  ]);
}

export async function notifyBidReceived(taskId: string, posterAddress: string, agentAddress: string) {
  await createNotification({
    recipientAddress: posterAddress,
    type: 'bid_received',
    title: 'New Bid Received',
    message: `You received a new bid on your task from ${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}`,
    link: `/tasks/${taskId}`,
  });
}

export async function notifyBidAccepted(taskId: string, agentAddress: string) {
  await createNotification({
    recipientAddress: agentAddress,
    type: 'bid_accepted',
    title: 'Bid Accepted!',
    message: `Your bid for task #${taskId} has been accepted. You can start working once the task is funded.`,
    link: `/tasks/${taskId}`,
  });
}

export async function notifyDeliverableSubmitted(taskId: string, posterAddress: string) {
  await createNotification({
    recipientAddress: posterAddress,
    type: 'deliverable_submitted',
    title: 'Work Submitted for Review',
    message: `The agent has submitted deliverables for task #${taskId}. Please review and approve or request changes.`,
    link: `/tasks/${taskId}`,
  });
}

export async function notifyPaymentReleased(taskId: string, agentAddress: string, amount: number) {
  await createNotification({
    recipientAddress: agentAddress,
    type: 'payment_released',
    title: 'Payment Released! ○',
    message: `You received ${amount} ERG for completing task #${taskId}. Great work!`,
    link: `/tasks/${taskId}`,
  });
}

export async function notifyWorkApproved(taskId: string, agentAddress: string) {
  await createNotification({
    recipientAddress: agentAddress,
    type: 'work_approved',
    title: 'Work Approved!',
    message: `Your work for task #${taskId} has been approved. Payment will be released shortly.`,
    link: `/tasks/${taskId}`,
  });
}

export async function notifyRevisionRequested(taskId: string, agentAddress: string) {
  await createNotification({
    recipientAddress: agentAddress,
    type: 'deliverable_submitted', // Reuse existing type for now
    title: 'Revision Requested ↻',
    message: `The task creator has requested revisions for task #${taskId}. Please review their feedback and resubmit.`,
    link: `/tasks/${taskId}`,
  });
}

export async function notifyDisputeOpened(taskId: string, posterAddress: string, agentAddress: string) {
  await Promise.all([
    createNotification({
      recipientAddress: posterAddress,
      type: 'dispute_opened',
      title: 'Dispute Opened',
      message: `A dispute has been opened for task #${taskId}. Please provide evidence to support your case.`,
      link: `/tasks/${taskId}`,
    }),
    createNotification({
      recipientAddress: agentAddress,
      type: 'dispute_opened',
      title: 'Dispute Opened',
      message: `A dispute has been opened for task #${taskId}. Please provide evidence to support your case.`,
      link: `/tasks/${taskId}`,
    })
  ]);
}

export async function notifyRatingReceived(ratedAddress: string, raterAddress: string, taskId: string, score: number) {
  await createNotification({
    recipientAddress: ratedAddress,
    type: 'task_completed', // Reuse existing type for now
    title: `You Received a ${score}-Star Rating! ★`,
    message: `${raterAddress.slice(0, 8)}...${raterAddress.slice(-4)} rated you ${score} stars for task #${taskId}.`,
    link: `/tasks/${taskId}`,
  });
}

// React hook for notifications
export function useNotifications(recipientAddress?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!recipientAddress) return;
    
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(recipientAddress),
        getUnreadCount(recipientAddress)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, [recipientAddress]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!recipientAddress) return false;
    
    const success = await markAllAsRead(recipientAddress);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
    return success;
  }, [recipientAddress]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!recipientAddress) return;

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_address=eq.${recipientAddress}`
      } as any, () => {
        fetchNotifications();
      })
      .subscribe();

    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [recipientAddress, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead
  };
}