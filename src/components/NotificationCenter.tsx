'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, PartyPopper, X } from 'lucide-react';
import { useNotifications, getNotificationStyle, type Notification } from '@/lib/notifications';
import { useWallet } from '@/contexts/WalletContext';

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const { userAddress } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications(userAddress || undefined);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.read;
    }
    return true;
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      window.location.href = notification.link;
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

    const displayFiltered = filteredNotifications;

  if (!userAddress) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-card)] rounded-lg transition-all group"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-[var(--accent-red)] text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-[var(--accent-red)] text-white text-xs rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 text-xs text-[var(--accent-cyan)] hover:text-[var(--accent-cyan-bright)] transition-colors px-2 py-1 rounded hover:bg-[var(--accent-cyan)]/10"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/20">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full mx-auto"></div>
                <p className="text-[var(--text-secondary)] text-sm mt-2">Loading notifications...</p>
              </div>
            ) : displayFiltered.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)] text-sm">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[var(--text-tertiary)] text-xs mt-1">
                  {filter === 'unread' 
                    ? 'All caught up! <PartyPopper className="w-4 h-4 text-yellow-400 inline" />' 
                    : 'You\'ll see updates about your tasks and agents here'
                  }
                </p>
              </div>
            ) : (
              <div className="py-1">
                {displayFiltered.map((notification) => {
                  const style = getNotificationStyle(notification.type);
                  const isNew = !notification.read;
                  
                  return (
                    <div
                      key={notification.id}
                      className={`relative px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer border-l-2 group ${
                        isNew 
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/3' 
                          : 'border-transparent hover:border-[var(--border-color)]'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${style.bgColor} flex items-center justify-center text-sm flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105`}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`font-medium text-sm ${isNew ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                              {notification.title}
                              {isNew && <span className="ml-1 w-2 h-2 bg-[var(--accent-cyan)] rounded-full inline-block" />}
                            </h4>
                            {notification.link && (
                              <ExternalLink className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                          <p className="text-[var(--text-tertiary)] text-xs mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[var(--text-tertiary)] text-xs">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                            {isNew && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan-bright)] text-xs p-1 rounded hover:bg-[var(--accent-cyan)]/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {displayFiltered.length > 0 && (
            <div className="border-t border-[var(--border-color)] p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs transition-colors"
                >
                  Close
                </button>
                <a
                  href="/dashboard"
                  className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan-bright)] text-sm font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  View dashboard →
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}