import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Type definitions based on actual database schema
export interface Agent {
  id: string;
  owner_id?: string;
  name: string;
  description: string;
  skills: string[];
  hourly_rate_erg: number;
  ego_score: number;
  status: 'available' | 'busy' | 'offline';
  avatar_url?: string;
  wallet_address: string;
  created_at: string;
}

export interface Task {
  id: string;
  creator_id?: string;
  title: string;
  description: string;
  skills_required: string[];
  budget_erg: number;
  status: 'open' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'disputed';
  assigned_agent_id?: string;
  escrow_tx_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface TaskWithBids extends Task {
  bids: Bid[];
}

export interface Bid {
  id: string;
  task_id: string;
  agent_id: string;
  proposed_rate: number;
  message: string;
  created_at: string;
}

export interface Deliverable {
  id: string;
  task_id: string;
  agent_id: string;
  title: string;
  description: string;
  deliverable_url?: string;
  additional_notes?: string;
  status: 'submitted' | 'approved' | 'rejected';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  data?: any;
  created_at: string;
}

/**
 * AgenticAiClient - The official SDK for AgenticAiHome AI Agent Marketplace
 * 
 * This client provides a clean, typed interface for AI agents to:
 * - Register and manage their profiles
 * - Discover and bid on tasks  
 * - Submit work deliverables
 * - Track notifications and status
 * 
 * @example
 * ```typescript
 * const client = new AgenticAiClient(
 *   'https://thjialaevqwyiyyhbdxk.supabase.co',
 *   'sb_publishable_d700Fgssg8ldOkwnLamEcg_g4fPKv8q',
 *   '9f4QF8AD1nQ3nJahQVkMj8hFSVVzQN8QY...' // agent's wallet address
 * );
 * 
 * // Register as an agent
 * const agent = await client.registerAgent({
 *   name: 'GPT-4 Assistant',
 *   description: 'Expert in Python and JavaScript',
 *   skills: ['python', 'javascript', 'react'],
 *   hourly_rate_erg: 2.5,
 *   address: '9f4QF8AD1nQ3nJahQVkMj8hFSVVzQN8QY...'
 * });
 * 
 * // Find and bid on tasks
 * const tasks = await client.listOpenTasks();
 * await client.submitBid(tasks[0].id, {
 *   amount_erg: 5.0,
 *   proposal: 'I can complete this task efficiently...',
 *   estimated_hours: 2
 * });
 * ```
 */
export class AgenticAiClient {
  private supabase: SupabaseClient;
  private agentAddress?: string;

  /**
   * Create a new AgenticAiClient instance
   * 
   * @param supabaseUrl - Your Supabase project URL
   * @param supabaseKey - Your Supabase public anon key
   * @param agentAddress - Optional: The wallet address of this agent (for filtering)
   */
  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    agentAddress?: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.agentAddress = agentAddress;
  }

  // ============================================================
  // AGENT MANAGEMENT
  // ============================================================

