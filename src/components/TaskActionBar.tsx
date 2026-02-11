'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import type { Task, Agent, Bid } from '@/lib/types';

interface TaskActionBarProps {
  task: Task;
  userAgents: Agent[];
  bids: Bid[];
  isCreator: boolean;
  isAssignedAgent: boolean;
  onPlaceBid?: () => void;
  onReviewBids?: () => void;
  onFundEscrow?: () => void;
  onSubmitWork?: () => void;
  onReviewWork?: () => void;
  onReleasePayment?: () => void;
  onRateAgent?: () => void;
  onRateCreator?: () => void;
  className?: string;
}

export default function TaskActionBar({
  task,
  userAgents,
  bids,
  isCreator,
  isAssignedAgent,
  onPlaceBid,
  onReviewBids,
  onFundEscrow,
  onSubmitWork,
  onReviewWork,
  onReleasePayment,
  onRateAgent,
  onRateCreator,
  className = ''
}: TaskActionBarProps) {
  const { userAddress, isAuthenticated } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper function to check if user has already bid
  const userHasBid = userAgents.some(agent => 
    bids.some(bid => bid.agentId === agent.id)
  );

  // Helper function to check escrow status
  const escrowStatus = task.metadata?.escrow_status || 'unfunded';
  const hasEscrowBox = !!task.metadata?.escrow_box_id;
  const isApprovedPendingRelease = escrowStatus === 'approved_pending_release';

  // Get primary action based on current state
  const getPrimaryAction = () => {
    if (!isAuthenticated || !userAddress) {
      return {
        text: 'Connect Wallet',
        icon: '🔗',
        action: () => {},
        variant: 'secondary',
        disabled: false,
      };
    }

    // For Task Creator
    if (isCreator) {
      switch (task.status) {
        case 'open':
          if (bids.length === 0) {
            return {
              text: 'Waiting for bids...',
              icon: '⏳',
              action: () => {},
              variant: 'disabled',
              disabled: true,
            };
          } else {
            return {
              text: `Review ${bids.length} Bid${bids.length > 1 ? 's' : ''}`,
              icon: '👀',
              action: onReviewBids || (() => {}),
              variant: 'primary',
              disabled: false,
            };
          }

        case 'in_progress':
          if (!hasEscrowBox) {
            return {
              text: 'Fund Escrow',
              icon: '💰',
              action: onFundEscrow || (() => {}),
              variant: 'primary-glow',
              disabled: false,
            };
          } else {
            return {
              text: 'Waiting for work submission...',
              icon: '⏳',
              action: () => {},
              variant: 'disabled',
              disabled: true,
            };
          }

        case 'review':
          if (isApprovedPendingRelease) {
            return {
              text: 'Release Payment',
              icon: '💸',
              action: onReleasePayment || (() => {}),
              variant: 'primary-glow',
              disabled: false,
            };
          } else {
            return {
              text: 'Review Work',
              icon: '📋',
              action: onReviewWork || (() => {}),
              variant: 'primary',
              disabled: false,
            };
          }

        case 'completed':
          // Check if already rated (this could be enhanced with actual rating data)
          return {
            text: 'Rate Agent',
            icon: '⭐',
            action: onRateAgent || (() => {}),
            variant: 'secondary',
            disabled: false,
          };

        case 'disputed':
          return {
            text: 'View Dispute',
            icon: '⚠️',
            action: () => {},
            variant: 'warning',
            disabled: false,
          };

        default:
          return {
            text: '✅ Task Complete',
            icon: '✅',
            action: () => {},
            variant: 'success',
            disabled: true,
          };
      }
    }

    // For Agents
    if (userAgents.length > 0) {
      switch (task.status) {
        case 'open':
          if (userHasBid) {
            return {
              text: 'Bid Submitted',
              icon: '✅',
              action: () => {},
              variant: 'success',
              disabled: true,
            };
          } else {
            return {
              text: 'Place Bid',
              icon: '🎯',
              action: onPlaceBid || (() => {}),
              variant: 'primary',
              disabled: false,
            };
          }

        case 'in_progress':
          if (isAssignedAgent) {
            if (!hasEscrowBox) {
              return {
                text: 'Waiting for escrow funding...',
                icon: '⏳',
                action: () => {},
                variant: 'disabled',
                disabled: true,
              };
            } else {
              return {
                text: 'Submit Work',
                icon: '📦',
                action: onSubmitWork || (() => {}),
                variant: 'primary-glow',
                disabled: false,
              };
            }
          } else {
            return {
              text: 'Not Selected',
              icon: '❌',
              action: () => {},
              variant: 'disabled',
              disabled: true,
            };
          }

        case 'review':
          if (isAssignedAgent) {
            return {
              text: 'Waiting for review...',
              icon: '⏳',
              action: () => {},
              variant: 'disabled',
              disabled: true,
            };
          } else {
            return {
              text: 'Not Selected',
              icon: '❌',
              action: () => {},
              variant: 'disabled',
              disabled: true,
            };
          }

        case 'completed':
          if (isAssignedAgent) {
            return {
              text: 'Rate Client',
              icon: '⭐',
              action: onRateCreator || (() => {}),
              variant: 'secondary',
              disabled: false,
            };
          } else {
            return {
              text: 'Task Complete',
              icon: '✅',
              action: () => {},
              variant: 'success',
              disabled: true,
            };
          }

        case 'disputed':
          if (isAssignedAgent) {
            return {
              text: 'View Dispute',
              icon: '⚠️',
              action: () => {},
              variant: 'warning',
              disabled: false,
            };
          } else {
            return {
              text: 'Disputed',
              icon: '⚠️',
              action: () => {},
              variant: 'warning',
              disabled: true,
            };
          }

        default:
          return {
            text: '✅ Task Complete',
            icon: '✅',
            action: () => {},
            variant: 'success',
            disabled: true,
          };
      }
    }

    // For users without agents
    return {
      text: 'Create Agent to Bid',
      icon: '🤖',
      action: () => window.location.href = '/agents',
      variant: 'secondary',
      disabled: false,
    };
  };

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg';
      case 'primary-glow':
        return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/25 animate-pulse';
      case 'secondary':
        return 'bg-[var(--bg-card-hover)] hover:bg-gray-600 text-white border border-gray-600';
      case 'success':
        return 'bg-green-600 text-white border border-green-500';
      case 'warning':
        return 'bg-red-600 hover:bg-red-700 text-white border border-red-500';
      case 'disabled':
        return 'bg-gray-800 text-[var(--text-secondary)] border border-gray-700 cursor-not-allowed';
      default:
        return 'bg-[var(--bg-card-hover)] hover:bg-gray-600 text-white border border-gray-600';
    }
  };

  const primaryAction = getPrimaryAction();

  const handleAction = async () => {
    if (primaryAction.disabled || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await primaryAction.action();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Status Info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            {isCreator ? 'Your Action Required' : isAssignedAgent ? 'Your Task Action' : 'Task Status'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            {primaryAction.disabled && primaryAction.variant === 'disabled' 
              ? primaryAction.text
              : `Ready to ${primaryAction.text.toLowerCase()}`
            }
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={handleAction}
          disabled={primaryAction.disabled || isProcessing}
          className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${getVariantStyles(primaryAction.variant)} ${primaryAction.disabled ? '' : 'transform hover:scale-105'}`}
        >
          <span className="text-lg">{primaryAction.icon}</span>
          {isProcessing ? 'Processing...' : primaryAction.text}
        </button>
      </div>

      {/* Additional Context */}
      {task.status === 'open' && isCreator && bids.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">
              {bids.length} bid{bids.length > 1 ? 's' : ''} received
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[var(--text-secondary)]">
                Best rate: <span className="text-emerald-400 font-semibold">
                  {Math.min(...bids.map(b => b.proposedRate))} ERG
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Escrow Status */}
      {hasEscrowBox && (
        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">🔒</span>
            <span className="text-[var(--text-secondary)]">
              Escrow: <span className={`font-semibold ${
                escrowStatus === 'funded' ? 'text-green-400' :
                escrowStatus === 'released' ? 'text-blue-400' :
                'text-yellow-400'
              }`}>
                {escrowStatus.replace('_', ' ')}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}