import { Agent, Task, Bid, Transaction, Completion, ReputationEvent } from './types';
import { agents, tasks, bidsForTask, sampleTransactions, completions, reputationHistory } from './mock-data';

// TODO: Replace with Supabase when ready
// This file should be the only one that changes when migrating to Supabase

const STORAGE_KEYS = {
  AGENTS: 'aih_agents',
  TASKS: 'aih_tasks',
  BIDS: 'aih_bids',
  TRANSACTIONS: 'aih_transactions',
  COMPLETIONS: 'aih_completions',
  REPUTATION_EVENTS: 'aih_reputation_events',
  USERS: 'aih_users',
  INITIALIZED: 'aih_initialized'
};

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'developer' | 'agent_owner' | 'business';
  ergoAddress?: string;
  avatarUrl?: string;
  passwordHash: string; // Basic hashing for localStorage
  createdAt: string;
}

// Simple hash function for passwords (for demo only)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Initialize data if first time
function initializeData() {
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!initialized) {
    // Initialize agents with safety fields
    const agentsWithSafety: Agent[] = agents.map(agent => ({
      ...agent,
      // Add safety fields if missing
      probationCompleted: agent.probationCompleted ?? (agent.tasksCompleted >= 5),
      probationTasksRemaining: agent.probationTasksRemaining ?? Math.max(0, 5 - agent.tasksCompleted),
      suspendedUntil: agent.suspendedUntil ?? null,
      anomalyScore: agent.anomalyScore ?? 0,
      maxTaskValue: agent.maxTaskValue ?? (agent.tasksCompleted >= 5 ? 50 : 10),
      velocityWindow: agent.velocityWindow ?? { count: 0, windowStart: new Date().toISOString() },
      tier: agent.tier ?? (
        agent.tasksCompleted >= 100 ? 'elite' :
        agent.tasksCompleted >= 20 ? 'established' :
        agent.tasksCompleted >= 5 ? 'rising' : 'newcomer'
      ) as Agent['tier'],
      disputesWon: agent.disputesWon ?? 0,
      disputesLost: agent.disputesLost ?? 0,
      consecutiveDisputesLost: agent.consecutiveDisputesLost ?? 0,
      completionRate: agent.completionRate ?? (agent.tasksCompleted > 0 ? 0.9 : 0),
      lastActivityAt: agent.lastActivityAt ?? agent.createdAt
    }));
    
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agentsWithSafety));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    
    // Flatten bids from bidsForTask object into a single array
    const allBids: Bid[] = [];
    Object.values(bidsForTask).forEach(bidArray => {
      allBids.push(...bidArray);
    });
    localStorage.setItem(STORAGE_KEYS.BIDS, JSON.stringify(allBids));
    
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(sampleTransactions));
    
    // Initialize completions with reviewerId if missing
    const completionsWithReviewerId = completions.map(completion => ({
      ...completion,
      reviewerId: completion.reviewerId ?? `user-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`
    }));
    localStorage.setItem(STORAGE_KEYS.COMPLETIONS, JSON.stringify(completionsWithReviewerId));
    
    localStorage.setItem(STORAGE_KEYS.REPUTATION_EVENTS, JSON.stringify(reputationHistory));
    
    // Create demo user
    const demoUser: User = {
      id: 'user-001',
      email: 'demo@agenticaihome.com',
      displayName: 'Demo User',
      role: 'developer',
      ergoAddress: '9f4QF8AD1nQ3nJahQVkM...demo',
      passwordHash: simpleHash('demo123'),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([demoUser]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
}

// Helper functions
function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  initializeData();
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// User Management
export function getUsers(): User[] {
  return getFromStorage<User>(STORAGE_KEYS.USERS);
}

export function getUserByEmail(email: string): User | null {
  const users = getUsers();
  return users.find(u => u.email === email) || null;
}

export function createUser(userData: Omit<User, 'id' | 'passwordHash' | 'createdAt'> & { password: string }): User {
  const users = getUsers();
  const newUser: User = {
    ...userData,
    id: generateId(),
    passwordHash: simpleHash(userData.password),
    createdAt: new Date().toISOString()
  };
  const updatedUsers = [...users, newUser];
  saveToStorage(STORAGE_KEYS.USERS, updatedUsers);
  return newUser;
}

export function verifyPassword(email: string, password: string): User | null {
  const user = getUserByEmail(email);
  if (!user) return null;
  return user.passwordHash === simpleHash(password) ? user : null;
}

// Agent Management
export function getAgents(): Agent[] {
  return getFromStorage<Agent>(STORAGE_KEYS.AGENTS);
}

export function getAgentById(id: string): Agent | null {
  const agents = getAgents();
  return agents.find(a => a.id === id) || null;
}

export function createAgent(agentData: Omit<Agent, 'id' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>): Agent {
  const agents = getAgents();
  const newAgent: Agent = {
    ...agentData,
    id: generateId(),
    egoScore: 50, // Starting score
    tasksCompleted: 0,
    rating: 0,
    status: 'available',
    createdAt: new Date().toISOString(),
    // Trust & Safety fields
    probationCompleted: false,
    probationTasksRemaining: 5,
    suspendedUntil: null,
    anomalyScore: 0,
    maxTaskValue: 10, // Newcomer limit
    velocityWindow: { count: 0, windowStart: new Date().toISOString() },
    tier: 'newcomer',
    disputesWon: 0,
    disputesLost: 0,
    consecutiveDisputesLost: 0,
    completionRate: 0,
    lastActivityAt: new Date().toISOString()
  };
  const updatedAgents = [...agents, newAgent];
  saveToStorage(STORAGE_KEYS.AGENTS, updatedAgents);
  return newAgent;
}

export function updateAgent(id: string, updates: Partial<Agent>): Agent | null {
  const agents = getAgents();
  const index = agents.findIndex(a => a.id === id);
  if (index === -1) return null;
  
  const updatedAgent = { ...agents[index], ...updates };
  agents[index] = updatedAgent;
  saveToStorage(STORAGE_KEYS.AGENTS, agents);
  return updatedAgent;
}

export function deleteAgent(id: string): boolean {
  const agents = getAgents();
  const filtered = agents.filter(a => a.id !== id);
  if (filtered.length === agents.length) return false;
  saveToStorage(STORAGE_KEYS.AGENTS, filtered);
  return true;
}

// Task Management
export function getTasks(): Task[] {
  return getFromStorage<Task>(STORAGE_KEYS.TASKS);
}

export function getTaskById(id: string): Task | null {
  const tasks = getTasks();
  return tasks.find(t => t.id === id) || null;
}

export function createTask(taskData: Omit<Task, 'id' | 'status' | 'bidsCount' | 'createdAt'>): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...taskData,
    id: generateId(),
    status: 'open',
    bidsCount: 0,
    createdAt: new Date().toISOString()
  };
  const updatedTasks = [...tasks, newTask];
  saveToStorage(STORAGE_KEYS.TASKS, updatedTasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  const updatedTask = { ...tasks[index], ...updates };
  tasks[index] = updatedTask;
  saveToStorage(STORAGE_KEYS.TASKS, tasks);
  return updatedTask;
}

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveToStorage(STORAGE_KEYS.TASKS, filtered);
  return true;
}

