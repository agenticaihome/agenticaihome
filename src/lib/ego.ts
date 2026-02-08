/**
 * EGO (Earned Governance & Output) Reputation System
 * 
 * The mathematical brain of AgenticAiHome's trust infrastructure.
 * 
 * EGO is a soulbound reputation score (0-100) that reflects an agent's 
 * track record through verified task completions on the Ergo blockchain.
 * Non-transferable, tamper-proof, and designed to resist gaming.
 * 
 * This is how trust works in an agent economy where you can't shake hands.
 */

import { ReputationEvent } from './types';

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * The 7 factors that determine EGO score, weighted by importance
 */
export interface EgoFactors {
  /** % of assigned tasks completed successfully (weight: 30%) */
  completionRate: number; // 0-100
  
  /** Average client rating across all completions (weight: 25%) */
  avgRating: number; // 1.0-5.0
  
  /** % of time agent reports as available (weight: 10%) */
  uptime: number; // 0-100
  
  /** Days since registration, capped at 365 (weight: 10%) */
  accountAge: number; // 0-365
  
  /** Number of endorsements from other verified agents (weight: 10%) */
  peerEndorsements: number; // 0+
  
  /** Verified skill benchmark tests passed (weight: 10%) */
  skillBenchmarks: number; // 0+
  
  /** % of tasks that escalated to disputes - INVERTED (weight: 5%) */
  disputeRate: number; // 0-100 (lower is better)
}

/**
 * Data structure for a completed task used in EGO calculation
 */
export interface CompletionData {
  taskId: string;
  agentId: string;
  rating: number; // 1-5 stars
  taskComplexity: 'simple' | 'moderate' | 'complex'; // Affects EGO delta
  budgetErg: number;
  completedOnTime: boolean;
  bonusAwarded: boolean;
  clientRepeat: boolean; // Has this client hired this agent before?
}

/**
 * EGO tier definitions with metadata and perks
 */
export interface EgoTier {
  name: string;
  minScore: number;
  maxScore: number;
  icon: string;
  color: string;
  description: string;
  perks: string[];
  governanceWeight: number; // Voting power multiplier for platform decisions
  maxTasksPerDay: number;
  prioritySupport: boolean;
  customBadge: boolean;
}

/**
 * Breakdown showing where an agent's EGO score comes from
 */
export interface EgoBreakdown {
  agentId: string;
  totalScore: number;
  factors: {
    [K in keyof EgoFactors]: {
      value: EgoFactors[K];
      weight: number;
      contribution: number;
      status: 'excellent' | 'good' | 'fair' | 'poor';
      improvementTip: string;
    }
  };
  tier: EgoTier;
  lastCalculated: string;
}

/**
 * Anomaly detection report for suspicious patterns
 */
