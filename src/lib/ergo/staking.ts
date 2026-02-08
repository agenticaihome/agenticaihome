/**
 * Agent Staking System for AgenticAiHome
 * 
 * Agents can stake ERG as collateral to signal reliability and commitment.
 * Higher stake increases trust score multiplier in EGO calculations.
 * Staked ERG is locked for a minimum period and can be slashed on dispute loss.
 */

import { Agent } from '../types';

// ============================================================================
// INTERFACES
// ============================================================================

export interface StakePosition {
  id: string;
  agentId: string;
  agentName: string;
  stakedAmountErg: number;
  stakingTierData: StakingTier;
  stakedAt: string;
  lockPeriodDays: number;
  unlockAt: string;
  status: 'active' | 'cooling_down' | 'unstaking' | 'slashed';
  egoMultiplier: number;
  slashHistory: SlashEvent[];
  earnedRewards: number; // Total rewards earned from staking
}

export interface StakingTier {
  name: string;
  minStakeErg: number;
  maxStakeErg: number | null;
  lockPeriodDays: number;
  egoMultiplier: number;
  color: string;
  icon: string;
  benefits: string[];
  slashProtection: number; // Percentage protected from slashing
}

export interface SlashEvent {
  id: string;
  stakeId: string;
  disputeId: string;
  slashedAmountErg: number;
  reason: string;
  slashedAt: string;
  txId: string;
}

export interface StakeReward {
  id: string;
  stakeId: string;
  rewardType: 'ego_boost' | 'task_priority' | 'fee_reduction';
  value: number;
  earnedAt: string;
  description: string;
}

export interface UnstakeRequest {
  id: string;
  stakeId: string;
  requestedAmountErg: number;
  requestedAt: string;
  cooldownEndsAt: string;
  status: 'cooling_down' | 'ready_to_withdraw' | 'cancelled';
}

// ============================================================================
// STAKING TIERS CONFIGURATION
// ============================================================================

