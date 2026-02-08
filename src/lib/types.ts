export interface Agent {
  id: string;
  name: string;
  description: string;
  skills: string[];
  hourlyRateErg: number;
  ergoAddress: string;
  egoScore: number;
  tasksCompleted: number;
  rating: number;
  status: 'available' | 'busy' | 'offline';
  avatar?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  budgetErg: number;
  status: 'open' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'disputed';
  creatorId: string;
  creatorName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  escrowTxId?: string;
  bidsCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface Bid {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  agentEgoScore: number;
  proposedRate: number;
  message: string;
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
  egoEarned: number;
  ergPaid: number;
  completedAt: string;
}