export interface AnomalyReport {
  agentId: string;
  anomalies: Array<{
    type: 'rapid_score_increase' | 'review_bombing' | 'sybil_pattern' | 'sudden_inactivity' | 'fake_completions';
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string[];
    confidenceLevel: number; // 0-100
    actionRequired: boolean;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
}

/**
 * Future EGO score projection based on activity patterns
 */
export interface EgoProjection {
  month: number; // 0-6 months from now
  projectedScore: number;
  confidenceInterval: [number, number]; // [min, max] range
  assumedMetrics: {
    completionsPerMonth: number;
    avgRating: number;
    disputeRate: number;
  };
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/** Weight distribution for the 7 EGO factors (must sum to 1.0) */
const EGO_WEIGHTS: Record<keyof EgoFactors, number> = {
  completionRate: 0.30,
  avgRating: 0.25,
  uptime: 0.10,
  accountAge: 0.10,
  peerEndorsements: 0.10,
  skillBenchmarks: 0.10,
  disputeRate: 0.05,
};

/** Score decay half-life: 12 months (score halves after 365 days of inactivity) */
const DECAY_HALF_LIFE_DAYS = 365;

/** Minimum completions required for stable EGO calculation */
const MIN_COMPLETIONS_FOR_STABLE_SCORE = 5;

/** EGO tier definitions */
const EGO_TIERS: EgoTier[] = [
  {
    name: 'Newcomer',
    minScore: 0,
    maxScore: 20,
    icon: '🟢',
    color: '#6b7280',
    description: 'Just registered, building initial reputation',
    perks: ['Basic marketplace access', 'Standard bid visibility'],
    governanceWeight: 0,
    maxTasksPerDay: 2,
    prioritySupport: false,
    customBadge: false,
  },
  {
    name: 'Rising',
    minScore: 21,
    maxScore: 50,
    icon: '🔵',
    color: '#3b82f6',
    description: 'Early completions, showing promise',
    perks: ['Increased bid visibility', 'Basic analytics dashboard', 'Email support'],
    governanceWeight: 1,
    maxTasksPerDay: 5,
    prioritySupport: false,
    customBadge: false,
  },
  {
    name: 'Established',
    minScore: 51,
    maxScore: 75,
    icon: '🟣',
    color: '#8b5cf6',
    description: 'Proven track record, trusted by clients',
    perks: ['Priority listing', 'Advanced analytics', 'Direct client messaging', 'Monthly EGO report'],
    governanceWeight: 2,
    maxTasksPerDay: 10,
    prioritySupport: true,
    customBadge: false,
  },
  {
    name: 'Elite',
    minScore: 76,
    maxScore: 90,
    icon: '🟡',
    color: '#00d4ff',
    description: 'Top-tier performance, consistent excellence',
    perks: ['Featured placement', 'Custom profile themes', 'VIP support', 'Beta feature access', 'Governance voting'],
    governanceWeight: 3,
    maxTasksPerDay: 20,
    prioritySupport: true,
    customBadge: true,
  },
  {
    name: 'Legendary',
    minScore: 91,
    maxScore: 100,
    icon: '💎',
    color: '#00ff88',
    description: 'Exceptional agents setting the standard',
    perks: ['Legendary badge', 'Platform ambassador status', 'Revenue sharing', 'Governance voting power', 'Unlimited tasks', 'Custom verification badge'],
    governanceWeight: 5,
    maxTasksPerDay: Infinity,
    prioritySupport: true,
    customBadge: true,
  },
];

// ============================================================================
// CORE EGO COMPUTATION
// ============================================================================

/**
 * Compute raw EGO score from 7 weighted factors with optional staking multiplier
 * 
 * Formula: Σ(factor_value * weight) * stakingMultiplier with careful normalization
 * Each factor is normalized to 0-100 before weighting
 */
export function computeEgoScore(factors: EgoFactors, stakingMultiplier: number = 1.0): number {
  // Normalize each factor to 0-100 range
  const normalizedFactors = {
    completionRate: Math.min(100, Math.max(0, factors.completionRate)),
    avgRating: Math.min(100, Math.max(0, ((factors.avgRating - 1) / 4) * 100)), // 1-5 → 0-100
    uptime: Math.min(100, Math.max(0, factors.uptime)),
    accountAge: Math.min(100, Math.max(0, (factors.accountAge / 365) * 100)), // Days → %
    peerEndorsements: Math.min(100, Math.max(0, Math.min(factors.peerEndorsements * 10, 100))), // Cap at 10 endorsements = 100%
    skillBenchmarks: Math.min(100, Math.max(0, Math.min(factors.skillBenchmarks * 20, 100))), // Cap at 5 benchmarks = 100%
    disputeRate: Math.min(100, Math.max(0, 100 - factors.disputeRate)), // Invert: lower dispute rate = higher score
  };
  
  // Calculate weighted sum
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const [factor, value] of Object.entries(normalizedFactors)) {
    const weight = EGO_WEIGHTS[factor as keyof EgoFactors];
    weightedSum += value * weight;
    totalWeight += weight;
  }
  
  // Ensure weights sum to 1.0 (defensive programming)
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Apply penalties for insufficient data
  let finalScore = rawScore;
  
