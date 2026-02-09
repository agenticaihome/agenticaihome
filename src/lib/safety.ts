/**
 * AUTONOMOUS TRUST & SAFETY SYSTEM
 * 
 * Fort Knox for the AgenticAI Economy
 * Protects users' money autonomously without human intervention
 * 
 * This system is designed to be:
 * - Autonomous: Runs without human oversight
 * - Comprehensive: Covers all attack vectors
 * - Scalable: Can handle millions of transactions
 * - Transparent: All actions are auditable
 * - Secure: Multiple layers of protection
 */

import { 
  Agent, 
  Task, 
  Completion, 
  RiskAssessment,
  AnomalyReport,
  VelocityCheck,
  ProbationStatus,
  AutoResponse,
  DisputeProcess,
  ArbitrationResult,
  PlatformHealthReport,
  SafetyAuditReport
} from './types';
import { 
  getAgents, 
  updateAgent, 
  getTasks, 
  getCompletions, 
  getCompletionsForAgent,
  getAgentById,
  getTaskById
} from './supabaseStore';

// ====================================
// CONSTANTS & CONFIGURATION
// ====================================

export const TIER_LIMITS = {
  newcomer: 10,      // 10 ERG max
  rising: 50,        // 50 ERG max
  established: 200,  // 200 ERG max
  elite: 1000,       // 1,000 ERG max
  legendary: Infinity // Unlimited
} as const;

export const PROBATION_CONFIG = {
  REQUIRED_TASKS: 5,
  MIN_RATING: 3.5,
  MAX_TASK_VALUE: 10,
  ESCROW_HOLD_HOURS: 72
} as const;

export const VELOCITY_CONFIG = {
  MAX_TASKS_PER_HOUR: 3,
  WINDOW_SIZE_HOURS: 1
} as const;

export const ANOMALY_THRESHOLDS = {
  CRITICAL: 0.7,     // Auto-suspend
  HIGH: 0.5,         // Flag and monitor
  MEDIUM: 0.3        // Internal monitoring only
} as const;

export const PLATFORM_THRESHOLDS = {
  DISPUTE_RATE_WARNING: 0.05,      // 5% dispute rate
  COMPLETION_RATE_WARNING: 0.80,   // 80% completion rate
  CHURN_RATE_WARNING: 0.50,        // 50% new agent churn
  INACTIVITY_DAYS: 90              // 90 days dormant
} as const;

// ====================================
// TIER MANAGEMENT
// ====================================

/**
 * Calculate agent tier based on EGO score and performance
 */
export function calculateAgentTier(agent: Agent): Agent['tier'] {
  const { egoScore, tasksCompleted, rating } = agent;
  const disputesWon = agent.disputesWon ?? 0;
  const disputesLost = agent.disputesLost ?? 0;
  
  // Must complete probation first
  if (!agent.probationCompleted) {
    return 'newcomer';
  }
  
  // Calculate dispute ratio
  const totalDisputes = disputesWon + disputesLost;
  const disputeWinRate = totalDisputes > 0 ? disputesWon / totalDisputes : 1;
  
  // Tier calculation logic
  if (egoScore >= 900 && tasksCompleted >= 100 && rating >= 4.8 && disputeWinRate >= 0.9) {
    return 'legendary';
  }
  if (egoScore >= 700 && tasksCompleted >= 50 && rating >= 4.5 && disputeWinRate >= 0.8) {
    return 'elite';
  }
  if (egoScore >= 400 && tasksCompleted >= 20 && rating >= 4.0 && disputeWinRate >= 0.7) {
    return 'established';
  }
  if (egoScore >= 200 && tasksCompleted >= 5 && rating >= 3.5) {
    return 'rising';
  }
  
  return 'newcomer';
}

/**
 * Get maximum task value an agent can handle based on their tier
 */
export function getMaxTaskValue(tier: Agent['tier']): number {
  if (!tier) return TIER_LIMITS.newcomer;
  return TIER_LIMITS[tier];
}

// ====================================
// PROBATION SYSTEM
// ====================================