// Bid Management
export function getBids(): Bid[] {
  return getFromStorage<Bid>(STORAGE_KEYS.BIDS);
}

export function getBidsForTask(taskId: string): Bid[] {
  const bids = getBids();
  return bids.filter(b => b.taskId === taskId);
}

export function getBidsForAgent(agentId: string): Bid[] {
  const bids = getBids();
  return bids.filter(b => b.agentId === agentId);
}

export function createBid(bidData: Omit<Bid, 'id' | 'createdAt'>): Bid {
  const bids = getBids();
  const newBid: Bid = {
    ...bidData,
    id: generateId(),
    createdAt: new Date().toISOString()
  };
  const updatedBids = [...bids, newBid];
  saveToStorage(STORAGE_KEYS.BIDS, updatedBids);
  
  // Update task bid count
  const tasks = getTasks();
  const taskIndex = tasks.findIndex(t => t.id === bidData.taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].bidsCount += 1;
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }
  
  return newBid;
}

export function acceptBid(bidId: string): boolean {
  const bids = getBids();
  const bid = bids.find(b => b.id === bidId);
  if (!bid) return false;
  
  // Update task status and assign agent
  const tasks = getTasks();
  const taskIndex = tasks.findIndex(t => t.id === bid.taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].status = 'assigned';
    tasks[taskIndex].assignedAgentId = bid.agentId;
    tasks[taskIndex].assignedAgentName = bid.agentName;
    saveToStorage(STORAGE_KEYS.TASKS, tasks);
  }
  
  return true;
}

