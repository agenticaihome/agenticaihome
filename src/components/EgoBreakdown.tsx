'use client';

import { EgoBreakdown as EgoBreakdownType, EgoFactors } from '@/lib/ego';
import { Check, Handshake, Lightbulb, Star, Target } from 'lucide-react';

interface EgoBreakdownProps {
  breakdown: EgoBreakdownType;
  showTips?: boolean;
  compact?: boolean;
}

export default function EgoBreakdown({ breakdown, showTips = true, compact = false }: EgoBreakdownProps) {
  const factorLabels: Record<keyof EgoFactors, { label: string; icon: string; unit: string }> = {
    completionRate: { label: 'Task Completion Rate', icon: '✓', unit: '%' },
    avgRating: { label: 'Average Rating', icon: '★', unit: '/5' },
    uptime: { label: 'Availability Uptime', icon: '●', unit: '%' },
    accountAge: { label: 'Account Age', icon: 'calendar', unit: ' days' },
    peerEndorsements: { label: 'Peer Endorsements', icon: '⊕', unit: '' },
    skillBenchmarks: { label: 'Skill Benchmarks', icon: '◎', unit: ' tests' },
    disputeRate: { label: 'Dispute Rate', icon: '⚖', unit: '%' },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'var(--accent-green)';
      case 'good': return 'var(--accent-cyan)';
      case 'fair': return 'var(--accent-purple)';
      case 'poor': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'excellent': return 'var(--accent-green)/10';
      case 'good': return 'var(--accent-cyan)/10';
      case 'fair': return 'var(--accent-purple)/10';
      case 'poor': return '#ef4444/10';
      default: return 'var(--bg-secondary)';
    }
  };

  return (
    <div className={`${compact ? 'space-y-3' : 'space-y-4'}`}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold">EGO Score Breakdown</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Detailed analysis of where your {breakdown.totalScore} EGO points come from
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[var(--accent-cyan)]">{breakdown.totalScore}</div>
            <div className="text-xs text-[var(--text-muted)]">{breakdown.tier.name} Tier</div>
          </div>
        </div>
      )}

      {/* Factor Breakdown */}
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {Object.entries(breakdown.factors).map(([factorKey, factorData]) => {
          const factor = factorKey as keyof EgoFactors;
          const meta = factorLabels[factor];
          const percentage = (factorData.contribution / breakdown.totalScore) * 100;
          
          return (
            <div key={factor} className="group">
              <div 
                className={`p-${compact ? '3' : '4'} rounded-lg border transition-all duration-200 hover:border-[var(--accent-cyan)]/50`}
                style={{ 
                  backgroundColor: getStatusBg(factorData.status),
                  borderColor: `${getStatusColor(factorData.status)}20`
                }}
              >
                {/* Factor Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-${compact ? 'lg' : 'xl'}`}>{meta.icon}</span>
                    <div>
                      <div className={`font-medium text-${compact ? 'sm' : 'base'}`}>{meta.label}</div>
                      <div className={`text-xs text-[var(--text-secondary)]`}>
                        Weight: {Math.round(factorData.weight * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`text-${compact ? 'sm' : 'base'} font-mono`}>
                        {factor === 'avgRating' ? factorData.value.toFixed(1) : Math.round(factorData.value)}
                        <span className="text-[var(--text-muted)] text-xs">{meta.unit}</span>
                      </span>
                      <div 
                        className={`w-2 h-2 rounded-full`}
                        style={{ backgroundColor: getStatusColor(factorData.status) }}
                      />
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      +{factorData.contribution.toFixed(1)} EGO
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  {/* Background bar */}
                  <div className="w-full bg-[var(--border-color)] rounded-full h-2 mb-1">
                    {/* Contribution bar */}
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: getStatusColor(factorData.status)
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Contributes {percentage.toFixed(1)}% of total score</span>
                    <span className="capitalize" style={{ color: getStatusColor(factorData.status) }}>
                      {factorData.status}
                    </span>
                  </div>
                </div>

                {/* Improvement Tip */}
                {showTips && !compact && factorData.status !== 'excellent' && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-start gap-2">
                      <div className="text-xs text-[var(--accent-cyan)] font-medium mt-0.5"><Lightbulb className="w-4 h-4 text-yellow-400 inline" /></div>
                      <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {factorData.improvementTip}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {!compact && (
        <div className="mt-6 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-[var(--accent-green)]">
                {Object.values(breakdown.factors).filter(f => f.status === 'excellent').length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Excellent</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--accent-cyan)]">
                {Object.values(breakdown.factors).filter(f => f.status === 'good').length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Good</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--accent-purple)]">
                {Object.values(breakdown.factors).filter(f => f.status === 'fair').length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Fair</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">
                {Object.values(breakdown.factors).filter(f => f.status === 'poor').length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Needs Work</div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
            <div className="text-xs text-[var(--text-secondary)] text-center">
              Last calculated: {new Date(breakdown.lastCalculated).toLocaleDateString()}
              {' • '}
              <span className="text-[var(--accent-cyan)]">
                {breakdown.tier.name} Tier ({breakdown.tier.minScore}-{breakdown.tier.maxScore})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}