/**
 * Get current probation status for an agent
 */
export async function getProbationStatus(agentId: string): ProbationStatus {
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const completions = await getCompletionsForAgent(agentId);
  const averageRating = completions.length > 0 
    ? completions.reduce((sum, c) => sum + c.rating, 0) / completions.length 
    : 0;

  const isInProbation = !agent.probationCompleted;
  const tasksCompleted = agent.tasksCompleted;
  const tasksRemaining = Math.max(0, PROBATION_CONFIG.REQUIRED_TASKS - tasksCompleted);
  const eligibleForGraduation = tasksCompleted >= PROBATION_CONFIG.REQUIRED_TASKS && 
                                averageRating >= PROBATION_CONFIG.MIN_RATING;

  return {
    agentId,
    isInProbation,
    tasksCompleted,
    tasksRemaining,
    averageRating,
    eligibleForGraduation,
    restrictions: {
      maxTaskValue: PROBATION_CONFIG.MAX_TASK_VALUE,
      escrowHoldPeriod: PROBATION_CONFIG.ESCROW_HOLD_HOURS,
      canBidOnPremium: false
    }
  };
}

/**
 * Graduate agent from probation if eligible
 */
export async function graduateFromProbation(agentId: string): boolean {
  const probationStatus = await getProbationStatus(agentId);
  
  if (probationStatus.eligibleForGraduation) {
    const agent = await getAgentById(agentId);
    if (agent) {
      const newTier = calculateAgentTier({ ...agent, probationCompleted: true });
      await updateAgent(agentId, {
        probationCompleted: true,
        probationTasksRemaining: 0,
        tier: newTier,
        maxTaskValue: getMaxTaskValue(newTier)
      });
      return true;
    }
  }
  
  return false;
}

// ====================================
// VELOCITY CHECKING
// ====================================

/**
 * Check if agent is exceeding velocity limits (anti-drain protection)
 */
export async function checkVelocityLimits(agentId: string): VelocityCheck {
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const now = new Date();
  const velocityWindow = agent.velocityWindow ?? { count: 0, windowStart: now.toISOString() };
  const windowStart = new Date(velocityWindow.windowStart);
  const hoursSinceWindowStart = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

  // Reset window if it's been more than an hour
  if (hoursSinceWindowStart >= VELOCITY_CONFIG.WINDOW_SIZE_HOURS) {
    const newWindow = { count: 0, windowStart: now.toISOString() };
    await updateAgent(agentId, { velocityWindow: newWindow });
    
    return {
      agentId,
      currentHourCount: 0,
      maxAllowed: VELOCITY_CONFIG.MAX_TASKS_PER_HOUR,
      windowStart: now.toISOString(),
      exceeds: false,
      timeUntilReset: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    };
  }

  const exceeds = velocityWindow.count >= VELOCITY_CONFIG.MAX_TASKS_PER_HOUR;
  const nextReset = new Date(windowStart.getTime() + 60 * 60 * 1000);

  return {
    agentId,
    currentHourCount: velocityWindow.count,
    maxAllowed: VELOCITY_CONFIG.MAX_TASKS_PER_HOUR,
    windowStart: velocityWindow.windowStart,
    exceeds,
    timeUntilReset: nextReset.toISOString()
  };
}

/**
 * Increment velocity counter when agent accepts a task
 */
export async function incrementVelocityCounter(agentId: string): void {
  const agent = await getAgentById(agentId);
  if (!agent) return;

  const velocityCheck = await checkVelocityLimits(agentId);
  
  if (!velocityCheck.exceeds) {
    const velocityWindow = agent.velocityWindow ?? { count: 0, windowStart: new Date().toISOString() };
    await updateAgent(agentId, {
      velocityWindow: {
        count: velocityWindow.count + 1,
        windowStart: velocityWindow.windowStart
      }
    });
  }
}

// ====================================
// ANOMALY DETECTION
// ====================================

/**
 * Detect rating manipulation patterns
 */
