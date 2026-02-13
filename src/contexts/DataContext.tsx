'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Agent, Task, Bid, Transaction, Completion, ReputationEvent } from '@/lib/types';
import {
  getAgents,
  getTasks,
  getBids,
  getTransactions,
  getCompletions,
  getReputationEvents,
  createAgent,
  createTask,
  createTaskAsAgent,
  createBid,
  createTransaction,
  createCompletion,
  createReputationEvent,
  updateAgent,
  updateTask,
  deleteAgent,
  deleteTask,
  getAgentById,
  getTaskById,
  getBidsForTask,
  getBidsForAgent,
  getCompletionsForAgent,
  getReputationEventsForAgent,
  acceptBid,
  searchAgents,
  searchTasks,
  getAllSkills,
  getAgentsByOwner,
  getTasksByCreator
} from '@/lib/supabaseStore';

interface DataContextType {
  // Data
  agents: Agent[];
  tasks: Task[];
  bids: Bid[];
  transactions: Transaction[];
  completions: Completion[];
  reputationEvents: ReputationEvent[];
  skills: string[];
  
  // Loading states
  loading: boolean;
  
  // Refresh functions
  refreshAgents: () => void;
  refreshTasks: () => void;
  refreshBids: () => void;
  refreshAll: () => void;
  ensureLoaded: () => Promise<void>;
  
  // CRUD operations (now async)
  createAgentData: (agentData: Omit<Agent, 'id' | 'ownerAddress' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>, ownerAddress: string) => Promise<Agent>;
  createTaskData: (taskData: Omit<Task, 'id' | 'creatorAddress' | 'status' | 'bidsCount' | 'createdAt'>, creatorAddress: string) => Promise<Task>;
  createTaskAsAgentData: (taskData: Omit<Task, 'id' | 'creatorAddress' | 'creatorType' | 'creatorAgentId' | 'status' | 'bidsCount' | 'createdAt'>, agentId: string, ownerAddress: string) => Promise<Task>;
  createBidData: (bidData: Omit<Bid, 'id' | 'createdAt'>) => Promise<Bid>;
  updateAgentData: (id: string, updates: Partial<Agent>) => Promise<Agent | null>;
  updateTaskData: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteAgentData: (id: string) => Promise<boolean>;
  deleteTaskData: (id: string) => Promise<boolean>;
  acceptBidData: (bidId: string) => Promise<boolean>;
  
  // Getters (async)
  getAgent: (id: string) => Promise<Agent | null>;
  getTask: (id: string) => Promise<Task | null>;
  getTaskBids: (taskId: string) => Promise<Bid[]>;
  getAgentBids: (agentId: string) => Promise<Bid[]>;
  getAgentCompletions: (agentId: string) => Promise<Completion[]>;
  getAgentReputationEvents: (agentId: string) => Promise<ReputationEvent[]>;
  getAgentsByOwnerAddress: (ownerAddress: string) => Promise<Agent[]>;
  getTasksByCreatorAddress: (creatorAddress: string) => Promise<Task[]>;
  
