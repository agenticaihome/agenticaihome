/**
 * Agent Composability / Chains System for AgenticAiHome
 * 
 * Users can create "chains" — sequences of agents that execute tasks in order.
 * Output of Agent A feeds into Agent B feeds into Agent C, etc.
 */

import { Agent } from './types';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ChainStep {
  id: string;
  chainId: string;
  stepNumber: number;
  agentId: string;
  agentName: string;
  agentSkills: string[];
  taskDescription: string;
  inputMapping: InputMapping;
  outputFormat: 'text' | 'json' | 'file' | 'structured';
  estimatedDurationHours: number;
  budgetErg: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: ChainStepResult;
  startedAt?: string;
  completedAt?: string;
}

export interface InputMapping {
  // Maps previous step outputs to current step inputs
  fromStep?: number; // Which step to get input from (null = chain input)
  inputType: 'text' | 'json' | 'file_url' | 'structured_data';
  transformRules?: string; // Optional transformation instructions
  customInput?: string; // Override input for this step
}

export interface ChainStepResult {
  output: any; // The actual output data
  outputType: 'text' | 'json' | 'file_url' | 'structured_data';
  metadata: {
    executionTimeMs: number;
    tokensUsed?: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    agentRating: number;
  };
  artifacts?: string[]; // URLs or file paths to generated artifacts
}

export interface Chain {
  id: string;
  name: string;
  description: string;
  category: ChainCategory;
  creatorAddress: string;
  creatorName?: string;
  steps: ChainStep[];
  tags: string[];
  isTemplate: boolean;
  isPublic: boolean;
  totalBudgetErg: number;
  estimatedDurationHours: number;
  status: 'draft' | 'active' | 'running' | 'completed' | 'failed' | 'archived';
  executions: number;
  successRate: number;
  avgRating: number;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
}

export interface ChainExecution {
  id: string;
  chainId: string;
  chainName: string;
  executorAddress: string;
  executorName?: string;
  initialInput: any;
  currentStepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt?: string;
  totalCostErg: number;
  results: ChainExecutionResult;
  errorLog?: string[];
}

export interface ChainExecutionResult {
  stepResults: ChainStepResult[];
  finalOutput: any;
  finalOutputType: 'text' | 'json' | 'file_url' | 'structured_data';
  totalExecutionTimeMs: number;
  qualityScore: number; // Overall quality based on step results
  userRating?: number; // User's satisfaction rating (1-5)
  userFeedback?: string;
}

export interface ChainTemplate {
  id: string;
  name: string;
  description: string;
  category: ChainCategory;
  steps: ChainTemplateStep[];
  tags: string[];
  usageCount: number;
  avgRating: number;
  createdBy: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCost: { min: number; max: number };
  estimatedDuration: { min: number; max: number };
}

export interface ChainTemplateStep {
  stepNumber: number;
  title: string;
  description: string;
  requiredSkills: string[];
  suggestedAgentTypes: string[];
  inputDescription: string;
  outputDescription: string;
  outputFormat: 'text' | 'json' | 'file' | 'structured';
  estimatedDurationHours: number;
  suggestedBudgetErg: number;
}

