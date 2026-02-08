import { Agent, Task, Bid, Transaction, Completion, ReputationEvent, WalletProfile, User } from './types';

// Re-export types for convenience
export type { User, WalletProfile } from './types';
import { agents, tasks, bidsForTask, sampleTransactions, completions, reputationHistory } from './mock-data';
import { sanitizeText, sanitizeSkill, sanitizeNumber, sanitizeErgoAddress } from './sanitize';

// TODO: Replace with Supabase when ready
// This file should be the only one that changes when migrating to Supabase

const STORAGE_KEYS = {
  AGENTS: 'aih_agents',
  TASKS: 'aih_tasks',
  BIDS: 'aih_bids',
  TRANSACTIONS: 'aih_transactions',
  COMPLETIONS: 'aih_completions',
  REPUTATION_EVENTS: 'aih_reputation_events',
  WALLET_PROFILES: 'aih_wallet_profiles',
  INITIALIZED: 'aih_initialized'
};

// CRITICAL SECURITY FIX: Ergo address validation
function validateErgoAddress(address: string): boolean {
  // Ergo addresses are Base58-encoded, typically 40-60 chars
  // P2PK start with '9', P2S start with other chars, testnet addresses vary
  if (!address || typeof address !== 'string') return false;
  if (address.length < 30 || address.length > 120) return false;
  
  // Check for valid Base58 characters (excluding 0, O, I, l)
  const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Pattern.test(address);
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
    
    // Initialize empty wallet profiles (profiles created when wallets connect)
    localStorage.setItem(STORAGE_KEYS.WALLET_PROFILES, JSON.stringify([]));
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

// Wallet Profile Management
export function getWalletProfiles(): WalletProfile[] {
  return getFromStorage<WalletProfile>(STORAGE_KEYS.WALLET_PROFILES);
}

export function getWalletProfile(address: string): WalletProfile | null {
  const profiles = getWalletProfiles();
  return profiles.find(p => p.address === address) || null;
}

export function createOrUpdateWalletProfile(address: string, displayName?: string): WalletProfile {
  // SECURITY: Validate Ergo address
  if (!validateErgoAddress(address)) {
    throw new Error('Invalid Ergo address format. Must be a valid P2PK address starting with 9.');
  }

  const profiles = getWalletProfiles();
  const existingProfile = profiles.find(p => p.address === address);
  
  if (existingProfile) {
    // Update existing profile
    if (displayName) {
      existingProfile.displayName = sanitizeText(displayName, 100);
    }
    const updatedProfiles = profiles.map(p => p.address === address ? existingProfile : p);
    saveToStorage(STORAGE_KEYS.WALLET_PROFILES, updatedProfiles);
    return existingProfile;
  } else {
    // Create new profile
    const newProfile: WalletProfile = {
      address,
      displayName: displayName ? sanitizeText(displayName, 100) : undefined,
      joinedAt: new Date().toISOString()
    };
    const updatedProfiles = [...profiles, newProfile];
    saveToStorage(STORAGE_KEYS.WALLET_PROFILES, updatedProfiles);
    return newProfile;
  }
}

// Agent Management
export function getAgents(): Agent[] {
  return getFromStorage<Agent>(STORAGE_KEYS.AGENTS);
}

export function getAgentById(id: string): Agent | null {
  const agents = getAgents();
  return agents.find(a => a.id === id) || null;
}

export function createAgent(agentData: Omit<Agent, 'id' | 'ownerAddress' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>, ownerAddress: string): Agent {
  // SECURITY: Validate owner address
  if (!validateErgoAddress(ownerAddress)) {
    throw new Error('Invalid owner address format. Must be a valid P2PK address starting with 9.');
  }
  
  // SECURITY: Validate agent Ergo address
  if (agentData.ergoAddress && !validateErgoAddress(agentData.ergoAddress)) {
    throw new Error('Invalid Ergo address format. Must be a valid P2PK address starting with 9.');
  }
  
  // SECURITY: Sanitize input data to prevent XSS and other attacks
  const sanitizedData = {
    ...agentData,
    name: sanitizeText(agentData.name, 100),
    description: sanitizeText(agentData.description, 2000),
    skills: agentData.skills.map(sanitizeSkill).filter(skill => skill.length > 0).slice(0, 20),
    hourlyRateErg: sanitizeNumber(agentData.hourlyRateErg, 0.1, 10000),
    ergoAddress: sanitizeErgoAddress(agentData.ergoAddress)
  };
  
  const agents = getAgents();
  
  // SECURITY: Check for duplicate Ergo addresses
  if (sanitizedData.ergoAddress && agents.some(a => a.ergoAddress === sanitizedData.ergoAddress)) {
    throw new Error('An agent with this Ergo address already exists.');
  }
  
  const newAgent: Agent = {
    ...sanitizedData,
    id: generateId(),
    ownerAddress,
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

export function getAgentsByOwner(ownerAddress: string): Agent[] {
  const agents = getAgents();
  return agents.filter(a => a.ownerAddress === ownerAddress);
}

// Task Management
export function getTasks(): Task[] {
  return getFromStorage<Task>(STORAGE_KEYS.TASKS);
}

export function getTaskById(id: string): Task | null {
  const tasks = getTasks();
  return tasks.find(t => t.id === id) || null;
}

export function createTask(taskData: Omit<Task, 'id' | 'creatorAddress' | 'status' | 'bidsCount' | 'createdAt'>, creatorAddress: string): Task {
  // SECURITY: Validate creator address
  if (!validateErgoAddress(creatorAddress)) {
    throw new Error('Invalid creator address format. Must be a valid P2PK address starting with 9.');
  }
  
  // SECURITY: Sanitize task input data
  const sanitizedTaskData = {
    ...taskData,
    title: sanitizeText(taskData.title, 200),
    description: sanitizeText(taskData.description, 5000),
    skillsRequired: taskData.skillsRequired.map(sanitizeSkill).filter(skill => skill.length > 0).slice(0, 10),
    budgetErg: sanitizeNumber(taskData.budgetErg, 0.1, 100000),
    creatorAddress,
    creatorName: taskData.creatorName ? sanitizeText(taskData.creatorName, 100) : undefined
  };
  
  const tasks = getTasks();
  const newTask: Task = {
    ...sanitizedTaskData,
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

export function getTasksByCreator(creatorAddress: string): Task[] {
  const tasks = getTasks();
  return tasks.filter(t => t.creatorAddress === creatorAddress);
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
  // SECURITY: Sanitize bid data
  const sanitizedBidData = {
    ...bidData,
    agentName: sanitizeText(bidData.agentName, 100),
    message: sanitizeText(bidData.message, 1000),
    proposedRate: sanitizeNumber(bidData.proposedRate, 0.1, 10000),
    agentEgoScore: sanitizeNumber(bidData.agentEgoScore, 0, 100)
  };
  
  const bids = getBids();
  const newBid: Bid = {
    ...sanitizedBidData,
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

// Temporary user authentication functions (will be replaced with wallet-based auth)
const USERS_STORAGE_KEY = 'aih_users';

function getUsers(): User[] {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing users:', error);
    }
  }
  return [];
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function createUser(email: string, password: string, displayName: string, role: User['role'] = 'user'): User {
  const users = getUsers();
  
  // Check if user already exists
  if (users.find(u => u.email === email)) {
    throw new Error('User already exists');
  }
  
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    email: sanitizeText(email),
    displayName: sanitizeText(displayName),
    role,
    joinedAt: new Date().toISOString()
  };
  
  // Store password separately (in real implementation, would be hashed)
  const passwords = JSON.parse(localStorage.getItem('aih_passwords') || '{}');
  passwords[email] = password;
  localStorage.setItem('aih_passwords', JSON.stringify(passwords));
  
  users.push(user);
  saveUsers(users);
  
  return user;
}

export function verifyPassword(email: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return null;
  }
  
  // Check password (in real implementation, would be hashed comparison)
  const passwords = JSON.parse(localStorage.getItem('aih_passwords') || '{}');
  if (passwords[email] === password) {
    return user;
  }
  
  return null;
}