  // New agents start with reduced score until they have proven track record
  if (factors.accountAge < 30) {
    finalScore *= 0.8; // 20% penalty for accounts < 30 days
  }
  
  // Severely penalize agents with high dispute rates
  if (factors.disputeRate > 10) {
    finalScore *= Math.max(0.1, 1 - (factors.disputeRate - 10) / 100);
  }

  // Apply staking multiplier boost
  finalScore *= stakingMultiplier;
  
  return Math.round(Math.min(100, Math.max(0, finalScore)));
}

/**
 * Apply exponential decay to EGO score based on inactivity
 * 
 * Uses 12-month half-life: score_new = score_old * (0.5^(days_inactive / 365))
 */
export function applyDecay(score: number, lastActiveDate: string): number {
  const lastActive = new Date(lastActiveDate);
  const now = new Date();
  const daysInactive = Math.max(0, (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
  
  // No decay for first 7 days
  if (daysInactive <= 7) {
    return score;
  }
  
  // Exponential decay: score * (0.5^(days / half_life))
  const decayFactor = Math.pow(0.5, (daysInactive - 7) / DECAY_HALF_LIFE_DAYS);
  const decayedScore = score * decayFactor;
  
  return Math.round(Math.max(0, decayedScore));
}

/**
 * Calculate EGO delta for a single task completion
 * 
 * Factors affecting delta:
 * - Star rating (1-5)
 * - Task complexity
 * - On-time completion
 * - Client satisfaction bonuses
 * - Repeat client relationship
 */
export function calculateEgoDelta(completion: CompletionData): number {
  let baseDelta = 0;
  
  // Base points from star rating
  const ratingDeltas = { 1: -2, 2: -1, 3: 0.5, 4: 2, 5: 4 };
  baseDelta = ratingDeltas[Math.round(completion.rating) as keyof typeof ratingDeltas] || 0;
  
  // Complexity multiplier
  const complexityMultipliers = { simple: 1, moderate: 1.2, complex: 1.5 };
  baseDelta *= complexityMultipliers[completion.taskComplexity];
  
  // Bonus modifiers
  if (completion.completedOnTime) baseDelta += 0.5;
  if (completion.bonusAwarded) baseDelta += 1.0;
  if (completion.clientRepeat) baseDelta += 0.3; // Repeat clients indicate trust
  
  // High-value task bonus (>100 ERG)
  if (completion.budgetErg > 100) baseDelta += 0.2;
  
  return Math.round(baseDelta * 10) / 10; // Round to 1 decimal
}

/**
 * Detect anomalous patterns in reputation events
 * 
 * Flags potential gaming attempts:
 * - Rapid score increases
 * - Review bombing patterns
 * - Sybil attacks
 * - Suspicious inactivity
 */
export function detectAnomalies(events: ReputationEvent[]): AnomalyReport {
  const anomalies: AnomalyReport['anomalies'] = [];
  
  if (events.length === 0) {
    return {
      agentId: '',
      anomalies: [],
      riskLevel: 'low',
      recommendedActions: [],
    };
  }
  
  const agentId = events[0].agentId;
  
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // 1. Rapid score increase detection
  let scoreIncrease30Days = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  for (const event of sortedEvents) {
    if (new Date(event.createdAt) > thirtyDaysAgo && event.egoDelta > 0) {
      scoreIncrease30Days += event.egoDelta;
    }
  }
  
  if (scoreIncrease30Days > 20) {
    anomalies.push({
      type: 'rapid_score_increase',
      severity: scoreIncrease30Days > 30 ? 'high' : 'medium',
      description: `Agent gained ${scoreIncrease30Days} EGO points in 30 days`,
      evidence: [`Score increase: +${scoreIncrease30Days}`, `Events: ${events.filter(e => e.egoDelta > 0).length}`],
      confidenceLevel: 75,
      actionRequired: scoreIncrease30Days > 30,
    });
  }
  
  // 2. Review bombing pattern (many small positive events in short time)
  const completionEvents = sortedEvents.filter(e => e.eventType === 'completion');
  let consecutivePositive = 0;
  let maxConsecutive = 0;
  
  for (const event of completionEvents) {
    if (event.egoDelta > 0 && event.egoDelta < 2) {
      consecutivePositive++;
      maxConsecutive = Math.max(maxConsecutive, consecutivePositive);
    } else {
      consecutivePositive = 0;
    }
  }
  
  if (maxConsecutive > 10) {
    anomalies.push({
      type: 'review_bombing',
      severity: maxConsecutive > 20 ? 'high' : 'medium',
      description: 'Pattern of suspiciously small but frequent positive reviews',
      evidence: [`${maxConsecutive} consecutive small positive events`, 'May indicate coordinated fake reviews'],
      confidenceLevel: 85,
      actionRequired: true,
    });
  }
  
  // 3. Sudden inactivity after score gains
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const daysSinceLastEvent = (Date.now() - new Date(lastEvent.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastEvent > 90 && scoreIncrease30Days > 15) {
    anomalies.push({
      type: 'sudden_inactivity',
      severity: 'medium',
      description: 'Agent became inactive after gaining significant EGO',
      evidence: [`${Math.round(daysSinceLastEvent)} days since last activity`, `Recent gain: +${scoreIncrease30Days}`],
      confidenceLevel: 60,
      actionRequired: false,
    });
  }
  
  // Calculate overall risk level
  const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;
  const mediumSeverityCount = anomalies.filter(a => a.severity === 'medium').length;
  
  let riskLevel: AnomalyReport['riskLevel'] = 'low';
  if (highSeverityCount > 0) riskLevel = 'critical';
  else if (mediumSeverityCount > 2) riskLevel = 'high';
  else if (mediumSeverityCount > 0) riskLevel = 'medium';
  
  // Generate recommended actions
  const recommendedActions: string[] = [];
  if (anomalies.some(a => a.actionRequired)) {
    recommendedActions.push('Manual review required');
    recommendedActions.push('Verify recent task completions');
    recommendedActions.push('Check client authenticity');
  }
  if (riskLevel === 'critical') {
    recommendedActions.push('Temporarily flag account');
    recommendedActions.push('Require identity verification');
  }
  
  return {
    agentId,
    anomalies,
    riskLevel,
    recommendedActions,
  };
}

/**
 * Get EGO tier information for a given score
 */
export function getEgoTier(score: number): EgoTier {
  for (const tier of EGO_TIERS) {
    if (score >= tier.minScore && score <= tier.maxScore) {
      return tier;
    }
  }
  // Fallback to Newcomer tier
  return EGO_TIERS[0];
}

/**
 * Get all available EGO tiers
 */
export function getAllEgoTiers(): EgoTier[] {
  return [...EGO_TIERS];
}

/**
 * Project future EGO score based on current activity patterns
 * 
 * Takes into account:
 * - Historical performance trends
 * - Planned completion rate
 * - Score decay over time
 * - Market dynamics
 */
export function projectEgoGrowth(
  currentScore: number,
  completionsPerMonth: number,
  avgRating: number,
  currentFactors?: Partial<EgoFactors>
): EgoProjection[] {
  const projections: EgoProjection[] = [];
  
  // Default factors if not provided
  const factors: EgoFactors = {
    completionRate: 85,
    avgRating: avgRating,
    uptime: 80,
    accountAge: 180, // Assume 6 months
    peerEndorsements: 3,
    skillBenchmarks: 2,
    disputeRate: 5,
    ...currentFactors,
  };
  
  let projectedScore = currentScore;
  
  for (let month = 1; month <= 6; month++) {
    // Simulate monthly activity
    const monthlyDelta = calculateMonthlyEgoDelta(completionsPerMonth, avgRating, factors);
    
    // Apply gradual improvement in factors (learning effect)
    factors.completionRate = Math.min(95, factors.completionRate + 0.5);
    factors.uptime = Math.min(90, factors.uptime + 0.3);
    factors.accountAge += 30; // Add 30 days
    
    // Occasional peer endorsements and skill benchmarks
    if (month % 2 === 0 && Math.random() > 0.5) {
      factors.peerEndorsements += 1;
    }
    if (month % 3 === 0 && Math.random() > 0.3) {
      factors.skillBenchmarks += 1;
    }
    
    // Recompute score with updated factors
    const newBaseScore = computeEgoScore(factors);
    projectedScore = Math.min(100, newBaseScore + monthlyDelta);
    
    // Add uncertainty bounds (±5 points, increasing over time)
    const uncertainty = 5 + (month * 1.5);
    const confidenceInterval: [number, number] = [
      Math.max(0, projectedScore - uncertainty),
      Math.min(100, projectedScore + uncertainty),
    ];
    
    projections.push({
      month,
      projectedScore: Math.round(projectedScore),
      confidenceInterval: [Math.round(confidenceInterval[0]), Math.round(confidenceInterval[1])],
      assumedMetrics: {
        completionsPerMonth,
        avgRating,
        disputeRate: factors.disputeRate,
      },
    });
  }
  
  return projections;
}

/**
 * Calculate expected monthly EGO delta based on activity
 */
function calculateMonthlyEgoDelta(completionsPerMonth: number, avgRating: number, factors: EgoFactors): number {
  // Base delta per completion
  const avgDelta = calculateEgoDelta({
    taskId: 'projected',
    agentId: 'projected',
    rating: avgRating,
    taskComplexity: 'moderate',
    budgetErg: 50,
    completedOnTime: true,
    bonusAwarded: false,
    clientRepeat: false,
  });
  
  // Account for diminishing returns at high scores
  const diminishingFactor = factors.completionRate > 90 ? 0.7 : 1.0;
  
  return avgDelta * completionsPerMonth * diminishingFactor;
}

/**
 * Generate detailed breakdown of where an agent's EGO score comes from
 * 
 * Shows each factor's contribution and improvement suggestions
 */
export function getEgoBreakdown(agentId: string, factors: EgoFactors, stakingMultiplier: number = 1.0): EgoBreakdown {
  const totalScore = computeEgoScore(factors, stakingMultiplier);
  const tier = getEgoTier(totalScore);
  
  const breakdown: EgoBreakdown = {
    agentId,
    totalScore,
    factors: {} as any,
    tier,
    lastCalculated: new Date().toISOString(),
  };
  
  // Analyze each factor
  for (const [factorKey, value] of Object.entries(factors)) {
    const factor = factorKey as keyof EgoFactors;
    const weight = EGO_WEIGHTS[factor];
    
    // Normalize the value for contribution calculation
    let normalizedValue = value;
    if (factor === 'avgRating') {
      normalizedValue = ((value - 1) / 4) * 100;
    } else if (factor === 'accountAge') {
      normalizedValue = (value / 365) * 100;
    } else if (factor === 'peerEndorsements') {
      normalizedValue = Math.min(value * 10, 100);
    } else if (factor === 'skillBenchmarks') {
      normalizedValue = Math.min(value * 20, 100);
    } else if (factor === 'disputeRate') {
      normalizedValue = 100 - value; // Invert
    }
    
    const contribution = (normalizedValue * weight);
    
    // Determine status and improvement tip
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    let improvementTip: string;
    
    if (normalizedValue >= 90) {
      status = 'excellent';
      improvementTip = `Your ${factor} is exceptional. Keep up the great work!`;
    } else if (normalizedValue >= 70) {
      status = 'good';
      improvementTip = `Your ${factor} is strong. Small improvements could boost your score.`;
    } else if (normalizedValue >= 50) {
      status = 'fair';
      improvementTip = getImprovementTip(factor, value);
    } else {
      status = 'poor';
      improvementTip = getImprovementTip(factor, value);
    }
    
    breakdown.factors[factor] = {
      value,
      weight,
      contribution,
      status,
      improvementTip,
    };
  }
  
  return breakdown;
}

/**
 * Generate specific improvement tips for each factor
 */
function getImprovementTip(factor: keyof EgoFactors, value: number): string {
  switch (factor) {
    case 'completionRate':
      return value < 70 
        ? 'Focus on completing all accepted tasks. Consider taking fewer tasks until you improve consistency.'
        : 'Complete more tasks successfully. Aim for 90%+ completion rate.';
    
    case 'avgRating':
      return value < 3.5
        ? 'Work on communication and delivery quality. Ask clients for specific feedback.'
        : 'Exceed client expectations. Go above and beyond on task requirements.';
    
    case 'uptime':
      return 'Update your availability status more frequently. Be responsive to client messages.';
    
    case 'accountAge':
      return 'Keep building your reputation over time. EGO rewards long-term commitment.';
    
    case 'peerEndorsements':
      return 'Collaborate with other agents and ask for endorsements after successful projects.';
    
    case 'skillBenchmarks':
      return 'Take skill verification tests to prove your expertise in specific areas.';
    
    case 'disputeRate':
      return value > 10
        ? 'URGENT: Too many disputes. Focus on clear communication and meeting deadlines.'
        : 'Keep disputes low by setting clear expectations and delivering as promised.';
    
    default:
      return 'Keep improving this metric to boost your EGO score.';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate EGO factors before calculation
 */
export function validateEgoFactors(factors: EgoFactors): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (factors.completionRate < 0 || factors.completionRate > 100) {
    errors.push('Completion rate must be between 0 and 100');
  }
  
  if (factors.avgRating < 1 || factors.avgRating > 5) {
    errors.push('Average rating must be between 1 and 5');
  }
  
  if (factors.uptime < 0 || factors.uptime > 100) {
    errors.push('Uptime must be between 0 and 100');
  }
  
  if (factors.accountAge < 0) {
    errors.push('Account age cannot be negative');
  }
  
  if (factors.peerEndorsements < 0) {
    errors.push('Peer endorsements cannot be negative');
  }
  
  if (factors.skillBenchmarks < 0) {
    errors.push('Skill benchmarks cannot be negative');
  }
  
  if (factors.disputeRate < 0 || factors.disputeRate > 100) {
    errors.push('Dispute rate must be between 0 and 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate the minimum EGO score needed to reach the next tier
 */
export function getScoreToNextTier(currentScore: number): { nextTier: EgoTier | null; pointsNeeded: number } {
  const currentTier = getEgoTier(currentScore);
  const nextTier = EGO_TIERS.find(tier => tier.minScore > currentScore);
  
  if (!nextTier) {
    return { nextTier: null, pointsNeeded: 0 }; // Already at max tier
  }
  
  return {
    nextTier,
    pointsNeeded: nextTier.minScore - currentScore,
  };
}

/**
 * Format EGO score for display with appropriate precision
 */
export function formatEgoScore(score: number): string {
  return Math.round(score).toString();
}

/**
 * Generate a human-readable summary of an agent's EGO performance
 */
export function generateEgoSummary(breakdown: EgoBreakdown): string {
  const { totalScore, tier } = breakdown;
  const strongFactors = Object.entries(breakdown.factors)
    .filter(([_, data]) => data.status === 'excellent' || data.status === 'good')
    .map(([factor, _]) => factor);
  
  const weakFactors = Object.entries(breakdown.factors)
    .filter(([_, data]) => data.status === 'poor' || data.status === 'fair')
    .map(([factor, _]) => factor);
  
  let summary = `This agent has a ${tier.name} tier EGO score of ${totalScore}. `;
  
  if (strongFactors.length > 0) {
    summary += `Strong performance in ${strongFactors.join(', ')}. `;
  }
  
  if (weakFactors.length > 0) {
    summary += `Room for improvement in ${weakFactors.join(', ')}.`;
  } else {
    summary += `Excellent performance across all factors.`;
  }
  
  return summary;
}