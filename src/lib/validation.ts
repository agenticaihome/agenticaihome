/**
 * COMPREHENSIVE INPUT VALIDATION SYSTEM
 * 
 * This module provides strict validation for all user inputs across the AgenticAI platform.
 * All validation functions return detailed error messages for better UX.
 */

import { sanitizeText, sanitizeErgoAddress, sanitizeNumber } from './sanitize';

// ====================================
// VALIDATION TYPES & INTERFACES
// ====================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

export interface TaskInput {
  title: string;
  description: string;
  budget: number;
  deadline: string | Date;
  skills?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgentInput {
  name: string;
  description: string;
  category: string;
  skills: string[];
  pricingModel: 'fixed' | 'hourly' | 'milestone';
  hourlyRate?: number;
  ergoAddress: string;
  availability?: 'full-time' | 'part-time' | 'contract';
}

export interface BidInput {
  amount: number;
  proposal: string;
  timeline?: string;
  agentId: string;
  taskId: string;
}

export interface DeliverableInput {
  content?: string;
  url?: string;
  description?: string;
  taskId: string;
  agentId: string;
}

export interface ChainInput {
  name: string;
  description: string;
  steps: Array<{
    title: string;
    description: string;
    skillsRequired: string[];
  }>;
  totalBudget: number;
}

// ====================================
// BASE58 VALIDATION FOR ERGO ADDRESSES
// ====================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function isValidBase58(text: string): boolean {
  if (typeof text !== 'string' || text.length === 0) return false;
  
  for (let i = 0; i < text.length; i++) {
    if (BASE58_ALPHABET.indexOf(text[i]) === -1) {
      return false;
    }
  }
  return true;
}

function base58Decode(input: string): Uint8Array | null {
  try {
    const base = BASE58_ALPHABET.length;
    const bytes: number[] = [];
    let carry = 0;
    let carryBits = 0;
    
    for (const char of input) {
      const value = BASE58_ALPHABET.indexOf(char);
      if (value === -1) return null;
      
      carry += value * Math.pow(base, input.length - input.indexOf(char) - 1);
    }
    
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
    
    return new Uint8Array(bytes.reverse());
  } catch {
    return null;
  }
}

// ====================================
// INDIVIDUAL VALIDATORS
// ====================================

/**
 * Validate task creation input
 */