export async function detectRatingManipulation(agentId: string): AnomalyReport | null {
  const completions = await getCompletionsForAgent(agentId);
  
  // Check for same reviewer giving 5-star ratings repeatedly
  const reviewerCounts = new Map<string, { total: number; fiveStars: number }>();
  
  completions.forEach(completion => {
    const reviewerId = completion.reviewerId ?? 'unknown';
    const current = reviewerCounts.get(reviewerId) || { total: 0, fiveStars: 0 };
    current.total++;
    if (completion.rating === 5) {
      current.fiveStars++;
    }
    reviewerCounts.set(reviewerId, current);
  });

  // Flag if any reviewer gave more than 3 five-star ratings
  for (const [reviewerId, counts] of reviewerCounts) {
    if (counts.fiveStars > 3 && counts.fiveStars === counts.total) {
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        anomalyType: 'rating_manipulation',
        severity: 'medium',
        score: Math.min(counts.fiveStars / 10, 1), // Scale based on count
        evidence: {
          reviewerId,
          fiveStarCount: counts.fiveStars,
          totalReviews: counts.total,
          pattern: 'repeated_five_stars'
        },
        detectedAt: new Date().toISOString(),
        resolved: false
      };
    }
  }

  return null;
}

/**
 * Detect velocity anomalies (suspicious rapid completion patterns)
 */
export async function detectVelocityAnomaly(agentId: string): AnomalyReport | null {
  const completions = await getCompletionsForAgent(agentId);
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentCompletions = completions.filter(
    c => new Date(c.completedAt) >= last24Hours
  ).length;

  // Flag if agent went from 0 to 20+ completions in 24 hours
  const agent = await getAgentById(agentId);
  if (agent && recentCompletions >= 20 && agent.tasksCompleted === recentCompletions) {
    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      anomalyType: 'velocity_anomaly',
      severity: 'high',
      score: Math.min(recentCompletions / 50, 1),
      evidence: {
        completionsIn24h: recentCompletions,
        totalCompletions: agent.tasksCompleted,
        accountAge: agent.createdAt,
        pattern: 'zero_to_many_rapid'
      },
      detectedAt: new Date().toISOString(),
      resolved: false
    };
  }

  return null;
}

/**
 * Detect review bombing (multiple 1-star reviews in short time)
 */
export async function detectReviewBombing(agentId: string): AnomalyReport | null {
  const completions = await getCompletionsForAgent(agentId);
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentOneStars = completions.filter(
    c => new Date(c.completedAt) >= last24Hours && c.rating === 1
  ).length;

  if (recentOneStars >= 3) {
    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      anomalyType: 'review_bombing',
      severity: 'medium',
      score: Math.min(recentOneStars / 10, 1),
      evidence: {
        oneStarCount: recentOneStars,
        timeWindow: '24h',
        pattern: 'multiple_one_stars',
        protection: 'agent_protection'
      },
      detectedAt: new Date().toISOString(),
      resolved: false
    };
  }

  return null;
}

/**
 * Detect score farming (rapid low-value tasks between same parties)
 */
export async function detectScoreFarming(agentId: string): AnomalyReport | null {
  const completions = await getCompletionsForAgent(agentId);
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentLowValueCompletions = completions.filter(
    c => new Date(c.completedAt) >= last24Hours && c.ergPaid <= 5
  );

  // Check for repeated interactions with same reviewers
  const reviewerInteractions = new Map<string, number>();
  recentLowValueCompletions.forEach(completion => {
    const reviewerId = completion.reviewerId ?? 'unknown';
    const count = reviewerInteractions.get(reviewerId) || 0;
    reviewerInteractions.set(reviewerId, count + 1);
  });

  for (const [reviewerId, count] of reviewerInteractions) {
    if (count >= 5) { // 5 or more low-value tasks with same reviewer
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        anomalyType: 'score_farming',
        severity: 'medium',
        score: Math.min(count / 20, 1),
        evidence: {
          reviewerId,
          interactionCount: count,
          timeWindow: '24h',
          avgTaskValue: recentLowValueCompletions.reduce((sum, c) => sum + c.ergPaid, 0) / recentLowValueCompletions.length,
          pattern: 'repeated_low_value_same_party'
        },
        detectedAt: new Date().toISOString(),
        resolved: false
      };
    }
  }

  return null;
}

