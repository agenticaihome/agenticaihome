// Wallet-based identity interface for true dApp functionality
export interface WalletProfile {
  address: string;           // Ergo address = identity
  displayName?: string;      // Optional, stored locally
  joinedAt: string;
  // Everything else comes from the blockchain:
  // - EGO score → query on-chain EGO tokens
  // - Tasks completed → query on-chain completions
  // - Agents owned → query on-chain agent registrations
}

// Temporary User interface for auth context (will be replaced with wallet-based auth)
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'agent_owner' | 'admin' | 'developer';
  joinedAt: string;
  ergoAddress?: string; // Optional Ergo address
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  skills: string[];
  hourlyRateErg: number;
  ergoAddress: string;
  ownerAddress: string; // Wallet address of the agent owner
  egoScore: number;
  tasksCompleted: number;
  rating: number;
  status: 'available' | 'busy' | 'offline' | 'suspended' | 'dormant';
  avatar?: string;
  createdAt: string;
  // Trust & Safety fields (optional for backward compatibility)
  probationCompleted?: boolean;
  probationTasksRemaining?: number;
  suspendedUntil?: string | null;
  anomalyScore?: number;
  maxTaskValue?: number;
  velocityWindow?: { count: number; windowStart: string };
  tier?: 'newcomer' | 'rising' | 'established' | 'elite' | 'legendary';
  disputesWon?: number;
  disputesLost?: number;
  consecutiveDisputesLost?: number;
  completionRate?: number;
  lastActivityAt?: string;
  identityTokenId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  budgetErg: number;
  status: 'open' | 'funded' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'disputed' | 'cancelled' | 'refunded';
  creatorAddress: string; // Wallet address of task creator
  creatorName?: string; // Optional display name
  assignedAgentId?: string;
  assignedAgentName?: string;
  acceptedBidId?: string;
  acceptedAgentAddress?: string;
  escrowTxId?: string;
  bidsCount: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, string>;
}

export interface Bid {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  agentEgoScore: number;
  proposedRate: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
}

export interface Transaction {
  id: string;
  taskId: string;
  taskTitle: string;
  amountErg: number;
  type: 'earned' | 'escrowed' | 'released';
  date: string;
  txId: string;
}

export interface ReputationEvent {
  id: string;
  agentId: string;
  eventType: 'completion' | 'dispute_won' | 'dispute_lost';
  egoDelta: number;
  description: string;
  createdAt: string;
}

export interface Completion {
  id: string;
  taskId: string;
  taskTitle: string;
  agentId: string;
  rating: number;
  review: string;
  reviewerName: string;
  reviewerId?: string;
  egoEarned: number;
  ergPaid: number;
  completedAt: string;
}

// Trust & Safety Interfaces

export interface RiskAssessment {
  agentId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-1
  factors: {
    probationStatus: boolean;
    anomalyScore: number;
    disputeHistory: number;
    velocityFlags: boolean;
    walletClusterFlags: boolean;
    reviewPatterns: boolean;
  };
  recommendations: string[];
  assessedAt: string;
}

export interface AnomalyReport {
  id: string;
  agentId: string;
  anomalyType: 'rating_manipulation' | 'sybil_detection' | 'velocity_anomaly' | 'score_farming' | 'review_bombing' | 'wallet_clustering';
  severity: 'low' | 'medium' | 'high';
  score: number; // 0-1
  evidence: Record<string, any>;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface VelocityCheck {
  agentId: string;
  currentHourCount: number;
  maxAllowed: number;
  windowStart: string;
  exceeds: boolean;
  timeUntilReset: string;
}

export interface ProbationStatus {
  agentId: string;
  isInProbation: boolean;
  tasksCompleted: number;
  tasksRemaining: number;
  averageRating: number;
  eligibleForGraduation: boolean;
  restrictions: {
    maxTaskValue: number;
    escrowHoldPeriod: number; // hours
    canBidOnPremium: boolean;
  };
}

export interface AutoResponse {
  action: 'none' | 'monitor' | 'flag' | 'suspend' | 'freeze_escrows';
  reason: string;
  details: string;
  executedAt: string;
  notificationSent: boolean;
}

export interface DisputeProcess {
  id: string;
  taskId: string;
  status: 'initiated' | 'arbiters_selected' | 'in_review' | 'voting' | 'resolved' | 'appealed';
  initiatedBy: 'client' | 'agent';
  initiatedAt: string;
  arbiters: string[];
  evidenceSubmitted: {
    clientEvidence?: string;
    agentEvidence?: string;
    taskRequirements: string;
    deliverables: string;
  };
  votes: {
    arbiterId: string;
    decision: 'client_wins' | 'agent_wins';
    reasoning: string;
    votedAt: string;
  }[];
  outcome?: {
    decision: 'client_wins' | 'agent_wins';
    reasoning: string;
    ergRefunded?: number;
    ergAwarded?: number;
    resolvedAt: string;
  };
  appeal?: {
    appealedBy: string;
    appealedAt: string;
    stakeErgTxId: string;
    newArbiters: string[];
    outcome?: {
      decision: 'upheld' | 'overturned';
      reasoning: string;
      stakeReturned: boolean;
      resolvedAt: string;
    };
  };
}

export interface ArbitrationResult {
  disputeId: string;
  decision: 'client_wins' | 'agent_wins';
  votingRecord: {
    arbiterId: string;
    vote: 'client_wins' | 'agent_wins';
    reasoning: string;
  }[];
  finalReasoning: string;
  ergDistribution: {
    clientRefund?: number;
    agentPayment?: number;
    arbiterFees: { arbiterId: string; fee: number }[];
  };
  resolvedAt: string;
}

export interface PlatformHealthReport {
  reportId: string;
  generatedAt: string;
  metrics: {
    dispute: {
      rate: number; // percentage of tasks that went to dispute in last 7 days
      total: number;
      resolved: number;
      pending: number;
      averageResolutionTime: number; // hours
    };
    completion: {
      rate: number; // platform-wide completion rate
      total: number;
      completed: number;
      abandoned: number;
      averageTimeToCompletion: number; // hours
    };
    escrow: {
      totalLockedErg: number;
      totalTransactionsToday: number;
      averageTaskValue: number;
      escrowHealth: 'healthy' | 'concern' | 'critical';
    };
    agents: {
      total: number;
      active: number; // active in last 30 days
      newThisWeek: number;
      churnRate: number; // percentage of new agents abandoning after first task
      averageEgoScore: number;
    };
    safety: {
      anomaliesDetected: number;
      agentsSuspended: number;
      falsePositiveRate: number; // appeals that succeeded
      automatedActionsToday: number;
    };
  };
  alerts: {
    level: 'info' | 'warning' | 'critical';
    message: string;
    metric: string;
    threshold: number;
    current: number;
  }[];
}

export interface SafetyAuditReport {
  auditId: string;
  runAt: string;
  duration: number; // milliseconds
  agentsAudited: number;
  findings: {
    anomaliesDetected: AnomalyReport[];
    riskAssessments: RiskAssessment[];
    automatedActions: AutoResponse[];
    systemHealth: PlatformHealthReport;
  };
  summary: {
    criticalIssues: number;
    highRiskAgents: number;
    suspensionsIssued: number;
    escrowsFrozen: number;
    monitoringActivated: number;
  };
}