  // Search functions (async)
  searchAgentsData: (query?: string, skills?: string[]) => Promise<Agent[]>;
  searchTasksData: (query?: string, skills?: string[], status?: Task['status']) => Promise<Task[]>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [reputationEvents, setReputationEvents] = useState<ReputationEvent[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  const refreshAgents = useCallback(async () => {
    try { setAgents(await getAgents()); } catch (e) { console.error('Failed to refresh agents:', e); }
  }, []);

  const refreshTasks = useCallback(async () => {
    try { setTasks(await getTasks()); } catch (e) { console.error('Failed to refresh tasks:', e); }
  }, []);

  const refreshBids = useCallback(async () => {
    try { setBids(await getBids()); } catch (e) { console.error('Failed to refresh bids:', e); }
  }, []);

  const refreshTransactions = useCallback(async () => {
    try { setTransactions(await getTransactions()); } catch (e) { console.error('Failed to refresh transactions:', e); }
  }, []);

  const refreshCompletions = useCallback(async () => {
    try { setCompletions(await getCompletions()); } catch (e) { console.error('Failed to refresh completions:', e); }
  }, []);

  const refreshReputationEvents = useCallback(async () => {
    try { setReputationEvents(await getReputationEvents()); } catch (e) { console.error('Failed to refresh reputation:', e); }
  }, []);

  const refreshSkills = useCallback(async () => {
    try { setSkills(await getAllSkills()); } catch (e) { console.error('Failed to refresh skills:', e); }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshAgents(),
      refreshTasks(),
      refreshBids(),
      refreshTransactions(),
      refreshCompletions(),
      refreshReputationEvents(),
      refreshSkills(),
    ]);
  }, [refreshAgents, refreshTasks, refreshBids, refreshTransactions, refreshCompletions, refreshReputationEvents, refreshSkills]);

  const ensureLoaded = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    setLoading(true);
    await refreshAll();
    setLoading(false);
  }, [refreshAll]);

  const createAgentData = useCallback(async (agentData: Omit<Agent, 'id' | 'ownerAddress' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>, ownerAddress: string) => {
    const newAgent = await createAgent(agentData, ownerAddress);
    await refreshAgents();
    await refreshSkills();
    return newAgent;
  }, [refreshAgents, refreshSkills]);

  const createTaskData = useCallback(async (taskData: Omit<Task, 'id' | 'creatorAddress' | 'status' | 'bidsCount' | 'createdAt'>, creatorAddress: string) => {
    const newTask = await createTask(taskData, creatorAddress);
    await refreshTasks();
    await refreshSkills();
    return newTask;
  }, [refreshTasks, refreshSkills]);

  const createTaskAsAgentData = useCallback(async (taskData: Omit<Task, 'id' | 'creatorAddress' | 'creatorType' | 'creatorAgentId' | 'status' | 'bidsCount' | 'createdAt'>, agentId: string, ownerAddress: string) => {
    const newTask = await createTaskAsAgent(taskData, agentId, ownerAddress);
    await refreshTasks();
    await refreshSkills();
    return newTask;
  }, [refreshTasks, refreshSkills]);

  const createBidData = useCallback(async (bidData: Omit<Bid, 'id' | 'createdAt'>) => {
    const newBid = await createBid(bidData);
    await refreshBids();
    await refreshTasks();
    return newBid;
  }, [refreshBids, refreshTasks]);

  const updateAgentData = useCallback(async (id: string, updates: Partial<Agent>) => {
    const updatedAgent = await updateAgent(id, updates);
    await refreshAgents();
    return updatedAgent;
  }, [refreshAgents]);

  const updateTaskData = useCallback(async (id: string, updates: Partial<Task>) => {
    const updatedTask = await updateTask(id, updates);
    await refreshTasks();
    return updatedTask;
  }, [refreshTasks]);

  const deleteAgentData = useCallback(async (id: string) => {
    const success = await deleteAgent(id);
    if (success) await refreshAgents();
    return success;
  }, [refreshAgents]);

  const deleteTaskData = useCallback(async (id: string) => {
    const success = await deleteTask(id);
    if (success) await refreshTasks();
    return success;
  }, [refreshTasks]);

  const acceptBidData = useCallback(async (bidId: string) => {
    const success = await acceptBid(bidId);
    if (success) {
      await refreshTasks();
      await refreshBids();
    }
    return success;
  }, [refreshTasks, refreshBids]);

  const getAgentCb = useCallback((id: string) => getAgentById(id), []);
  const getTaskCb = useCallback((id: string) => getTaskById(id), []);
  const getTaskBidsCb = useCallback((taskId: string) => getBidsForTask(taskId), []);
  const getAgentBidsCb = useCallback((agentId: string) => getBidsForAgent(agentId), []);
  const getAgentCompletionsCb = useCallback((agentId: string) => getCompletionsForAgent(agentId), []);
  const getAgentReputationEventsCb = useCallback((agentId: string) => getReputationEventsForAgent(agentId), []);
  const getAgentsByOwnerCb = useCallback((ownerAddress: string) => getAgentsByOwner(ownerAddress), []);
  const getTasksByCreatorCb = useCallback((creatorAddress: string) => getTasksByCreator(creatorAddress), []);

  const searchAgentsData = useCallback((query?: string, skills?: string[]) => searchAgents(query, skills), []);
  const searchTasksData = useCallback((query?: string, skills?: string[], status?: Task['status']) => searchTasks(query, skills, status), []);

  const value: DataContextType = {
    agents, tasks, bids, transactions, completions, reputationEvents, skills,
    loading,
    refreshAgents, refreshTasks, refreshBids, refreshAll, ensureLoaded,
    createAgentData, createTaskData, createTaskAsAgentData, createBidData,
    updateAgentData, updateTaskData,
    deleteAgentData, deleteTaskData, acceptBidData,
    getAgent: getAgentCb, getTask: getTaskCb,
    getTaskBids: getTaskBidsCb, getAgentBids: getAgentBidsCb,
    getAgentCompletions: getAgentCompletionsCb,
    getAgentReputationEvents: getAgentReputationEventsCb,
    getAgentsByOwnerAddress: getAgentsByOwnerCb,
    getTasksByCreatorAddress: getTasksByCreatorCb,
    searchAgentsData, searchTasksData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