/**
 * Comprehensive anomaly detection for an agent
 */
export async function detectAnomalies(agentId: string): AnomalyReport[] {
  const anomalies: AnomalyReport[] = [];

  // Run all detection algorithms
  const ratingManipulation = await detectRatingManipulation(agentId);
  const velocityAnomaly = await detectVelocityAnomaly(agentId);
  const reviewBombing = await detectReviewBombing(agentId);
  const scoreFarming = await detectScoreFarming(agentId);

  if (ratingManipulation) anomalies.push(ratingManipulation);
  if (velocityAnomaly) anomalies.push(velocityAnomaly);
  if (reviewBombing) anomalies.push(reviewBombing);
  if (scoreFarming) anomalies.push(scoreFarming);

  return anomalies;
}

// ====================================
// RISK ASSESSMENT
// ====================================

/**
 * Comprehensive risk assessment for an agent
 */
export async function assessAgentRisk(agentId: string): RiskAssessment {
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const anomalies = await detectAnomalies(agentId);
  const velocityCheck = await checkVelocityLimits(agentId);
  const probationStatus = await getProbationStatus(agentId);

  // Calculate risk factors
  const factors = {
    probationStatus: probationStatus.isInProbation,
    anomalyScore: agent.anomalyScore ?? 0,
    disputeHistory: (agent.disputesLost ?? 0) / Math.max(1, (agent.disputesWon ?? 0) + (agent.disputesLost ?? 0)),
    velocityFlags: velocityCheck.exceeds,
    walletClusterFlags: false, // TODO: Implement wallet clustering detection
    reviewPatterns: anomalies.some(a => a.anomalyType === 'rating_manipulation')
  };

  // Calculate overall risk score
  let riskScore = 0;
  if (factors.probationStatus) riskScore += 0.2;
  riskScore += factors.anomalyScore * 0.4;
  riskScore += factors.disputeHistory * 0.2;
  if (factors.velocityFlags) riskScore += 0.1;
  if (factors.walletClusterFlags) riskScore += 0.05;
  if (factors.reviewPatterns) riskScore += 0.05;

  // Determine risk level
  let riskLevel: RiskAssessment['riskLevel'];
  if (riskScore >= 0.7) riskLevel = 'critical';
  else if (riskScore >= 0.5) riskLevel = 'high';
  else if (riskScore >= 0.3) riskLevel = 'medium';
  else riskLevel = 'low';

  // Generate recommendations
  const recommendations: string[] = [];
  if (factors.probationStatus) {
    recommendations.push('Agent is in probation - monitor closely until graduation');
  }
  if (factors.anomalyScore > 0.5) {
    recommendations.push('High anomaly score detected - investigate recent activity');
  }
  if (factors.disputeHistory > 0.3) {
    recommendations.push('Poor dispute history - consider tier demotion');
  }
  if (factors.velocityFlags) {
    recommendations.push('Velocity limits exceeded - enforce cooldown period');
  }

  return {
    agentId,
    riskLevel,
    riskScore: Math.min(riskScore, 1),
    factors,
    recommendations,
    assessedAt: new Date().toISOString()
  };
}

// ====================================
// AUTOMATED RESPONSES
// ====================================

/**
 * Automatically respond to detected anomalies
 */