export function validateTaskInput(data: Partial<TaskInput>): ValidationResult {
  const errors: string[] = [];
  
  // Title validation
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required');
  } else {
    const titleLength = data.title.trim().length;
    if (titleLength < 3) {
      errors.push('Title must be at least 3 characters long');
    } else if (titleLength > 200) {
      errors.push('Title must be no more than 200 characters long');
    }
  }
  
  // Description validation
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else {
    const descLength = data.description.trim().length;
    if (descLength < 10) {
      errors.push('Description must be at least 10 characters long');
    } else if (descLength > 5000) {
      errors.push('Description must be no more than 5000 characters long');
    }
  }
  
  // Budget validation
  if (data.budget === undefined || data.budget === null) {
    errors.push('Budget is required');
  } else {
    const budget = sanitizeNumber(data.budget, 0.01, 10000);
    if (budget < 0.01) {
      errors.push('Budget must be at least 0.01 ERG');
    } else if (budget > 10000) {
      errors.push('Budget cannot exceed 10,000 ERG');
    }
  }
  
  // Deadline validation
  if (!data.deadline) {
    errors.push('Deadline is required');
  } else {
    const deadline = new Date(data.deadline);
    const now = new Date();
    if (isNaN(deadline.getTime())) {
      errors.push('Invalid deadline format');
    } else if (deadline <= now) {
      errors.push('Deadline must be in the future');
    } else if (deadline > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
      errors.push('Deadline cannot be more than 1 year from now');
    }
  }
  
  // Skills validation (optional)
  if (data.skills && !Array.isArray(data.skills)) {
    errors.push('Skills must be an array');
  } else if (data.skills && data.skills.length > 10) {
    errors.push('Maximum 10 skills allowed');
  }
  
  const sanitizedData = {
    title: data.title ? sanitizeText(data.title, 200) : '',
    description: data.description ? sanitizeText(data.description, 5000) : '',
    budget: data.budget ? sanitizeNumber(data.budget, 0.01, 10000) : 0,
    deadline: data.deadline,
    skills: data.skills || [],
    priority: data.priority || 'medium'
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate agent registration input
 */
export function validateAgentInput(data: Partial<AgentInput>): ValidationResult {
  const errors: string[] = [];
  const validCategories = [
    'development', 'design', 'writing', 'marketing', 'data-science', 
    'research', 'customer-service', 'translation', 'consulting', 'other'
  ];
  const validPricingModels = ['fixed', 'hourly', 'milestone'];
  
  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required');
  } else {
    const nameLength = data.name.trim().length;
    if (nameLength < 3) {
      errors.push('Name must be at least 3 characters long');
    } else if (nameLength > 100) {
      errors.push('Name must be no more than 100 characters long');
    }
  }
  
  // Description validation
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else {
    const descLength = data.description.trim().length;
    if (descLength < 10) {
      errors.push('Description must be at least 10 characters long');
    } else if (descLength > 2000) {
      errors.push('Description must be no more than 2000 characters long');
    }
  }
  
  // Category validation
  if (!data.category || !validCategories.includes(data.category)) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }
  
  // Skills validation
  if (!data.skills || !Array.isArray(data.skills) || data.skills.length === 0) {
    errors.push('At least one skill is required');
  } else if (data.skills.length > 15) {
    errors.push('Maximum 15 skills allowed');
  }
  
  // Pricing model validation
  if (!data.pricingModel || !validPricingModels.includes(data.pricingModel)) {
    errors.push(`Pricing model must be one of: ${validPricingModels.join(', ')}`);
  }
  
  // Hourly rate validation (if hourly pricing)
  if (data.pricingModel === 'hourly') {
    if (data.hourlyRate === undefined || data.hourlyRate === null) {
      errors.push('Hourly rate is required for hourly pricing model');
    } else if (data.hourlyRate < 0.01) {
      errors.push('Hourly rate must be at least 0.01 ERG');
    } else if (data.hourlyRate > 1000) {
      errors.push('Hourly rate cannot exceed 1000 ERG');
    }
  }
  
  // Ergo address validation
  const ergoValidation = validateErgoAddress(data.ergoAddress || '');
  if (!ergoValidation.isValid) {
    errors.push(...ergoValidation.errors);
  }
  
  const sanitizedData = {
    name: data.name ? sanitizeText(data.name, 100) : '',
    description: data.description ? sanitizeText(data.description, 2000) : '',
    category: data.category || 'other',
    skills: data.skills || [],
    pricingModel: data.pricingModel || 'fixed',
    hourlyRate: data.hourlyRate ? sanitizeNumber(data.hourlyRate, 0.01, 1000) : undefined,
    ergoAddress: ergoValidation.sanitizedData || '',
    availability: data.availability || 'contract'
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate bid submission input
 */
export function validateBidInput(data: Partial<BidInput>): ValidationResult {
  const errors: string[] = [];
  
  // Amount validation
  if (data.amount === undefined || data.amount === null) {
    errors.push('Bid amount is required');
  } else {
    const amount = sanitizeNumber(data.amount, 0.01, 10000);
    if (amount <= 0) {
      errors.push('Bid amount must be greater than 0');
    } else if (amount > 10000) {
      errors.push('Bid amount cannot exceed 10,000 ERG');
    }
  }
  
  // Proposal validation
  if (!data.proposal || typeof data.proposal !== 'string') {
    errors.push('Proposal is required');
  } else {
    const proposalLength = data.proposal.trim().length;
    if (proposalLength < 10) {
      errors.push('Proposal must be at least 10 characters long');
    } else if (proposalLength > 2000) {
      errors.push('Proposal must be no more than 2000 characters long');
    }
  }
  
  // Agent ID validation
  if (!data.agentId || typeof data.agentId !== 'string') {
    errors.push('Agent ID is required');
  }
  
  // Task ID validation
  if (!data.taskId || typeof data.taskId !== 'string') {
    errors.push('Task ID is required');
  }
  
  const sanitizedData = {
    amount: data.amount ? sanitizeNumber(data.amount, 0.01, 10000) : 0,
    proposal: data.proposal ? sanitizeText(data.proposal, 2000) : '',
    timeline: data.timeline ? sanitizeText(data.timeline, 500) : undefined,
    agentId: data.agentId || '',
    taskId: data.taskId || ''
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate deliverable submission input
 */
export function validateDeliverableInput(data: Partial<DeliverableInput>): ValidationResult {
  const errors: string[] = [];
  
  // Must have either content or URL
  if (!data.content && !data.url) {
    errors.push('Either content or URL is required');
  }
  
  // Content validation (if provided)
  if (data.content && typeof data.content === 'string') {
    const contentLength = data.content.trim().length;
    if (contentLength === 0) {
      errors.push('Content cannot be empty');
    } else if (contentLength > 10000) {
      errors.push('Content must be no more than 10,000 characters long');
    }
  }
  
  // URL validation (if provided)
  if (data.url && typeof data.url === 'string') {
    try {
      new URL(data.url);
    } catch {
      errors.push('Invalid URL format');
    }
  }
  
  // Task ID validation
  if (!data.taskId || typeof data.taskId !== 'string') {
    errors.push('Task ID is required');
  }
  
  // Agent ID validation
  if (!data.agentId || typeof data.agentId !== 'string') {
    errors.push('Agent ID is required');
  }
  
  const sanitizedData = {
    content: data.content ? sanitizeText(data.content, 10000) : undefined,
    url: data.url ? data.url.trim() : undefined,
    description: data.description ? sanitizeText(data.description, 1000) : undefined,
    taskId: data.taskId || '',
    agentId: data.agentId || ''
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * Validate Ergo address with proper Base58 checking
 */
export function validateErgoAddress(address: string): ValidationResult {
  const errors: string[] = [];
  
  if (!address || typeof address !== 'string') {
    errors.push('Ergo address is required');
    return { isValid: false, errors };
  }
  
  const cleaned = sanitizeErgoAddress(address);
  
  if (!cleaned) {
    errors.push('Invalid Ergo address format');
    return { isValid: false, errors };
  }
  
  // Check if it starts with '9'
  if (!cleaned.startsWith('9')) {
    errors.push('Ergo address must start with "9"');
  }
  
  // Check length (P2PK addresses are 51-52 characters)
  if (cleaned.length < 51 || cleaned.length > 52) {
    errors.push('Ergo address must be 51-52 characters long');
  }
  
  // Validate Base58 encoding
  if (!isValidBase58(cleaned)) {
    errors.push('Invalid Base58 encoding in Ergo address');
  }
  
  // Additional checksum validation could be added here
  // For now, we rely on the basic format checks
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: cleaned
  };
}

/**
 * Validate chain creation input
 */
export function validateChainInput(data: Partial<ChainInput>): ValidationResult {
  const errors: string[] = [];
  
  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Chain name is required');
  } else {
    const nameLength = data.name.trim().length;
    if (nameLength < 3) {
      errors.push('Chain name must be at least 3 characters long');
    } else if (nameLength > 100) {
      errors.push('Chain name must be no more than 100 characters long');
    }
  }
  
  // Description validation
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Chain description is required');
  } else {
    const descLength = data.description.trim().length;
    if (descLength < 10) {
      errors.push('Chain description must be at least 10 characters long');
    } else if (descLength > 3000) {
      errors.push('Chain description must be no more than 3000 characters long');
    }
  }
  
  // Steps validation
  if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
    errors.push('At least one step is required');
  } else if (data.steps.length > 20) {
    errors.push('Maximum 20 steps allowed in a chain');
  } else {
    data.steps.forEach((step, index) => {
      if (!step.title || step.title.trim().length < 3) {
        errors.push(`Step ${index + 1}: Title must be at least 3 characters long`);
      }
      if (!step.description || step.description.trim().length < 10) {
        errors.push(`Step ${index + 1}: Description must be at least 10 characters long`);
      }
      if (!step.skillsRequired || !Array.isArray(step.skillsRequired) || step.skillsRequired.length === 0) {
        errors.push(`Step ${index + 1}: At least one skill is required`);
      }
    });
  }
  
  // Total budget validation
  if (data.totalBudget === undefined || data.totalBudget === null) {
    errors.push('Total budget is required');
  } else {
    const budget = sanitizeNumber(data.totalBudget, 1, 50000);
    if (budget < 1) {
      errors.push('Total budget must be at least 1 ERG');
    } else if (budget > 50000) {
      errors.push('Total budget cannot exceed 50,000 ERG');
    }
  }
  
  const sanitizedData = {
    name: data.name ? sanitizeText(data.name, 100) : '',
    description: data.description ? sanitizeText(data.description, 3000) : '',
    steps: data.steps ? data.steps.map(step => ({
      title: sanitizeText(step.title, 200),
      description: sanitizeText(step.description, 1000),
      skillsRequired: step.skillsRequired || []
    })) : [],
    totalBudget: data.totalBudget ? sanitizeNumber(data.totalBudget, 1, 50000) : 0
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

// ====================================
// CLIENT-SIDE RATE LIMITING HELPERS
// ====================================

/**
 * Debounced form submission helper
 */
export function createDebouncedValidator<T>(
  validator: (data: T) => ValidationResult,
  delay: number = 300
): (data: T) => Promise<ValidationResult> {
  let timeout: NodeJS.Timeout;
  
  return (data: T): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resolve(validator(data));
      }, delay);
    });
  };
}

/**
 * Form submission rate limiter
 */
export class FormRateLimiter {
  private lastSubmission: number = 0;
  private submissionCount: number = 0;
  private windowStart: number = Date.now();
  
  constructor(
    private maxSubmissions: number = 5,
    private windowMs: number = 60000,
    private minInterval: number = 2000
  ) {}
  
  canSubmit(): { allowed: boolean; reason?: string; retryAfter?: number } {
    const now = Date.now();
    
    // Check minimum interval between submissions
    if (now - this.lastSubmission < this.minInterval) {
      return {
        allowed: false,
        reason: 'Please wait before submitting again',
        retryAfter: this.minInterval - (now - this.lastSubmission)
      };
    }
    
    // Reset window if needed
    if (now - this.windowStart > this.windowMs) {
      this.submissionCount = 0;
      this.windowStart = now;
    }
    
    // Check submission limit
    if (this.submissionCount >= this.maxSubmissions) {
      return {
        allowed: false,
        reason: 'Too many submissions. Please try again later.',
        retryAfter: this.windowMs - (now - this.windowStart)
      };
    }
    
    return { allowed: true };
  }
  
  recordSubmission(): void {
    this.lastSubmission = Date.now();
    this.submissionCount++;
  }
}