export type ChainCategory = 
  | 'research'
  | 'content-creation' 
  | 'data-processing'
  | 'development'
  | 'marketing'
  | 'analysis'
  | 'automation'
  | 'creative'
  | 'business'
  | 'custom';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  CHAINS: 'aih_chains',
  CHAIN_EXECUTIONS: 'aih_chain_executions',
  CHAIN_TEMPLATES: 'aih_chain_templates'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `chain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// CHAIN TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES: ChainTemplate[] = [
  {
    id: 'research-write-edit',
    name: 'Research → Write → Edit',
    description: 'Complete content creation pipeline: research a topic, write content, then edit and polish',
    category: 'content-creation',
    steps: [
      {
        stepNumber: 1,
        title: 'Research',
        description: 'Research the topic and gather relevant information',
        requiredSkills: ['research', 'web-scraping', 'fact-checking'],
        suggestedAgentTypes: ['Research Agent', 'Data Analyst'],
        inputDescription: 'Topic or research question',
        outputDescription: 'Research summary with key findings and sources',
        outputFormat: 'structured',
        estimatedDurationHours: 2,
        suggestedBudgetErg: 5
      },
      {
        stepNumber: 2,
        title: 'Write Content',
        description: 'Create engaging content based on research findings',
        requiredSkills: ['writing', 'content-creation', 'storytelling'],
        suggestedAgentTypes: ['Writer', 'Content Creator'],
        inputDescription: 'Research summary and content requirements',
        outputDescription: 'Draft content (article, blog post, etc.)',
        outputFormat: 'text',
        estimatedDurationHours: 3,
        suggestedBudgetErg: 8
      },
      {
        stepNumber: 3,
        title: 'Edit & Polish',
        description: 'Edit content for clarity, style, and engagement',
        requiredSkills: ['editing', 'proofreading', 'copywriting'],
        suggestedAgentTypes: ['Editor', 'Copywriter'],
        inputDescription: 'Draft content to be edited',
        outputDescription: 'Final polished content ready for publication',
        outputFormat: 'text',
        estimatedDurationHours: 1,
        suggestedBudgetErg: 4
      }
    ],
    tags: ['content', 'research', 'writing', 'editing'],
    usageCount: 0,
    avgRating: 0,
    createdBy: 'AgenticAiHome',
    difficulty: 'beginner',
    estimatedCost: { min: 15, max: 25 },
    estimatedDuration: { min: 5, max: 8 }
  },
  {
    id: 'scrape-analyze-report',
    name: 'Scrape → Analyze → Report',
    description: 'Data pipeline: scrape data from sources, analyze patterns, generate insights report',
    category: 'data-processing',
    steps: [
      {
        stepNumber: 1,
        title: 'Data Scraping',
        description: 'Extract data from specified sources (websites, APIs, databases)',
        requiredSkills: ['web-scraping', 'data-extraction', 'python'],
        suggestedAgentTypes: ['Data Scraper', 'API Specialist'],
        inputDescription: 'Data sources and extraction requirements',
        outputDescription: 'Raw extracted data in structured format',
        outputFormat: 'json',
        estimatedDurationHours: 4,
        suggestedBudgetErg: 10
      },
      {
        stepNumber: 2,
        title: 'Data Analysis',
        description: 'Analyze extracted data to identify patterns and insights',
        requiredSkills: ['data-analysis', 'statistics', 'python', 'machine-learning'],
        suggestedAgentTypes: ['Data Analyst', 'ML Engineer'],
        inputDescription: 'Structured data ready for analysis',
        outputDescription: 'Analysis results with key findings and visualizations',
        outputFormat: 'structured',
        estimatedDurationHours: 6,
        suggestedBudgetErg: 15
      },
      {
        stepNumber: 3,
        title: 'Report Generation',
        description: 'Create executive summary and detailed report of findings',
        requiredSkills: ['reporting', 'data-visualization', 'business-intelligence'],
        suggestedAgentTypes: ['Business Analyst', 'Report Writer'],
        inputDescription: 'Analysis results and visualization data',
        outputDescription: 'Professional report with executive summary',
        outputFormat: 'file',
        estimatedDurationHours: 3,
        suggestedBudgetErg: 8
      }
    ],
    tags: ['data', 'analysis', 'scraping', 'reporting'],
    usageCount: 0,
    avgRating: 0,
    createdBy: 'AgenticAiHome',
    difficulty: 'intermediate',
    estimatedCost: { min: 30, max: 45 },
    estimatedDuration: { min: 10, max: 15 }
  },
  {
    id: 'market-research-strategy',
    name: 'Market Research → Strategy → Implementation Plan',
    description: 'Business strategy pipeline: research market, develop strategy, create implementation roadmap',
    category: 'business',
    steps: [
      {
        stepNumber: 1,
        title: 'Market Research',
        description: 'Comprehensive market analysis including competitors and opportunities',
        requiredSkills: ['market-research', 'competitive-analysis', 'business-intelligence'],
        suggestedAgentTypes: ['Market Researcher', 'Business Analyst'],
        inputDescription: 'Industry, target market, and business context',
        outputDescription: 'Market research report with competitive landscape',
        outputFormat: 'structured',
        estimatedDurationHours: 8,
        suggestedBudgetErg: 20
      },
      {
        stepNumber: 2,
        title: 'Strategy Development',
        description: 'Develop business strategy based on market insights',
        requiredSkills: ['strategy', 'business-planning', 'strategic-thinking'],
        suggestedAgentTypes: ['Strategy Consultant', 'Business Strategist'],
        inputDescription: 'Market research findings and business objectives',
        outputDescription: 'Strategic plan with goals and key initiatives',
        outputFormat: 'structured',
        estimatedDurationHours: 6,
        suggestedBudgetErg: 25
      },
      {
        stepNumber: 3,
        title: 'Implementation Planning',
        description: 'Create detailed roadmap and action plan for strategy execution',
        requiredSkills: ['project-management', 'planning', 'business-operations'],
        suggestedAgentTypes: ['Project Manager', 'Operations Consultant'],
        inputDescription: 'Strategic plan and organizational context',
        outputDescription: 'Implementation roadmap with timelines and milestones',
        outputFormat: 'structured',
        estimatedDurationHours: 4,
        suggestedBudgetErg: 15
      }
    ],
    tags: ['business', 'strategy', 'planning', 'consulting'],
    usageCount: 0,
    avgRating: 0,
    createdBy: 'AgenticAiHome',
    difficulty: 'advanced',
    estimatedCost: { min: 55, max: 75 },
    estimatedDuration: { min: 15, max: 20 }
  }
];

// Initialize templates
function initializeTemplates() {
  const existingTemplates = getChainTemplates();
  if (existingTemplates.length === 0) {
    saveToStorage(STORAGE_KEYS.CHAIN_TEMPLATES, DEFAULT_TEMPLATES);
  }
}

// ============================================================================
// CHAIN TEMPLATE FUNCTIONS
// ============================================================================

export function getChainTemplates(): ChainTemplate[] {
  initializeTemplates();
  return getFromStorage<ChainTemplate>(STORAGE_KEYS.CHAIN_TEMPLATES);
}

export function getChainTemplateById(templateId: string): ChainTemplate | null {
  const templates = getChainTemplates();
  return templates.find(t => t.id === templateId) || null;
}

export function getChainTemplatesByCategory(category: ChainCategory): ChainTemplate[] {
  const templates = getChainTemplates();
  return templates.filter(t => t.category === category);
}

export function createChainFromTemplate(
  templateId: string, 
  creatorAddress: string,
  customName?: string,
  customBudgets?: number[]
): Chain {
  const template = getChainTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const steps: ChainStep[] = template.steps.map((stepTemplate, index) => ({
    id: `step-${generateId()}`,
    chainId: '', // Will be set after chain creation
    stepNumber: stepTemplate.stepNumber,
    agentId: '', // To be assigned when executing
    agentName: '',
    agentSkills: stepTemplate.requiredSkills,
    taskDescription: stepTemplate.description,
    inputMapping: {
      fromStep: index === 0 ? undefined : index,
      inputType: index === 0 ? 'text' : 'structured_data',
    },
    outputFormat: stepTemplate.outputFormat,
    estimatedDurationHours: stepTemplate.estimatedDurationHours,
    budgetErg: customBudgets?.[index] || stepTemplate.suggestedBudgetErg,
    status: 'pending'
  }));

  const totalBudget = steps.reduce((sum, step) => sum + step.budgetErg, 0);
  const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDurationHours, 0);

  const chain: Chain = {
    id: generateId(),
    name: customName || template.name,
    description: template.description,
    category: template.category,
    creatorAddress,
    steps,
    tags: template.tags,
    isTemplate: false,
    isPublic: false,
    totalBudgetErg: totalBudget,
    estimatedDurationHours: totalDuration,
    status: 'draft',
    executions: 0,
    successRate: 0,
    avgRating: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Update step chainIds
  steps.forEach(step => {
    step.chainId = chain.id;
  });
  chain.steps = steps;

  const chains = getChains();
  chains.push(chain);
  saveToStorage(STORAGE_KEYS.CHAINS, chains);

  return chain;
}

// ============================================================================
// CHAIN MANAGEMENT
// ============================================================================

export function getChains(): Chain[] {
  return getFromStorage<Chain>(STORAGE_KEYS.CHAINS);
}

export function getChainById(chainId: string): Chain | null {
  const chains = getChains();
  return chains.find(c => c.id === chainId) || null;
}

export function getChainsByCreator(creatorAddress: string): Chain[] {
  const chains = getChains();
  return chains.filter(c => c.creatorAddress === creatorAddress);
}

export function getPublicChains(): Chain[] {
  const chains = getChains();
  return chains.filter(c => c.isPublic && !c.isTemplate);
}

export function createCustomChain(
  chainData: Omit<Chain, 'id' | 'steps' | 'executions' | 'successRate' | 'avgRating' | 'createdAt' | 'updatedAt' | 'status'>
): Chain {
  const chain: Chain = {
    ...chainData,
    id: generateId(),
    steps: [],
    executions: 0,
    successRate: 0,
    avgRating: 0,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const chains = getChains();
  chains.push(chain);
  saveToStorage(STORAGE_KEYS.CHAINS, chains);

  return chain;
}

export function addChainStep(
  chainId: string,
  stepData: Omit<ChainStep, 'id' | 'chainId' | 'stepNumber' | 'status'>
): ChainStep {
  const chains = getChains();
  const chainIndex = chains.findIndex(c => c.id === chainId);
  
  if (chainIndex === -1) {
    throw new Error('Chain not found');
  }

  const chain = chains[chainIndex];
  const stepNumber = chain.steps.length + 1;

  const newStep: ChainStep = {
    ...stepData,
    id: `step-${generateId()}`,
    chainId,
    stepNumber,
    status: 'pending'
  };

  chain.steps.push(newStep);
  chain.totalBudgetErg += newStep.budgetErg;
  chain.estimatedDurationHours += newStep.estimatedDurationHours;
  chain.updatedAt = new Date().toISOString();

  chains[chainIndex] = chain;
  saveToStorage(STORAGE_KEYS.CHAINS, chains);

  return newStep;
}

export function updateChainStep(
  chainId: string,
  stepId: string,
  updates: Partial<ChainStep>
): ChainStep {
  const chains = getChains();
  const chainIndex = chains.findIndex(c => c.id === chainId);
  
  if (chainIndex === -1) {
    throw new Error('Chain not found');
  }

  const chain = chains[chainIndex];
  const stepIndex = chain.steps.findIndex(s => s.id === stepId);
  
  if (stepIndex === -1) {
    throw new Error('Step not found');
  }

  const oldBudget = chain.steps[stepIndex].budgetErg;
  const oldDuration = chain.steps[stepIndex].estimatedDurationHours;

  chain.steps[stepIndex] = { ...chain.steps[stepIndex], ...updates };
  
  // Recalculate totals if budget or duration changed
  if (updates.budgetErg !== undefined || updates.estimatedDurationHours !== undefined) {
    const newBudget = updates.budgetErg || chain.steps[stepIndex].budgetErg;
    const newDuration = updates.estimatedDurationHours || chain.steps[stepIndex].estimatedDurationHours;
    
    chain.totalBudgetErg = chain.totalBudgetErg - oldBudget + newBudget;
    chain.estimatedDurationHours = chain.estimatedDurationHours - oldDuration + newDuration;
  }

  chain.updatedAt = new Date().toISOString();
  chains[chainIndex] = chain;
  saveToStorage(STORAGE_KEYS.CHAINS, chains);

  return chain.steps[stepIndex];
}

export function deleteChain(chainId: string): boolean {
  const chains = getChains();
  const filteredChains = chains.filter(c => c.id !== chainId);
  
  if (filteredChains.length === chains.length) {
    return false; // Chain not found
  }

  saveToStorage(STORAGE_KEYS.CHAINS, filteredChains);
  return true;
}

// ============================================================================
// CHAIN EXECUTION
// ============================================================================

export function getChainExecutions(): ChainExecution[] {
  return getFromStorage<ChainExecution>(STORAGE_KEYS.CHAIN_EXECUTIONS);
}

export function getChainExecutionById(executionId: string): ChainExecution | null {
  const executions = getChainExecutions();
  return executions.find(e => e.id === executionId) || null;
}

export function getExecutionsForChain(chainId: string): ChainExecution[] {
  const executions = getChainExecutions();
  return executions.filter(e => e.chainId === chainId);
}

export function startChainExecution(
  chainId: string,
  executorAddress: string,
  initialInput: any,
  executorName?: string
): ChainExecution {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error('Chain not found');
  }

  if (chain.status !== 'active') {
    throw new Error('Chain is not active');
  }

  const execution: ChainExecution = {
    id: `exec-${generateId()}`,
    chainId,
    chainName: chain.name,
    executorAddress,
    executorName,
    initialInput,
    currentStepIndex: 0,
    status: 'pending',
    startedAt: new Date().toISOString(),
    totalCostErg: 0,
    results: {
      stepResults: [],
      finalOutput: null,
      finalOutputType: 'text',
      totalExecutionTimeMs: 0,
      qualityScore: 0
    },
    errorLog: []
  };

  const executions = getChainExecutions();
  executions.push(execution);
  saveToStorage(STORAGE_KEYS.CHAIN_EXECUTIONS, executions);

  return execution;
}

export function updateChainExecution(
  executionId: string,
  updates: Partial<ChainExecution>
): ChainExecution {
  const executions = getChainExecutions();
  const executionIndex = executions.findIndex(e => e.id === executionId);
  
  if (executionIndex === -1) {
    throw new Error('Execution not found');
  }

  executions[executionIndex] = { ...executions[executionIndex], ...updates };
  saveToStorage(STORAGE_KEYS.CHAIN_EXECUTIONS, executions);

  return executions[executionIndex];
}

// ============================================================================
// CHAIN STATISTICS
// ============================================================================

export interface ChainStatistics {
  totalChains: number;
  activeChains: number;
  totalExecutions: number;
  successfulExecutions: number;
  avgExecutionTime: number;
  popularCategories: { category: ChainCategory; count: number }[];
  topPerformingChains: { chainId: string; name: string; successRate: number; executions: number }[];
}

export function getChainStatistics(): ChainStatistics {
  const chains = getChains();
  const executions = getChainExecutions();

  const totalChains = chains.length;
  const activeChains = chains.filter(c => c.status === 'active').length;
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === 'completed').length;

  const completedExecutions = executions.filter(e => e.status === 'completed');
  const avgExecutionTime = completedExecutions.length > 0 
    ? completedExecutions.reduce((sum, e) => sum + e.results.totalExecutionTimeMs, 0) / completedExecutions.length 
    : 0;

  // Popular categories
  const categoryCount: Record<string, number> = {};
  chains.forEach(chain => {
    categoryCount[chain.category] = (categoryCount[chain.category] || 0) + 1;
  });
  
  const popularCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category: category as ChainCategory, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top performing chains
  const topPerformingChains = chains
    .filter(c => c.executions > 0)
    .map(c => ({
      chainId: c.id,
      name: c.name,
      successRate: c.successRate,
      executions: c.executions
    }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return {
    totalChains,
    activeChains,
    totalExecutions,
    successfulExecutions,
    avgExecutionTime,
    popularCategories,
    topPerformingChains
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function validateChain(chain: Chain): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!chain.name || chain.name.trim().length === 0) {
    errors.push('Chain name is required');
  }

  if (chain.steps.length === 0) {
    errors.push('Chain must have at least one step');
  }

  if (chain.totalBudgetErg <= 0) {
    errors.push('Total budget must be greater than 0');
  }

  // Validate step sequence
  for (let i = 0; i < chain.steps.length; i++) {
    const step = chain.steps[i];
    
    if (step.stepNumber !== i + 1) {
      errors.push(`Step ${i + 1} has incorrect step number`);
    }

    if (i > 0 && step.inputMapping.fromStep === undefined && !step.inputMapping.customInput) {
      errors.push(`Step ${i + 1} needs input mapping or custom input`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function estimateChainCost(steps: ChainStep[]): { min: number; max: number } {
  const totalBudget = steps.reduce((sum, step) => sum + step.budgetErg, 0);
  return {
    min: totalBudget * 0.8, // 20% discount for bulk
    max: totalBudget * 1.2  // 20% markup for complexity
  };
}

export function getChainCategories(): ChainCategory[] {
  return [
    'research',
    'content-creation',
    'data-processing',
    'development',
    'marketing',
    'analysis',
    'automation',
    'creative',
    'business',
    'custom'
  ];
}