// Transaction Management
export function getTransactions(): Transaction[] {
  return getFromStorage<Transaction>(STORAGE_KEYS.TRANSACTIONS);
}

export function createTransaction(transactionData: Omit<Transaction, 'id'>): Transaction {
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...transactionData,
    id: generateId()
  };
  const updatedTransactions = [...transactions, newTransaction];
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, updatedTransactions);
  return newTransaction;
}

// Completion Management
export function getCompletions(): Completion[] {
  return getFromStorage<Completion>(STORAGE_KEYS.COMPLETIONS);
}

export function getCompletionsForAgent(agentId: string): Completion[] {
  const completions = getCompletions();
  return completions.filter(c => c.agentId === agentId);
}

export function createCompletion(completionData: Omit<Completion, 'id'>): Completion {
  const completions = getCompletions();
  const newCompletion: Completion = {
    ...completionData,
    id: generateId(),
    reviewerId: completionData.reviewerId || 'unknown' // Ensure reviewerId is always present
  };
  const updatedCompletions = [...completions, newCompletion];
  saveToStorage(STORAGE_KEYS.COMPLETIONS, updatedCompletions);
  return newCompletion;
}

// Reputation Events
export function getReputationEvents(): ReputationEvent[] {
  return getFromStorage<ReputationEvent>(STORAGE_KEYS.REPUTATION_EVENTS);
}

export function getReputationEventsForAgent(agentId: string): ReputationEvent[] {
  const events = getReputationEvents();
  return events.filter(e => e.agentId === agentId);
}

export function createReputationEvent(eventData: Omit<ReputationEvent, 'id'>): ReputationEvent {
  const events = getReputationEvents();
  const newEvent: ReputationEvent = {
    ...eventData,
    id: generateId()
  };
  const updatedEvents = [...events, newEvent];
  saveToStorage(STORAGE_KEYS.REPUTATION_EVENTS, updatedEvents);
  return newEvent;
}

// Search and Filter Functions
export function searchAgents(query: string = '', skills: string[] = []): Agent[] {
  const agents = getAgents();
  return agents.filter(agent => {
    const matchesQuery = !query || 
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.description.toLowerCase().includes(query.toLowerCase());
    
    const matchesSkills = skills.length === 0 || 
      skills.some(skill => agent.skills.includes(skill));
    
    return matchesQuery && matchesSkills;
  });
}

export function searchTasks(query: string = '', skills: string[] = [], status?: Task['status']): Task[] {
  const tasks = getTasks();
  return tasks.filter(task => {
    const matchesQuery = !query || 
      task.title.toLowerCase().includes(query.toLowerCase()) ||
      task.description.toLowerCase().includes(query.toLowerCase());
    
    const matchesSkills = skills.length === 0 || 
      skills.some(skill => task.skillsRequired.includes(skill));
    
    const matchesStatus = !status || task.status === status;
    
    return matchesQuery && matchesSkills && matchesStatus;
  });
}

// Get all unique skills from agents and tasks
export function getAllSkills(): string[] {
  const agents = getAgents();
  const tasks = getTasks();
  
  const skillSet = new Set<string>();
  
  agents.forEach(agent => {
    agent.skills.forEach(skill => skillSet.add(skill));
  });
  
  tasks.forEach(task => {
    task.skillsRequired.forEach(skill => skillSet.add(skill));
  });
  
  return Array.from(skillSet).sort();
}