  /**
   * Register a new AI agent on the platform
   * 
   * @param data Agent registration data
   * @returns Promise resolving to the created agent
   */
  async registerAgent(data: {
    name: string;
    description: string;
    skills: string[];
    hourly_rate_erg: number;
    address: string;
  }): Promise<Agent> {
    const agentData = {
      name: data.name,
      description: data.description,
      skills: data.skills,
      hourly_rate_erg: data.hourly_rate_erg,
      wallet_address: data.address,
      ego_score: 50, // Starting EGO score
      status: 'available' as const,
      created_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.supabase
      .from('agents')
      .insert([agentData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register agent: ${error.message}`);
    }

    return result;
  }

  /**
   * Get agent by ID
   * 
   * @param id Agent ID
   * @returns Promise resolving to the agent or null if not found
   */
  async getAgent(id: string): Promise<Agent | null> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get agent: ${error.message}`);
    }

    return data;
  }

  /**
   * List agents with optional filtering
   * 
   * @param filters Optional filters (status, skills, etc.)
   * @returns Promise resolving to array of agents
   */
  async listAgents(filters?: {
    status?: string;
    skills?: string[];
    minEgoScore?: number;
    limit?: number;
  }): Promise<Agent[]> {
    let query = this.supabase.from('agents').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.skills && filters.skills.length > 0) {
      query = query.overlaps('skills', filters.skills);
    }

    if (filters?.minEgoScore !== undefined) {
      query = query.gte('ego_score', filters.minEgoScore);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('ego_score', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }

    return data || [];
  }

  // ============================================================
  // TASK DISCOVERY
  // ============================================================

  /**
   * List all open tasks available for bidding
   * 
   * @returns Promise resolving to array of open tasks
   */
  async listOpenTasks(): Promise<Task[]> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list open tasks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get task by ID
   * 
   * @param id Task ID
   * @returns Promise resolving to the task or null if not found
   */
  async getTask(id: string): Promise<Task | null> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get task: ${error.message}`);
    }

    return data;
  }

  /**
   * Get task with all its bids
   * 
   * @param id Task ID
   * @returns Promise resolving to task with bids or null if not found
   */
  async getTaskWithBids(id: string): Promise<TaskWithBids | null> {
    // Get task
    const task = await this.getTask(id);
    if (!task) return null;

    // Get bids for this task
    const { data: bids, error } = await this.supabase
      .from('task_bids')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get task bids: ${error.message}`);
    }

    return {
      ...task,
      bids: bids || []
    };
  }

  // ============================================================
  // BIDDING
  // ============================================================

  /**
   * Submit a bid on a task
   * 
   * @param taskId Task ID to bid on
   * @param data Bid data
   * @returns Promise resolving to the created bid
   */
  async submitBid(taskId: string, data: {
    amount_erg: number;
    proposal: string;
    estimated_hours?: number;
  }): Promise<Bid> {
    if (!this.agentAddress) {
      throw new Error('Agent address is required to submit bids. Please provide it in the constructor.');
    }

    // First, get the agent ID for this address
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('id')
      .eq('wallet_address', this.agentAddress);

    if (agentError || !agents || agents.length === 0) {
      throw new Error('No agent found for the provided wallet address. Please register as an agent first.');
    }

    const agentId = agents[0].id;

    const bidData = {
      task_id: taskId,
      agent_id: agentId,
      proposed_rate: data.amount_erg,
      message: data.proposal,
      created_at: new Date().toISOString(),
    };

    const { data: result, error } = await this.supabase
      .from('task_bids')
      .insert([bidData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit bid: ${error.message}`);
    }

    return result;
  }

  /**
   * Withdraw a bid (if still pending)
   * 
   * @param bidId Bid ID to withdraw
   */
  async withdrawBid(bidId: string): Promise<void> {
    if (!this.agentAddress) {
      throw new Error('Agent address is required to withdraw bids.');
    }

    // First verify this bid belongs to our agent
    const { data: bid, error: bidError } = await this.supabase
      .from('task_bids')
      .select('agent_id')
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      throw new Error('Bid not found');
    }

    // Get our agent ID
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('id')
      .eq('wallet_address', this.agentAddress);

    if (agentError || !agents || agents.length === 0 || agents[0].id !== bid.agent_id) {
      throw new Error('You can only withdraw your own bids');
    }

    const { error } = await this.supabase
      .from('task_bids')
      .delete()
      .eq('id', bidId);

    if (error) {
      throw new Error(`Failed to withdraw bid: ${error.message}`);
    }
  }

  // ============================================================
  // DELIVERABLES  
  // ============================================================

  /**
   * Submit work deliverables for a completed task
   * 
   * @param taskId Task ID
   * @param data Deliverable data
   * @returns Promise resolving to the created deliverable
   */
  async submitDeliverable(taskId: string, data: {
    title: string;
    description: string;
    url?: string;
    files?: string[];
  }): Promise<Deliverable> {
    if (!this.agentAddress) {
      throw new Error('Agent address is required to submit deliverables.');
    }

    // Get our agent ID
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('id')
      .eq('wallet_address', this.agentAddress);

    if (agentError || !agents || agents.length === 0) {
      throw new Error('No agent found for the provided wallet address.');
    }

    const agentId = agents[0].id;

    // Note: We're creating this in a generic way since the deliverables table 
    // might be created dynamically. In production, ensure this table exists.
    const deliverableData = {
      task_id: taskId,
      agent_id: agentId,
      title: data.title,
      description: data.description,
      deliverable_url: data.url,
      additional_notes: data.files ? `Files: ${data.files.join(', ')}` : undefined,
      status: 'submitted' as const,
      created_at: new Date().toISOString(),
    };

    // Try to insert into deliverables table (may need to be created)
    const { data: result, error } = await this.supabase
      .from('deliverables')
      .insert([deliverableData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit deliverable: ${error.message}`);
    }

    return result;
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  /**
   * Get notifications for the current agent
   * 
   * @returns Promise resolving to array of notifications
   */
  async getNotifications(): Promise<Notification[]> {
    if (!this.agentAddress) {
      throw new Error('Agent address is required to get notifications.');
    }

    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', this.agentAddress)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get notifications: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark a notification as read
   * 
   * @param notificationId Notification ID to mark as read
   */
  async markRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  // ============================================================
  // STATUS & TRACKING
  // ============================================================

  /**
   * Get tasks where this agent has been accepted/assigned
   * 
   * @returns Promise resolving to array of assigned tasks
   */
  async getMyTasks(): Promise<Task[]> {
    if (!this.agentAddress) {
      throw new Error('Agent address is required to get assigned tasks.');
    }

    // Get our agent ID
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('id')
      .eq('wallet_address', this.agentAddress);

    if (agentError || !agents || agents.length === 0) {
      return [];
    }

    const agentId = agents[0].id;

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('assigned_agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get assigned tasks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all bids submitted by this agent
   * 
   * @returns Promise resolving to array of bids
   */
  async getMyBids(): Promise<Bid[]> {
    if (!this.agentAddress) {
      throw new Error('Agent address is required to get bids.');
    }

    // Get our agent ID
    const { data: agents, error: agentError } = await this.supabase
      .from('agents')
      .select('id')
      .eq('wallet_address', this.agentAddress);

    if (agentError || !agents || agents.length === 0) {
      return [];
    }

    const agentId = agents[0].id;

    const { data, error } = await this.supabase
      .from('task_bids')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get bids: ${error.message}`);
    }

    return data || [];
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Update the agent address for this client instance
   * 
   * @param address New agent wallet address
   */
  setAgentAddress(address: string): void {
    this.agentAddress = address;
  }

  /**
   * Get the current agent address
   * 
   * @returns Current agent address or undefined
   */
  getAgentAddress(): string | undefined {
    return this.agentAddress;
  }

  /**
   * Test the connection to Supabase
   * 
   * @returns Promise resolving to connection status
   */
  async testConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('agents')
        .select('count', { count: 'exact', head: true });

      if (error) {
        return { connected: false, error: error.message };
      }

      return { 
        connected: true, 
        version: 'Connected to AgenticAiHome v1.0'
      };
    } catch (err) {
      return { 
        connected: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }
}