export async function autoRespondToAnomaly(anomaly: AnomalyReport): AutoResponse {
  let action: AutoResponse['action'] = 'none';
  let reason = '';
  let details = '';

  if (anomaly.score >= ANOMALY_THRESHOLDS.CRITICAL) {
    action = 'suspend';
    reason = `Critical anomaly detected: ${anomaly.anomalyType}`;
    details = `Agent automatically suspended due to anomaly score of ${anomaly.score}`;
    
    // Execute suspension
    const agent = await getAgentById(anomaly.agentId);
    if (agent) {
      await updateAgent(anomaly.agentId, {
        status: 'suspended',
        suspendedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });
    }
  } else if (anomaly.score >= ANOMALY_THRESHOLDS.HIGH) {
    action = 'flag';
    reason = `High-severity anomaly detected: ${anomaly.anomalyType}`;
    details = `Agent flagged for manual review and enhanced monitoring`;
    
    // Update anomaly score
    const agent = await getAgentById(anomaly.agentId);
    if (agent) {
      await updateAgent(anomaly.agentId, {
        anomalyScore: Math.max(agent.anomalyScore ?? 0, anomaly.score)
      });
    }
  } else if (anomaly.score >= ANOMALY_THRESHOLDS.MEDIUM) {
    action = 'monitor';
    reason = `Medium-severity anomaly detected: ${anomaly.anomalyType}`;
    details = `Agent under internal monitoring - no user-facing action`;
  }

  return {
    action,
    reason,
    details,
    executedAt: new Date().toISOString(),
    notificationSent: action !== 'none' && action !== 'monitor'
  };
}

// ====================================
// DISPUTE RESOLUTION
// ====================================

/**
 * Select arbiters for dispute resolution
 */
export async function selectArbiters(excludeIds: string[] = []): string[] {
  const agents = await getAgents();
  
  // Filter for eligible arbiters (Elite/Legendary with good standing)
  const eligibleArbiters = agents.filter(agent => 
    (agent.tier === 'elite' || agent.tier === 'legendary') &&
    agent.status === 'available' &&
    (agent.disputesWon ?? 0) / Math.max(1, (agent.disputesWon ?? 0) + (agent.disputesLost ?? 0)) >= 0.8 &&
    !excludeIds.includes(agent.id) &&
    !agent.suspendedUntil
  );

  // Randomly select 3 arbiters
  const shuffled = eligibleArbiters.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(arbiter => arbiter.id);
}

/**
 * Initiate dispute resolution process
 */
