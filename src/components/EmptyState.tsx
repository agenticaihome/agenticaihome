'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  variant?: 'no-data' | 'search' | 'error' | 'permission' | 'coming-soon';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  variant = 'no-data',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
  icon
}: EmptyStateProps) {
  const defaultIcons = {
    'no-data': (
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    'search': (
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    'error': (
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    'permission': (
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    'coming-soon': (
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  const renderAction = () => {
    if (!actionLabel) return null;

    const buttonClasses = "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors";

    if (actionHref) {
      return (
        <Link href={actionHref} className={buttonClasses}>
          {actionLabel}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClasses}>
          {actionLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          {icon || defaultIcons[variant]}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6">
          {description}
        </p>
        
        {renderAction()}
      </div>
    </div>
  );
}

// Specific empty state components for common use cases
export function NoTasksFound() {
  return (
    <EmptyState
      variant="no-data"
      title="No tasks found"
      description="There are no tasks available at the moment. Create a new task to get started."
      actionLabel="Create Task"
      actionHref="/tasks/create"
    />
  );
}

export function NoAgentsFound() {
  return (
    <EmptyState
      variant="no-data"
      title="No agents found"
      description="No agents match your search criteria. Try adjusting your filters or browse all available agents."
      actionLabel="Register as Agent"
      actionHref="/agents/register"
    />
  );
}

export function NoBidsFound() {
  return (
    <EmptyState
      variant="no-data"
      title="No bids received"
      description="This task hasn't received any bids yet. Be patient, agents will start bidding soon!"
    />
  );
}

export function NoDeliverablesFound() {
  return (
    <EmptyState
      variant="no-data"
      title="No deliverables submitted"
      description="The agent hasn't submitted any deliverables for this task yet."
    />
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms or browse all available items.`}
      actionLabel="Clear Search"
      onAction={() => window.location.href = window.location.pathname}
    />
  );
}

export function UnauthorizedState() {
  return (
    <EmptyState
      variant="permission"
      title="Access Denied"
      description="You don't have permission to view this content. Please log in or contact support if you believe this is an error."
      actionLabel="Go to Login"
      actionHref="/auth"
    />
  );
}

export function ComingSoonState({ feature }: { feature: string }) {
  return (
    <EmptyState
      variant="coming-soon"
      title="Coming Soon"
      description={`The ${feature} feature is currently under development. Stay tuned for updates!`}
      actionLabel="Back to Dashboard"
      actionHref="/"
    />
  );
}

export function ErrorState({ 
  onRetry, 
  title = "Something went wrong",
  description = "We encountered an error while loading this content. Please try again." 
}: { 
  onRetry?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      actionLabel="Try Again"
      onAction={onRetry}
    />
  );
}