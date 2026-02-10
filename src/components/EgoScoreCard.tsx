'use client';

import { useState, useEffect, useMemo } from 'react';
import { Agent } from '@/lib/types';
import { 
  getEgoTier, 
  getScoreToNextTier, 
  getEgoBreakdown, 
  computeEgoScore, 
  type EgoFactors, 
  type EgoBreakdown as EgoBreakdownType 
} from '@/lib/ego';
import { getAgentEgoFactors } from '@/lib/supabaseStore';

interface EgoScoreCardProps {
  agent: Agent;
  showFullBreakdown?: boolean;
  animated?: boolean;
  className?: string;
}

export default function EgoScoreCard({ 
  agent, 
  showFullBreakdown = true, 
  animated = true,
  className = ''
}: EgoScoreCardProps) {
  const [factors, setFactors] = useState<EgoFactors | null>(null);
  const [breakdown, setBreakdown] = useState<EgoBreakdownType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Safely handle invalid ego scores
  const safeEgoScore = useMemo(() => {
    const score = agent?.egoScore;
    if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 100) {
      console.warn('Invalid ego score detected, using default:', score);
      return 50; // Safe default for new agents
    }
    return Math.round(score);
  }, [agent?.egoScore]);
  
  const [displayScore, setDisplayScore] = useState(safeEgoScore);

  const tier = getEgoTier(safeEgoScore);
  const { nextTier, pointsNeeded } = getScoreToNextTier(safeEgoScore);

  // Load agent's current EGO factors
  useEffect(() => {
    const loadFactors = async () => {
      try {
        // Validate agent data
        if (!agent?.id) {
          console.warn('Invalid agent data for EGO factors loading');
          setLoading(false);
          return;
        }

        const agentFactors = await getAgentEgoFactors(agent.id);
        if (agentFactors) {
          setFactors(agentFactors);
          try {
            const egoBreakdown = getEgoBreakdown(agent.id, agentFactors);
            setBreakdown(egoBreakdown);
          } catch (breakdownError) {
            console.error('Failed to calculate EGO breakdown:', breakdownError);
            // Continue without breakdown if calculation fails
          }
        } else {
          console.warn(`No EGO factors found for agent ${agent.id}, using defaults`);
          // Provide safe default factors for new agents
          const defaultFactors: EgoFactors = {
            completionRate: 100,
            avgRating: 3.0,
            uptime: 80,
            accountAge: 0,
            peerEndorsements: 0,
            skillBenchmarks: 0,
            disputeRate: 0,
          };
          setFactors(defaultFactors);
          try {
            const defaultBreakdown = getEgoBreakdown(agent.id, defaultFactors);
            setBreakdown(defaultBreakdown);
          } catch (error) {
            console.error('Failed to create default breakdown:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load EGO factors:', error);
        setError(error instanceof Error ? error.message : 'Unknown error loading EGO factors');
        // Provide fallback factors to prevent component crash
        const fallbackFactors: EgoFactors = {
          completionRate: 100,
          avgRating: 3.0,
          uptime: 80,
          accountAge: 0,
          peerEndorsements: 0,
          skillBenchmarks: 0,
          disputeRate: 0,
        };
        setFactors(fallbackFactors);
      } finally {
        setLoading(false);
      }
    };

    loadFactors();
  }, [agent.id]);

  // Animate score changes
  useEffect(() => {
    if (!animated) return;

    let startTime: number;
    const startScore = displayScore;
    const endScore = safeEgoScore;
    const duration = 1500; // 1.5 seconds

    if (startScore === endScore) return;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentScore = startScore + (endScore - startScore) * easeOutQuart;
      const roundedScore = Math.round(currentScore);
      
      // Ensure the score stays within valid bounds
      setDisplayScore(Math.min(100, Math.max(0, roundedScore)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [safeEgoScore, animated, displayScore]);

  const progressPct = Math.min(displayScore, 100);
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  // Progress to next tier
  const tierProgressPct = nextTier 
    ? ((displayScore - tier.minScore) / (nextTier.minScore - tier.minScore)) * 100 
    : 100;

  const getFactorStatus = (value: number, factor: keyof EgoFactors) => {
    if (factor === 'avgRating') {
      if (value >= 4.5) return 'excellent';
      if (value >= 4.0) return 'good';
      if (value >= 3.5) return 'fair';
      return 'poor';
    }
    if (factor === 'disputeRate') {
      if (value <= 2) return 'excellent';
      if (value <= 5) return 'good';
      if (value <= 10) return 'fair';
      return 'poor';
    }
    if (value >= 90) return 'excellent';
    if (value >= 70) return 'good';
    if (value >= 50) return 'fair';
    return 'poor';
  };

  const getFactorColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'var(--accent-green)';
      case 'good': return 'var(--accent-cyan)';
      case 'fair': return 'var(--accent-amber)';
      case 'poor': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const factorLabels: Record<keyof EgoFactors, string> = {
    completionRate: 'Completion Rate',
    avgRating: 'Avg Rating',
    uptime: 'Uptime',
    accountAge: 'Account Age',
    peerEndorsements: 'Endorsements',
    skillBenchmarks: 'Skill Tests',
    disputeRate: 'Dispute Rate'
  };

  const formatFactorValue = (factor: keyof EgoFactors, value: number) => {
    switch (factor) {
      case 'completionRate':
      case 'uptime':
        return `${Math.round(value)}%`;
      case 'avgRating':
        return `${value.toFixed(1)}/5.0`;
      case 'accountAge':
        return `${Math.round(value)} days`;
      case 'disputeRate':
        return `${value.toFixed(1)}%`;
      default:
        return Math.round(value).toString();
    }
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Score Display */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {/* Animated circular progress */}
            <svg width="140" height="140" viewBox="0 0 140 140" className="transform hover:scale-105 transition-transform duration-300">
              {/* Background circle */}
              <circle cx="70" cy="70" r="45" fill="none" stroke="var(--border-color)" strokeWidth="6" />
              
              {/* Progress circle */}
              <circle 
                cx="70" 
                cy="70" 
                r="45" 
                fill="none" 
                stroke={tier.color} 
                strokeWidth="6"
                strokeLinecap="round" 
                strokeDasharray={circumference} 
                strokeDashoffset={dashOffset}
                transform="rotate(-90 70 70)"
                style={{ 
                  transition: 'stroke-dashoffset 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  filter: `drop-shadow(0 0 12px ${tier.color}60)`
                }} 
              />
              
              {/* Glow effect for high scores */}
              {displayScore >= 76 && (
                <circle 
                  cx="70" 
                  cy="70" 
                  r="45" 
                  fill="none" 
                  stroke={tier.color} 
                  strokeWidth="3"
                  strokeLinecap="round" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 70 70)"
                  opacity="0.4"
                  style={{ 
                    transition: 'stroke-dashoffset 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    filter: 'blur(3px)'
                  }} 
                />
              )}
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="font-bold text-4xl mb-1 transition-all duration-500"
                style={{ 
                  color: tier.color,
                  textShadow: displayScore >= 76 ? `0 0 15px ${tier.color}60` : 'none'
                }}
              >
                {displayScore}
              </span>
              <span className="text-[var(--text-muted)] text-sm uppercase tracking-wider">EGO</span>
            </div>
            
            {/* Special effects for high tiers */}
            {displayScore >= 91 && (
              <>
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
                  💎
                </div>
                <div 
                  className="absolute inset-0 rounded-full opacity-20"
                  style={{
                    background: `conic-gradient(from 0deg, ${tier.color}00, ${tier.color}ff, ${tier.color}00)`,
                    animation: 'spin 6s linear infinite'
                  }}
                />
              </>
            )}
            
            {displayScore >= 76 && displayScore < 91 && (
              <div className="absolute -top-1 -right-1 text-xl">⭐</div>
            )}
          </div>

          {/* Tier Badge */}
          <div className="text-center mb-4">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-300 hover:scale-105"
              style={{ 
                borderColor: tier.color, 
                color: tier.color,
                backgroundColor: `${tier.color}15`
              }}
            >
              <span className="text-lg">{tier.icon}</span>
              <span>{tier.name} Tier</span>
            </div>
            
            <p className="text-[var(--text-muted)] text-xs mt-2 max-w-xs">
              {tier.description}
            </p>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="w-full max-w-xs">
              <div className="text-xs text-[var(--text-muted)] mb-2 text-center">
                {pointsNeeded} points to {nextTier.name}
              </div>
              <div className="w-full bg-[var(--border-color)] rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${Math.min(tierProgressPct, 100)}%`,
                    backgroundColor: nextTier.color 
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Factor Breakdown */}
        {showFullBreakdown && (
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span>
              Score Breakdown
            </h3>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-[var(--border-color)] rounded mb-2"></div>
                    <div className="h-6 bg-[var(--border-color)] rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-400 mb-2">⚠️ Failed to load score breakdown</div>
                <div className="text-xs text-[var(--text-muted)]">{error}</div>
              </div>
            ) : !factors ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <div className="mb-2">📊 No detailed breakdown available</div>
                <div className="text-xs">Score based on basic metrics</div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(factors).map(([factorKey, value]) => {
                  const factor = factorKey as keyof EgoFactors;
                  const status = getFactorStatus(value, factor);
                  const color = getFactorColor(status);
                  const weight = breakdown?.factors[factor]?.weight || 0.15; // Safe default weight
                  const contribution = breakdown?.factors[factor]?.contribution || 0;
                  
                  let normalizedValue = value;
                  if (factor === 'avgRating') {
                    normalizedValue = ((value - 1) / 4) * 100;
                  } else if (factor === 'accountAge') {
                    normalizedValue = Math.min((value / 365) * 100, 100);
                  } else if (factor === 'peerEndorsements') {
                    normalizedValue = Math.min(value * 10, 100);
                  } else if (factor === 'skillBenchmarks') {
                    normalizedValue = Math.min(value * 20, 100);
                  } else if (factor === 'disputeRate') {
                    normalizedValue = Math.max(0, 100 - value);
                  }

                  return (
                    <div key={factor} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">{factorLabels[factor]}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span style={{ color }}>{formatFactorValue(factor, value)}</span>
                          <span className="text-[var(--text-muted)]">({Math.round(weight * 100)}%)</span>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="w-full bg-[var(--border-color)] rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out relative"
                            style={{ 
                              width: `${Math.min(normalizedValue, 100)}%`,
                              backgroundColor: color
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-pulse" />
                          </div>
                        </div>
                        
                        {/* Contribution to total score */}
                        <div className="absolute right-0 top-4 text-xs text-[var(--text-muted)]">
                          +{contribution.toFixed(1)} points
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tier Perks */}
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                Tier Perks
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tier.perks.slice(0, 4).map((perk, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--surface-secondary)]"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: tier.color }}
                    />
                    <span>{perk}</span>
                  </div>
                ))}
                {tier.perks.length > 4 && (
                  <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--border-color)]" />
                    <span>+{tier.perks.length - 4} more perks</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}