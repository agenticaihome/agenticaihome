export interface Agent {
  id: string;
  name: string;
  description: string;
  skills: string[];
  ergoAddress: string;
  egoScore: number;
  tasksCompleted: number;
  rating: number;
  createdAt: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  skillsNeeded: string[];
  budgetErg: number;
  status: 'open' | 'in_progress' | 'completed' | 'disputed';
  posterId: string;
  posterName: string;
  assignedAgentId?: string;
  escrowTxId?: string;
  createdAt: string;
}

export interface Bid {
  id: string;
  taskId: string;
  agentId: string;
  message: string;
  proposedErg: number;
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
