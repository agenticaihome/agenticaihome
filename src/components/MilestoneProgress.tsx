'use client';

import { useState } from 'react';
import { nanoErgToErg } from '@/lib/ergo/explorer';
import { txExplorerUrl } from '@/lib/ergo/constants';
import type { Milestone } from '@/lib/ergo/milestone-escrow';

interface MilestoneProgressProps {
  milestones: Milestone[];
  currentMilestone: number;
  totalAmountErg: number;
  completedMilestones?: {
    milestoneIndex: number;
    txId: string;
    releasedAmount: number;
    completedAt: string;
  }[];
}

interface MilestoneDetailModalProps {
  milestone: Milestone;
  milestoneIndex: number;
  status: 'completed' | 'current' | 'upcoming';
  completedInfo?: {
    txId: string;
    releasedAmount: number;
    completedAt: string;
  };
  onClose: () => void;
}

function MilestoneDetailModal({ milestone, milestoneIndex, status, completedInfo, onClose }: MilestoneDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {status === 'completed' && <span className="text-[var(--accent-emerald)]">✓</span>}
            {status === 'current' && <span className="text-[var(--accent-cyan)]">⏳</span>}
            {status === 'upcoming' && <span className="text-[var(--text-muted)]">○</span>}
            Milestone {milestoneIndex + 1}
          </h3>
          <button 
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-white">{milestone.name}</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{milestone.description}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Payment Percentage:</span>
            <span className="text-[var(--accent-cyan)] font-medium">{milestone.percentage}%</span>
          </div>

          {milestone.deliverables && milestone.deliverables.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Deliverables:</h5>
              <ul className="space-y-1">
                {milestone.deliverables.map((deliverable, index) => (
                  <li key={index} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                    <span className="text-[var(--accent-cyan)] mt-1">•</span>
                    {deliverable}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {completedInfo && (
            <div className="mt-4 p-3 bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/20 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--accent-emerald)] font-medium">Completed</span>
                <span className="text-[var(--text-secondary)]">{new Date(completedInfo.completedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--text-secondary)]">Released Amount:</span>
                <span className="text-white font-medium">{completedInfo.releasedAmount} ERG</span>
              </div>
              <a 
                href={txExplorerUrl(completedInfo.txId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent-cyan)] hover:underline"
              >
                View Transaction →
              </a>
            </div>
          )}

          {status === 'current' && (
            <div className="mt-4 p-3 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 rounded-lg">
              <p className="text-sm text-[var(--accent-cyan)] font-medium">Current Milestone</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Ready for approval once work is completed</p>
            </div>
          )}

          {status === 'upcoming' && (
            <div className="mt-4 p-3 bg-[var(--bg-card-hover)]/30 border border-gray-600/20 rounded-lg">
              <p className="text-sm text-[var(--text-secondary)] font-medium">Upcoming Milestone</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Will be available after previous milestones are completed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MilestoneProgress({ 
  milestones, 
  currentMilestone, 
  totalAmountErg,
  completedMilestones = []
}: MilestoneProgressProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

  const getMilestoneStatus = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentMilestone) return 'completed';
    if (index === currentMilestone) return 'current';
    return 'upcoming';
  };

  const getCompletedInfo = (index: number) => {
    return completedMilestones.find(cm => cm.milestoneIndex === index);
  };

  const totalCompleted = completedMilestones.reduce((sum, cm) => sum + cm.releasedAmount, 0);
  const totalReleased = (currentMilestone / milestones.length) * 100;

  return (
    <>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Milestone Progress</h3>
          <div className="text-right">
            <div className="text-sm text-[var(--text-secondary)]">Released: {totalCompleted.toFixed(3)} / {totalAmountErg} ERG</div>
            <div className="text-xs text-[var(--text-muted)]">{milestones.length} milestones total</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Overall Progress</span>
            <span className="text-[var(--accent-cyan)]">{Math.round(totalReleased)}%</span>
          </div>
          <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-2">
            <div 
              className="bg-[var(--accent-cyan)] h-2 rounded-full transition-all duration-500"
              style={{ width: `${totalReleased}%` }}
            />
          </div>
        </div>

        {/* Milestone Steps */}
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const status = getMilestoneStatus(index);
            const completedInfo = getCompletedInfo(index);
            const milestoneAmount = (totalAmountErg * milestone.percentage) / 100;

            return (
              <div 
                key={index}
                className={`
                  flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all
                  ${status === 'completed' 
                    ? 'bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/20 hover:bg-[var(--accent-emerald)]/15' 
                    : status === 'current'
                    ? 'bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)]/15'
                    : 'bg-[var(--bg-card)]/20 border border-gray-600/20 hover:bg-[var(--bg-card-hover)]/30'
                  }
                `}
                onClick={() => setSelectedMilestone(index)}
              >
                {/* Status Icon */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${status === 'completed'
                    ? 'bg-[var(--accent-emerald)] text-[var(--bg-primary)]'
                    : status === 'current'
                    ? 'bg-[var(--accent-cyan)] text-[var(--bg-primary)]'
                    : 'bg-gray-600 text-[var(--text-secondary)]'
                  }
                `}>
                  {status === 'completed' ? '✓' : index + 1}
                </div>

                {/* Milestone Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium truncate ${
                      status === 'upcoming' ? 'text-[var(--text-secondary)]' : 'text-white'
                    }`}>
                      {milestone.name}
                    </h4>
                    <div className="text-sm text-right ml-4">
                      <div className={`font-medium ${
                        status === 'completed' ? 'text-[var(--accent-emerald)]' :
                        status === 'current' ? 'text-[var(--accent-cyan)]' :
                        'text-[var(--text-secondary)]'
                      }`}>
                        {milestone.percentage}%
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {milestoneAmount.toFixed(3)} ERG
                      </div>
                    </div>
                  </div>
                  
                  <p className={`text-sm mt-1 truncate ${
                    status === 'upcoming' ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'
                  }`}>
                    {milestone.description}
                  </p>

                  {/* Completion Info */}
                  {completedInfo && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-[var(--accent-emerald)]">
                        Released {completedInfo.releasedAmount} ERG
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(completedInfo.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="text-[var(--text-secondary)]">
                  →
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-[var(--accent-emerald)]">
              {completedMilestones.length}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Completed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--accent-cyan)]">
              {currentMilestone < milestones.length ? 1 : 0}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Current</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-[var(--text-secondary)]">
              {milestones.length - currentMilestone - (currentMilestone < milestones.length ? 1 : 0)}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">Remaining</div>
          </div>
        </div>
      </div>

      {/* Milestone Detail Modal */}
      {selectedMilestone !== null && (
        <MilestoneDetailModal
          milestone={milestones[selectedMilestone]}
          milestoneIndex={selectedMilestone}
          status={getMilestoneStatus(selectedMilestone)}
          completedInfo={getCompletedInfo(selectedMilestone)}
          onClose={() => setSelectedMilestone(null)}
        />
      )}
    </>
  );
}