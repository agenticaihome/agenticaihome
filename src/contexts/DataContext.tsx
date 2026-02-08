'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  getAllSkills
} from '@/lib/store';

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
  
  // CRUD operations
  createAgentData: (agentData: Omit<Agent, 'id' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>) => Agent;
  createTaskData: (taskData: Omit<Task, 'id' | 'status' | 'bidsCount' | 'createdAt'>) => Task;
  createBidData: (bidData: Omit<Bid, 'id' | 'createdAt'>) => Bid;
  updateAgentData: (id: string, updates: Partial<Agent>) => Agent | null;
  updateTaskData: (id: string, updates: Partial<Task>) => Task | null;
  deleteAgentData: (id: string) => boolean;
  deleteTaskData: (id: string) => boolean;
  acceptBidData: (bidId: string) => boolean;
  
  // Getters
  getAgent: (id: string) => Agent | null;
  getTask: (id: string) => Task | null;
  getTaskBids: (taskId: string) => Bid[];
  getAgentBids: (agentId: string) => Bid[];
  getAgentCompletions: (agentId: string) => Completion[];
  getAgentReputationEvents: (agentId: string) => ReputationEvent[];
  
  // Search functions
  searchAgentsData: (query?: string, skills?: string[]) => Agent[];
  searchTasksData: (query?: string, skills?: string[], status?: Task['status']) => Task[];
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
  const [loading, setLoading] = useState(true);

  // Refresh functions
  const refreshAgents = useCallback(() => {
    setAgents(getAgents());
  }, []);

  const refreshTasks = useCallback(() => {
    setTasks(getTasks());
  }, []);

  const refreshBids = useCallback(() => {
    setBids(getBids());
  }, []);

  const refreshTransactions = useCallback(() => {
    setTransactions(getTransactions());
  }, []);

  const refreshCompletions = useCallback(() => {
    setCompletions(getCompletions());
  }, []);

  const refreshReputationEvents = useCallback(() => {
    setReputationEvents(getReputationEvents());
  }, []);

  const refreshSkills = useCallback(() => {
    setSkills(getAllSkills());
  }, []);

  const refreshAll = useCallback(() => {
    refreshAgents();
    refreshTasks();
    refreshBids();
    refreshTransactions();
    refreshCompletions();
    refreshReputationEvents();
    refreshSkills();
  }, [refreshAgents, refreshTasks, refreshBids, refreshTransactions, refreshCompletions, refreshReputationEvents, refreshSkills]);

  // Load initial data
  useEffect(() => {
    refreshAll();
    setLoading(false);
  }, [refreshAll]);

  // CRUD operations with state updates
  const createAgentData = useCallback((agentData: Omit<Agent, 'id' | 'egoScore' | 'tasksCompleted' | 'rating' | 'status' | 'createdAt' | 'probationCompleted' | 'probationTasksRemaining' | 'suspendedUntil' | 'anomalyScore' | 'maxTaskValue' | 'velocityWindow' | 'tier' | 'disputesWon' | 'disputesLost' | 'consecutiveDisputesLost' | 'completionRate' | 'lastActivityAt'>) => {
    const newAgent = createAgent(agentData);
    refreshAgents();
    refreshSkills();
    return newAgent;
  }, [refreshAgents, refreshSkills]);

  const createTaskData = useCallback((taskData: Omit<Task, 'id' | 'status' | 'bidsCount' | 'createdAt'>) => {
    const newTask = createTask(taskData);
    refreshTasks();
    refreshSkills();
    return newTask;
  }, [refreshTasks, refreshSkills]);

  const createBidData = useCallback((bidData: Omit<Bid, 'id' | 'createdAt'>) => {
    const newBid = createBid(bidData);
    refreshBids();
    refreshTasks(); // Refresh tasks to update bid count
    return newBid;
  }, [refreshBids, refreshTasks]);

  const updateAgentData = useCallback((id: string, updates: Partial<Agent>) => {
    const updatedAgent = updateAgent(id, updates);
    refreshAgents();
    return updatedAgent;
  }, [refreshAgents]);

  const updateTaskData = useCallback((id: string, updates: Partial<Task>) => {
    const updatedTask = updateTask(id, updates);
    refreshTasks();
    return updatedTask;
  }, [refreshTasks]);

  const deleteAgentData = useCallback((id: string) => {
    const success = deleteAgent(id);
    if (success) {
      refreshAgents();
    }
    return success;
  }, [refreshAgents]);

  const deleteTaskData = useCallback((id: string) => {
    const success = deleteTask(id);
    if (success) {
      refreshTasks();
    }
    return success;
  }, [refreshTasks]);

  const acceptBidData = useCallback((bidId: string) => {
    const success = acceptBid(bidId);
    if (success) {
      refreshTasks();
      refreshBids();
    }
    return success;
  }, [refreshTasks, refreshBids]);

  // Getters
  const getAgent = useCallback((id: string) => getAgentById(id), []);
  const getTask = useCallback((id: string) => getTaskById(id), []);
  const getTaskBids = useCallback((taskId: string) => getBidsForTask(taskId), []);
  const getAgentBids = useCallback((agentId: string) => getBidsForAgent(agentId), []);
  const getAgentCompletions = useCallback((agentId: string) => getCompletionsForAgent(agentId), []);
  const getAgentReputationEvents = useCallback((agentId: string) => getReputationEventsForAgent(agentId), []);

  // Search functions
  const searchAgentsData = useCallback((query?: string, skills?: string[]) => searchAgents(query, skills), []);
  const searchTasksData = useCallback((query?: string, skills?: string[], status?: Task['status']) => searchTasks(query, skills, status), []);

  const value: DataContextType = {
    // Data
    agents,
    tasks,
    bids,
    transactions,
    completions,
    reputationEvents,
    skills,
    
    // Loading state
    loading,
    
    // Refresh functions
    refreshAgents,
    refreshTasks,
    refreshBids,
    refreshAll,
    
    // CRUD operations
    createAgentData,
    createTaskData,
    createBidData,
    updateAgentData,
    updateTaskData,
    deleteAgentData,
    deleteTaskData,
    acceptBidData,
    
    // Getters
    getAgent,
    getTask,
    getTaskBids,
    getAgentBids,
    getAgentCompletions,
    getAgentReputationEvents,
    
    // Search functions
    searchAgentsData,
    searchTasksData
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