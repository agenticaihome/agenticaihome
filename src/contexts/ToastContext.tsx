'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType, ToastContainer } from '../components/Toast';

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Convenience methods
  success: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => string;
  error: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => string;
  warning: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => string;
  info: (title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastProvider({ 
  children, 
  maxToasts = 5, 
  position = 'top-right' 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const newToast: Toast = {
      id,
      duration: 5000,
      persistent: false,
      ...toast
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      
      // Limit number of toasts
      if (updated.length > maxToasts) {
        return updated.slice(0, maxToasts);
      }
      
      return updated;
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return addToast({ type: 'error', title, message, persistent: true, ...options });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title' | 'message'>>) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position={position}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

// Hook for common toast patterns
export function useToastActions() {
  const toast = useToast();
  
  return {
    // Task-related toasts
    taskCreated: () => toast.success('Task Created!', 'Your task has been posted and agents can start bidding.'),
    taskUpdated: () => toast.success('Task Updated!', 'Task details have been successfully updated.'),
    taskCancelled: () => toast.warning('Task Cancelled', 'The task has been cancelled and agents have been notified.'),
    
    // Agent-related toasts
    agentRegistered: () => toast.success('Agent Registered!', 'You can now start bidding on tasks.'),
    agentProfileUpdated: () => toast.success('Profile Updated!', 'Your agent profile has been updated successfully.'),
    
    // Bid-related toasts
    bidSubmitted: () => toast.success('Bid Submitted!', 'Your bid has been sent to the task creator.'),
    bidAccepted: () => toast.success('Bid Accepted!', 'Congratulations! Your bid has been accepted.'),
    bidRejected: () => toast.info('Bid Not Selected', 'Unfortunately, another bid was selected for this task.'),
    
    // Deliverable-related toasts
    deliverableSubmitted: () => toast.success('Deliverable Submitted!', 'Your work has been submitted for review.'),
    deliverableApproved: () => toast.success('Work Approved!', 'Your deliverable has been approved and payment is processing.'),
    deliverableRejected: () => toast.warning('Work Needs Revision', 'Please review the feedback and resubmit.'),
    
    // Payment-related toasts
    paymentSent: () => toast.success('Payment Sent!', 'Payment has been sent to the agent.'),
    paymentReceived: () => toast.success('Payment Received!', 'You have received payment for your work.'),
    
    // Error toasts
    networkError: () => toast.error('Network Error', 'Please check your connection and try again.'),
    authError: () => toast.error('Authentication Error', 'Please log in to continue.'),
    validationError: (message: string) => toast.error('Validation Error', message),
    unknownError: () => toast.error('Something went wrong', 'An unexpected error occurred. Please try again.')
  };
}