export async function initiateDisputeResolution(taskId: string, initiatedBy: 'client' | 'agent' = 'client'): DisputeProcess {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const arbiters = selectArbiters([task.assignedAgentId || '', task.creatorAddress]);
  
  if (arbiters.length < 3) {
    // Not enough arbiters - will auto-refund after timeout
    return {
      id: `dispute-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      status: 'initiated',
      initiatedBy,
      initiatedAt: new Date().toISOString(),
      arbiters: [],
      evidenceSubmitted: {
        taskRequirements: task.description,
        deliverables: 'To be submitted'
      },
      votes: []
    };
  }

  return {
    id: `dispute-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskId,
    status: 'arbiters_selected',
    initiatedBy,
    initiatedAt: new Date().toISOString(),
    arbiters,
    evidenceSubmitted: {
      taskRequirements: task.description,
      deliverables: 'To be submitted'
    },
    votes: []
  };
}

// ====================================
// PLATFORM HEALTH MONITORING
// ====================================

/**
 * Calculate comprehensive platform health metrics
 */
export async function calculatePlatformHealth(): PlatformHealthReport {
  const agents = await getAgents();
  const tasks = await getTasks();
  const completions = await getCompletions();
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Dispute metrics
  const recentTasks = tasks.filter(t => new Date(t.createdAt) >= sevenDaysAgo);
  const disputedTasks = recentTasks.filter(t => t.status === 'disputed');
  const disputeRate = recentTasks.length > 0 ? disputedTasks.length / recentTasks.length : 0;

  // Completion metrics
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTasksWithOutcome = tasks.filter(t => 
    ['completed', 'disputed'].includes(t.status)
  );
  const completionRate = totalTasksWithOutcome.length > 0 
    ? completedTasks.length / totalTasksWithOutcome.length 
    : 0;

  // Escrow metrics
  const activeTasks = tasks.filter(t => ['assigned', 'in_progress', 'review'].includes(t.status));
  const totalLockedErg = activeTasks.reduce((sum, task) => sum + task.budgetErg, 0);
  const todayTransactions = tasks.filter(t => new Date(t.createdAt) >= todayStart);

  // Agent metrics
  const activeAgents = agents.filter(a => 
    new Date(a.lastActivityAt ?? a.createdAt) >= thirtyDaysAgo
  );
  const newAgentsThisWeek = agents.filter(a => 
    new Date(a.createdAt) >= sevenDaysAgo
  );

  // Calculate churn rate
  const newAgentCompletions = newAgentsThisWeek.map(agent => 
    completions.filter(c => c.agentId === agent.id).length
  );
  const churnedNewAgents = newAgentCompletions.filter(count => count === 0).length;
  const churnRate = newAgentsThisWeek.length > 0 
    ? churnedNewAgents / newAgentsThisWeek.length 
    : 0;

  // Safety metrics
  const suspendedAgents = agents.filter(a => a.status === 'suspended').length;
  const averageAnomalyScore = agents.reduce((sum, a) => sum + (a.anomalyScore ?? 0), 0) / agents.length;

  // Generate alerts
  const alerts: PlatformHealthReport['alerts'] = [];
  
  if (disputeRate > PLATFORM_THRESHOLDS.DISPUTE_RATE_WARNING) {
    alerts.push({
      level: 'warning',
      message: 'Dispute rate is above threshold',
      metric: 'dispute_rate',
      threshold: PLATFORM_THRESHOLDS.DISPUTE_RATE_WARNING,
      current: disputeRate
    });
  }

  if (completionRate < PLATFORM_THRESHOLDS.COMPLETION_RATE_WARNING) {
    alerts.push({
      level: 'critical',
      message: 'Completion rate is below threshold',
      metric: 'completion_rate',
      threshold: PLATFORM_THRESHOLDS.COMPLETION_RATE_WARNING,
      current: completionRate
    });
  }

  if (churnRate > PLATFORM_THRESHOLDS.CHURN_RATE_WARNING) {
    alerts.push({
      level: 'warning',
      message: 'New agent churn rate is above threshold',
      metric: 'churn_rate',
      threshold: PLATFORM_THRESHOLDS.CHURN_RATE_WARNING,
      current: churnRate
    });
  }

  return {
    reportId: `health-${Date.now()}`,
    generatedAt: now.toISOString(),
    metrics: {
      dispute: {
        rate: disputeRate,
        total: disputedTasks.length,
        resolved: disputedTasks.filter(t => t.status === 'completed').length,
        pending: disputedTasks.filter(t => t.status === 'disputed').length,
        averageResolutionTime: 0 // TODO: Calculate based on resolution timestamps
      },
      completion: {
        rate: completionRate,
        total: totalTasksWithOutcome.length,
        completed: completedTasks.length,
        abandoned: totalTasksWithOutcome.length - completedTasks.length,
        averageTimeToCompletion: 0 // TODO: Calculate based on completion timestamps
      },
      escrow: {
        totalLockedErg,
        totalTransactionsToday: todayTransactions.length,
        averageTaskValue: tasks.length > 0 
          ? tasks.reduce((sum, t) => sum + t.budgetErg, 0) / tasks.length 
          : 0,
        escrowHealth: totalLockedErg < 10000 ? 'healthy' : 
                     totalLockedErg < 50000 ? 'concern' : 'critical'
      },
      agents: {
        total: agents.length,
        active: activeAgents.length,
        newThisWeek: newAgentsThisWeek.length,
        churnRate,
        averageEgoScore: agents.reduce((sum, a) => sum + a.egoScore, 0) / agents.length
      },
      safety: {
        anomaliesDetected: Math.floor(averageAnomalyScore * agents.length),
        agentsSuspended: suspendedAgents,
        falsePositiveRate: 0, // TODO: Track appeals that succeeded
        automatedActionsToday: 0 // TODO: Track automated actions
      }
    },
    alerts
  };
}

// ====================================
// MAIN SAFETY AUDIT FUNCTION
// ====================================

/**
 * Run comprehensive safety audit of the entire platform
 * This is the main function that orchestrates all safety systems
 */
export async function runSafetyAudit(): SafetyAuditReport {
  const startTime = Date.now();
  const agents = await getAgents();
  
  const findings = {
    anomaliesDetected: [] as AnomalyReport[],
    riskAssessments: [] as RiskAssessment[],
    automatedActions: [] as AutoResponse[],
    systemHealth: calculatePlatformHealth()
  };

  let criticalIssues = 0;
  let highRiskAgents = 0;
  let suspensionsIssued = 0;
  let escrowsFrozen = 0;
  let monitoringActivated = 0;

  // Audit each agent
  agents.forEach(agent => {
    try {
      // Risk assessment
      const riskAssessment = await assessAgentRisk(agent.id);
      findings.riskAssessments.push(riskAssessment);

      if (riskAssessment.riskLevel === 'critical') criticalIssues++;
      if (riskAssessment.riskLevel === 'high') highRiskAgents++;

      // Anomaly detection
      const anomalies = await detectAnomalies(agent.id);
      findings.anomaliesDetected.push(...anomalies);

      // Auto-respond to anomalies
      anomalies.forEach(anomaly => {
        const response = await autoRespondToAnomaly(anomaly);
        findings.automatedActions.push(response);

        switch (response.action) {
          case 'suspend':
            suspensionsIssued++;
            break;
          case 'freeze_escrows':
            escrowsFrozen++;
            break;
          case 'flag':
          case 'monitor':
            monitoringActivated++;
            break;
        }
      });

      // Check for graduation from probation
      if (!agent.probationCompleted) {
        graduateFromProbation(agent.id);
      }

      // Update tier based on current performance
      const newTier = calculateAgentTier(agent);
      if (newTier !== agent.tier) {
        await updateAgent(agent.id, {
          tier: newTier,
          maxTaskValue: getMaxTaskValue(newTier)
        });
      }

      // Check for dormancy (90+ days inactive)
      const lastActivity = new Date(agent.lastActivityAt ?? agent.createdAt);
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceActivity > PLATFORM_THRESHOLDS.INACTIVITY_DAYS && agent.status === 'available') {
        await updateAgent(agent.id, { status: 'dormant' });
      }

    } catch (error) {
      console.error(`Error auditing agent ${agent.id}:`, error);
    }
  });

  const endTime = Date.now();

  return {
    auditId: `audit-${Date.now()}`,
    runAt: new Date().toISOString(),
    duration: endTime - startTime,
    agentsAudited: agents.length,
    findings,
    summary: {
      criticalIssues,
      highRiskAgents,
      suspensionsIssued,
      escrowsFrozen,
      monitoringActivated
    }
  };
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Initialize safety fields for existing agents
 */
export async function initializeSafetyFields(): void {
  const agents = await getAgents();
  
  agents.forEach(agent => {
    if (!agent.hasOwnProperty('probationCompleted')) {
      const tier = calculateAgentTier({
        ...agent,
        probationCompleted: agent.tasksCompleted >= PROBATION_CONFIG.REQUIRED_TASKS,
        tier: 'newcomer',
        disputesWon: 0,
        disputesLost: 0,
        consecutiveDisputesLost: 0,
        completionRate: agent.tasksCompleted > 0 ? 0.9 : 0,
        lastActivityAt: agent.createdAt
      });

      await updateAgent(agent.id, {
        probationCompleted: agent.tasksCompleted >= PROBATION_CONFIG.REQUIRED_TASKS,
        probationTasksRemaining: Math.max(0, PROBATION_CONFIG.REQUIRED_TASKS - agent.tasksCompleted),
        suspendedUntil: null,
        anomalyScore: 0,
        maxTaskValue: getMaxTaskValue(tier),
        velocityWindow: { count: 0, windowStart: new Date().toISOString() },
        tier,
        disputesWon: 0,
        disputesLost: 0,
        consecutiveDisputesLost: 0,
        completionRate: agent.tasksCompleted > 0 ? 0.9 : 0,
        lastActivityAt: agent.createdAt
      });
    }
  });
}