const STAKING_TIERS: StakingTier[] = [
  {
    name: 'Bronze',
    minStakeErg: 10,
    maxStakeErg: 49,
    lockPeriodDays: 30,
    egoMultiplier: 1.1,
    color: '#cd7f32',
    icon: '🥉',
    benefits: [
      '10% EGO score boost',
      'Basic task priority',
      'Dispute protection up to 50%'
    ],
    slashProtection: 50,
  },
  {
    name: 'Silver',
    minStakeErg: 50,
    maxStakeErg: 149,
    lockPeriodDays: 60,
    egoMultiplier: 1.25,
    color: '#c0c0c0',
    icon: '🥈',
    benefits: [
      '25% EGO score boost',
      'Enhanced task priority',
      'Dispute protection up to 70%',
      '5% platform fee reduction'
    ],
    slashProtection: 70,
  },
  {
    name: 'Gold',
    minStakeErg: 150,
    maxStakeErg: 499,
    lockPeriodDays: 90,
    egoMultiplier: 1.5,
    color: '#ffd700',
    icon: '🥇',
    benefits: [
      '50% EGO score boost',
      'Premium task priority',
      'Dispute protection up to 80%',
      '10% platform fee reduction',
      'Access to premium tasks'
    ],
    slashProtection: 80,
  },
  {
    name: 'Diamond',
    minStakeErg: 500,
    maxStakeErg: null,
    lockPeriodDays: 180,
    egoMultiplier: 2.0,
    color: '#00d4ff',
    icon: '💎',
    benefits: [
      '100% EGO score boost',
      'Highest task priority',
      'Dispute protection up to 90%',
      '15% platform fee reduction',
      'Access to exclusive tasks',
      'Governance voting rights',
      'Revenue sharing participation'
    ],
    slashProtection: 90,
  }
];

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  STAKES: 'aih_stakes',
  SLASH_EVENTS: 'aih_slash_events',
  STAKE_REWARDS: 'aih_stake_rewards',
  UNSTAKE_REQUESTS: 'aih_unstake_requests'
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
  return `stake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// STAKING TIER FUNCTIONS
// ============================================================================

export function getStakingTiers(): StakingTier[] {
  return [...STAKING_TIERS];
}

export function getStakingTierForAmount(stakeAmountErg: number): StakingTier | null {
  return STAKING_TIERS.find(tier => {
    return stakeAmountErg >= tier.minStakeErg && 
           (tier.maxStakeErg === null || stakeAmountErg <= tier.maxStakeErg);
  }) || null;
}

export function calculateEgoMultiplier(stakeAmountErg: number): number {
  const tier = getStakingTierForAmount(stakeAmountErg);
  return tier ? tier.egoMultiplier : 1.0;
}

// ============================================================================
// STAKE POSITION MANAGEMENT
// ============================================================================

export function getStakePositions(): StakePosition[] {
  return getFromStorage<StakePosition>(STORAGE_KEYS.STAKES);
}

export function getStakePositionForAgent(agentId: string): StakePosition | null {
  const stakes = getStakePositions();
  return stakes.find(s => s.agentId === agentId && s.status === 'active') || null;
}

export function getStakePositionById(stakeId: string): StakePosition | null {
  const stakes = getStakePositions();
  return stakes.find(s => s.id === stakeId) || null;
}

export function createStakePosition(
  agentId: string,
  agentName: string,
  stakeAmountErg: number,
  lockPeriodDays?: number
): StakePosition {
  // Validate minimum stake amount
  if (stakeAmountErg < STAKING_TIERS[0].minStakeErg) {
    throw new Error(`Minimum stake amount is ${STAKING_TIERS[0].minStakeErg} ERG`);
  }

  // Check if agent already has an active stake
  const existingStake = getStakePositionForAgent(agentId);
  if (existingStake) {
    throw new Error('Agent already has an active stake position');
  }

  const tier = getStakingTierForAmount(stakeAmountErg);
  if (!tier) {
    throw new Error('Invalid stake amount');
  }

  const finalLockPeriod = lockPeriodDays || tier.lockPeriodDays;
  const unlockDate = new Date();
  unlockDate.setDate(unlockDate.getDate() + finalLockPeriod);

  const newStake: StakePosition = {
    id: generateId(),
    agentId,
    agentName,
    stakedAmountErg: stakeAmountErg,
    stakingTierData: tier,
    stakedAt: new Date().toISOString(),
    lockPeriodDays: finalLockPeriod,
    unlockAt: unlockDate.toISOString(),
    status: 'active',
    egoMultiplier: tier.egoMultiplier,
    slashHistory: [],
    earnedRewards: 0
  };

  const stakes = getStakePositions();
  stakes.push(newStake);
  saveToStorage(STORAGE_KEYS.STAKES, stakes);

  return newStake;
}

export function increaseStake(stakeId: string, additionalAmountErg: number): StakePosition {
  const stakes = getStakePositions();
  const stakeIndex = stakes.findIndex(s => s.id === stakeId);
  
  if (stakeIndex === -1) {
    throw new Error('Stake position not found');
  }

  const stake = stakes[stakeIndex];
  if (stake.status !== 'active') {
    throw new Error('Cannot increase inactive stake position');
  }

  const newTotalAmount = stake.stakedAmountErg + additionalAmountErg;
  const newTier = getStakingTierForAmount(newTotalAmount);
  
  if (!newTier) {
    throw new Error('Invalid new stake amount');
  }

  // Update stake position
  stake.stakedAmountErg = newTotalAmount;
  stake.stakingTierData = newTier;
  stake.egoMultiplier = newTier.egoMultiplier;

  stakes[stakeIndex] = stake;
  saveToStorage(STORAGE_KEYS.STAKES, stakes);

  return stake;
}

// ============================================================================
// UNSTAKING FUNCTIONS
// ============================================================================

export function getUnstakeRequests(): UnstakeRequest[] {
  return getFromStorage<UnstakeRequest>(STORAGE_KEYS.UNSTAKE_REQUESTS);
}

export function getUnstakeRequestsForStake(stakeId: string): UnstakeRequest[] {
  const requests = getUnstakeRequests();
  return requests.filter(r => r.stakeId === stakeId && r.status !== 'cancelled');
}

export function initiateUnstake(stakeId: string, amountErg?: number): UnstakeRequest {
  const stake = getStakePositionById(stakeId);
  if (!stake) {
    throw new Error('Stake position not found');
  }

  if (stake.status !== 'active') {
    throw new Error('Can only unstake from active positions');
  }

  // Check if lock period has ended
  const now = new Date();
  const unlockDate = new Date(stake.unlockAt);
  if (now < unlockDate) {
    throw new Error(`Stake is locked until ${unlockDate.toLocaleDateString()}`);
  }

  const unstakeAmount = amountErg || stake.stakedAmountErg;
  if (unstakeAmount > stake.stakedAmountErg) {
    throw new Error('Cannot unstake more than staked amount');
  }

  // 7-day cooling period for unstaking
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() + 7);

  const unstakeRequest: UnstakeRequest = {
    id: generateId(),
    stakeId,
    requestedAmountErg: unstakeAmount,
    requestedAt: new Date().toISOString(),
    cooldownEndsAt: cooldownDate.toISOString(),
    status: 'cooling_down'
  };

  const requests = getUnstakeRequests();
  requests.push(unstakeRequest);
  saveToStorage(STORAGE_KEYS.UNSTAKE_REQUESTS, requests);

  // Update stake status
  if (unstakeAmount === stake.stakedAmountErg) {
    stake.status = 'unstaking';
  }

  const stakes = getStakePositions();
  const stakeIndex = stakes.findIndex(s => s.id === stakeId);
  stakes[stakeIndex] = stake;
  saveToStorage(STORAGE_KEYS.STAKES, stakes);

  return unstakeRequest;
}

export function completeUnstake(requestId: string): boolean {
  const requests = getUnstakeRequests();
  const requestIndex = requests.findIndex(r => r.id === requestId);
  
  if (requestIndex === -1) {
    throw new Error('Unstake request not found');
  }

  const request = requests[requestIndex];
  if (request.status !== 'cooling_down') {
    throw new Error('Unstake request is not in cooling down status');
  }

  // Check if cooling period has ended
  const now = new Date();
  const cooldownEnd = new Date(request.cooldownEndsAt);
  if (now < cooldownEnd) {
    throw new Error('Cooling period has not ended yet');
  }

  // Update request status
  request.status = 'ready_to_withdraw';
  requests[requestIndex] = request;
  saveToStorage(STORAGE_KEYS.UNSTAKE_REQUESTS, requests);

  return true;
}

// ============================================================================
// SLASHING FUNCTIONS
// ============================================================================

export function getSlashEvents(): SlashEvent[] {
  return getFromStorage<SlashEvent>(STORAGE_KEYS.SLASH_EVENTS);
}

export function getSlashEventsForStake(stakeId: string): SlashEvent[] {
  const events = getSlashEvents();
  return events.filter(e => e.stakeId === stakeId);
}

export function slashStake(
  stakeId: string,
  disputeId: string,
  reason: string,
  slashPercentage: number
): SlashEvent {
  const stake = getStakePositionById(stakeId);
  if (!stake) {
    throw new Error('Stake position not found');
  }

  if (stake.status !== 'active') {
    throw new Error('Cannot slash inactive stake position');
  }

  // Apply slash protection based on tier
  const actualSlashPercentage = Math.max(0, slashPercentage - stake.stakingTierData.slashProtection);
  const slashAmount = stake.stakedAmountErg * (actualSlashPercentage / 100);

  const slashEvent: SlashEvent = {
    id: generateId(),
    stakeId,
    disputeId,
    slashedAmountErg: slashAmount,
    reason,
    slashedAt: new Date().toISOString(),
    txId: `slash-${Date.now()}` // Mock transaction ID
  };

  // Record slash event
  const slashEvents = getSlashEvents();
  slashEvents.push(slashEvent);
  saveToStorage(STORAGE_KEYS.SLASH_EVENTS, slashEvents);

  // Update stake position
  const stakes = getStakePositions();
  const stakeIndex = stakes.findIndex(s => s.id === stakeId);
  if (stakeIndex !== -1) {
    stakes[stakeIndex].stakedAmountErg -= slashAmount;
    stakes[stakeIndex].slashHistory.push(slashEvent);
    
    // Check if stake is completely slashed
    if (stakes[stakeIndex].stakedAmountErg <= 0) {
      stakes[stakeIndex].status = 'slashed';
      stakes[stakeIndex].stakedAmountErg = 0;
    }
    
    saveToStorage(STORAGE_KEYS.STAKES, stakes);
  }

  return slashEvent;
}

// ============================================================================
// STAKE STATISTICS & ANALYTICS
// ============================================================================

export interface StakingStats {
  totalStakedErg: number;
  totalStakers: number;
  averageStakeSize: number;
  tierDistribution: Record<string, number>;
  totalSlashedErg: number;
  activeStakes: number;
  unstakingQueue: number;
}

export function getStakingStatistics(): StakingStats {
  const stakes = getStakePositions();
  const activeStakes = stakes.filter(s => s.status === 'active');
  const slashEvents = getSlashEvents();

  const totalStakedErg = activeStakes.reduce((sum, stake) => sum + stake.stakedAmountErg, 0);
  const totalStakers = activeStakes.length;
  const averageStakeSize = totalStakers > 0 ? totalStakedErg / totalStakers : 0;

  const tierDistribution: Record<string, number> = {};
  for (const tier of STAKING_TIERS) {
    tierDistribution[tier.name] = activeStakes.filter(
      s => s.stakingTierData.name === tier.name
    ).length;
  }

  const totalSlashedErg = slashEvents.reduce((sum, event) => sum + event.slashedAmountErg, 0);
  const unstakingQueue = getUnstakeRequests().filter(r => 
    r.status === 'cooling_down' || r.status === 'ready_to_withdraw'
  ).length;

  return {
    totalStakedErg,
    totalStakers,
    averageStakeSize,
    tierDistribution,
    totalSlashedErg,
    activeStakes: totalStakers,
    unstakingQueue
  };
}

export function getAgentStakeMultiplier(agentId: string): number {
  const stake = getStakePositionForAgent(agentId);
  return stake ? stake.egoMultiplier : 1.0;
}

// ============================================================================
// UTILITIES
// ============================================================================

export function formatStakeAmount(amountErg: number): string {
  return `${amountErg.toFixed(2)} ERG`;
}

export function getDaysUntilUnlock(unlockAt: string): number {
  const now = new Date();
  const unlock = new Date(unlockAt);
  const diffTime = unlock.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculateStakeValue(amountErg: number, ergPriceUsd?: number): string {
  if (!ergPriceUsd) return formatStakeAmount(amountErg);
  const usdValue = amountErg * ergPriceUsd;
  return `${formatStakeAmount(amountErg)} (~$${usdValue.toFixed(2)})`;
}

export function getStakeHealthScore(stake: StakePosition): {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  factors: string[];
} {
  const factors: string[] = [];
  let score = 100;

  // Check slash history
  if (stake.slashHistory.length > 0) {
    score -= stake.slashHistory.length * 10;
    factors.push(`${stake.slashHistory.length} slash event(s)`);
  }

  // Check lock period status
  const daysUntilUnlock = getDaysUntilUnlock(stake.unlockAt);
  if (daysUntilUnlock === 0) {
    factors.push('Lock period ended - can unstake');
  }

  // Check tier efficiency
  if (stake.stakingTierData.name === 'Bronze') {
    score -= 5;
    factors.push('Consider upgrading to higher tier');
  }

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (score < 50) status = 'critical';
  else if (score < 75) status = 'warning';

  return { score: Math.max(0, score), status, factors };
}