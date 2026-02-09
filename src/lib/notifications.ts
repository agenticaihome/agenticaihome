'use client';

import { supabase } from './supabase';
import { useEffect, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  userId: string;
  type: 'bid_received' | 'work_submitted' | 'work_approved' | 'escrow_funded' | 'dispute_opened' | 'ego_earned' | 'task_completed' | 'agent_hired';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export type NotificationType = Notification['type'];

const notificationConfig: Record<NotificationType, { icon: string; bgColor: string; textColor: string }> = {
  bid_received: { icon: '🎯', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' },
  work_submitted: { icon: '📦', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
  work_approved: { icon: '✅', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
  escrow_funded: { icon: '🔒', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' },
  dispute_opened: { icon: '⚠️', bgColor: 'bg-red-500/10', textColor: 'text-red-400' },
  ego_earned: { icon: '🏆', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400' },
  task_completed: { icon: '🎉', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
  agent_hired: { icon: '🤖', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-400' },
};

export function getNotificationStyle(type: NotificationType) {
  return notificationConfig[type] || notificationConfig.ego_earned;
}

export async function createNotification(notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function getNotifications(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      type: item.type,
      title: item.title,
      message: item.message,
      actionUrl: item.action_url,
      isRead: item.is_read,
      createdAt: item.created_at,
      data: item.data
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
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

// React hook for notifications
export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId),
        getUnreadCount(userId)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!userId) return false;
    
    const success = await markAllAsRead(userId);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
    return success;
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead
  };
}