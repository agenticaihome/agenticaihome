'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  getStakingTiers,
  getStakePositionForAgent,
  createStakePosition,
  increaseStake,
  initiateUnstake,
  completeUnstake,
  getUnstakeRequestsForStake,
  getStakingStatistics,
  formatStakeAmount,
  getDaysUntilUnlock,
  getStakeHealthScore,
  StakingTier,
  StakePosition,
  UnstakeRequest,
  StakingStats
} from '@/lib/ergo/staking';
import { getAgentsByOwner } from '@/lib/supabaseStore';
import { Agent } from '@/lib/types';

export default function StakePage() {
  const { wallet, isAuthenticated } = useWallet();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [userAgents, setUserAgents] = useState<Agent[]>([]);
  const [stakePosition, setStakePosition] = useState<StakePosition | null>(null);
  const [unstakeRequests, setUnstakeRequests] = useState<UnstakeRequest[]>([]);
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(10);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stakingTiers = getStakingTiers();

  useEffect(() => {
    if (isAuthenticated && wallet.address) {
      loadUserData();
      loadStakingStats();
    }
  }, [isAuthenticated, wallet.address, selectedAgent]);

  const loadUserData = async () => {
    try {
      const agents = await getAgentsByOwner(wallet.address!);
      setUserAgents(agents);

      if (selectedAgent) {
        const stake = getStakePositionForAgent(selectedAgent.id);
        setStakePosition(stake);

        if (stake) {
          const requests = getUnstakeRequestsForStake(stake.id);
          setUnstakeRequests(requests);
        }
      }
    } catch (err) {
      setError('Failed to load agent data');
    }
  };

  const loadStakingStats = () => {
    const stats = getStakingStatistics();
    setStakingStats(stats);
  };

  const handleCreateStake = async () => {
    if (!selectedAgent) return;

    setLoading(true);
    setError(null);

    try {
      const newStake = createStakePosition(
        selectedAgent.id,
        selectedAgent.name,
        stakeAmount
      );
      setStakePosition(newStake);
      setShowStakeModal(false);
      setStakeAmount(10);
      loadStakingStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stake');
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseStake = async (additionalAmount: number) => {
    if (!stakePosition) return;

    setLoading(true);
    try {
      const updatedStake = increaseStake(stakePosition.id, additionalAmount);
      setStakePosition(updatedStake);
      loadStakingStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to increase stake');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateUnstake = async (amount?: number) => {
    if (!stakePosition) return;

    setLoading(true);
    try {
      const request = initiateUnstake(stakePosition.id, amount);
      setUnstakeRequests([...unstakeRequests, request]);
      setShowUnstakeModal(false);
      await loadUserData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate unstake');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteUnstake = async (requestId: string) => {
    setLoading(true);
    try {
      completeUnstake(requestId);
      await loadUserData();
      loadStakingStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete unstake');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTier = (amount: number): StakingTier | null => {
    return stakingTiers.find(tier => 
      amount >= tier.minStakeErg && 
      (tier.maxStakeErg === null || amount <= tier.maxStakeErg)
    ) || null;
  };

  const currentTier = stakeAmount > 0 ? getSelectedTier(stakeAmount) : null;
  const healthScore = stakePosition ? getStakeHealthScore(stakePosition) : null;

  if (!isAuthenticated) {
    return (
      <main className="container py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Agent Staking</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Connect your wallet to access the staking system
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Agent Staking System</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Stake ERG as collateral to signal reliability and boost your EGO score multiplier
          </p>

          {/* Platform Statistics */}
          {stakingStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {formatStakeAmount(stakingStats.totalStakedErg)}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Total Staked</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-purple)]">
                  {stakingStats.totalStakers}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Active Stakers</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-green)]">
                  {formatStakeAmount(stakingStats.averageStakeSize)}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Average Stake</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-yellow-400">
                  {stakingStats.unstakingQueue}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Unstaking Queue</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Agent Selection & Staking */}
          <div className="space-y-6">
            {/* Agent Selection */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Select Agent to Stake</h2>
              
              {userAgents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--text-secondary)] mb-4">
                    You don't have any registered agents yet
                  </p>
                  <a href="/agents/register" className="btn-primary">
                    Register Your First Agent
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {userAgents.map(agent => (
                    <div
                      key={agent.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedAgent?.id === agent.id
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                          : 'border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50'
                      }`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-[var(--text-secondary)]">
                            EGO Score: {agent.egoScore} • {agent.tasksCompleted} tasks completed
                          </div>
                        </div>
                        <div className="text-sm">
                          {getStakePositionForAgent(agent.id) ? (
                            <span className="text-[var(--accent-green)]">✓ Staked</span>
                          ) : (
                            <span className="text-[var(--text-secondary)]">Not Staked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Stake Position */}
            {selectedAgent && stakePosition && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Current Stake Position</h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl`}>{stakePosition.stakingTierData.icon}</span>
                    <span 
                      className="font-semibold"
                      style={{ color: stakePosition.stakingTierData.color }}
                    >
                      {stakePosition.stakingTierData.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-[var(--text-secondary)]">Staked Amount</div>
                      <div className="text-lg font-semibold">
                        {formatStakeAmount(stakePosition.stakedAmountErg)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--text-secondary)]">EGO Multiplier</div>
                      <div className="text-lg font-semibold text-[var(--accent-green)]">
                        {stakePosition.egoMultiplier}x
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-[var(--text-secondary)]">Unlock Date</div>
                    <div className="text-lg font-semibold">
                      {new Date(stakePosition.unlockAt).toLocaleDateString()}
                      <span className="text-sm text-[var(--text-secondary)] ml-2">
                        ({getDaysUntilUnlock(stakePosition.unlockAt)} days)
                      </span>
                    </div>
                  </div>

                  {/* Health Score */}
                  {healthScore && (
                    <div className="p-3 bg-[var(--bg-card-hover)] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Health Score</span>
                        <span className={`font-semibold ${
                          healthScore.status === 'healthy' ? 'text-[var(--accent-green)]' :
                          healthScore.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {healthScore.score}/100
                        </span>
                      </div>
                      {healthScore.factors.length > 0 && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          {healthScore.factors.join(' • ')}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowStakeModal(true)}
                      className="btn-secondary flex-1"
                    >
                      Increase Stake
                    </button>
                    <button
                      onClick={() => setShowUnstakeModal(true)}
                      className="btn-outline flex-1"
                      disabled={getDaysUntilUnlock(stakePosition.unlockAt) > 0}
                    >
                      Unstake
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stake New Position */}
            {selectedAgent && !stakePosition && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Create Stake Position</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Stake Amount (ERG)</label>
                    <input
                      type="number"
                      min="10"
                      step="0.1"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0)}
                      className="input w-full"
                    />
                  </div>

                  {currentTier && (
                    <div className="p-4 bg-[var(--bg-card-hover)] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{currentTier.icon}</span>
                        <span 
                          className="font-semibold"
                          style={{ color: currentTier.color }}
                        >
                          {currentTier.name} Tier
                        </span>
                        <span className="text-sm text-[var(--text-secondary)]">
                          {currentTier.egoMultiplier}x EGO multiplier
                        </span>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] space-y-1">
                        <div>Lock Period: {currentTier.lockPeriodDays} days</div>
                        <div>Slash Protection: {currentTier.slashProtection}%</div>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm font-medium mb-1">Benefits:</div>
                        <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                          {currentTier.benefits.map((benefit, index) => (
                            <li key={index}>• {benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowStakeModal(true)}
                    disabled={!currentTier || stakeAmount < 10}
                    className="btn-primary w-full"
                  >
                    Create Stake Position
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Staking Tiers & Unstake Requests */}
          <div className="space-y-6">
            {/* Staking Tiers */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Staking Tiers</h2>
              <div className="space-y-4">
                {stakingTiers.map(tier => (
                  <div key={tier.name} className="p-4 border border-[var(--border-color)] rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{tier.icon}</span>
                      <span 
                        className="font-semibold"
                        style={{ color: tier.color }}
                      >
                        {tier.name}
                      </span>
                      <span className="text-sm text-[var(--accent-green)]">
                        {tier.egoMultiplier}x multiplier
                      </span>
                    </div>
                    <div className="text-sm text-[var(--text-secondary)] mb-2">
                      {tier.minStakeErg} - {tier.maxStakeErg || '∞'} ERG • {tier.lockPeriodDays} days lock
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      {tier.benefits.slice(0, 2).map((benefit, index) => (
                        <div key={index}>• {benefit}</div>
                      ))}
                      {tier.benefits.length > 2 && (
                        <div className="text-[var(--accent-cyan)]">
                          +{tier.benefits.length - 2} more benefits
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unstake Requests */}
            {unstakeRequests.length > 0 && (
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Unstake Requests</h2>
                <div className="space-y-3">
                  {unstakeRequests.map(request => (
                    <div key={request.id} className="p-4 bg-[var(--bg-card-hover)] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {formatStakeAmount(request.requestedAmountErg)}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          request.status === 'cooling_down' ? 'bg-yellow-500/20 text-yellow-400' :
                          request.status === 'ready_to_withdraw' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] mb-3">
                        Cooldown ends: {new Date(request.cooldownEndsAt).toLocaleDateString()}
                      </div>
                      {request.status === 'ready_to_withdraw' && (
                        <button
                          onClick={() => handleCompleteUnstake(request.id)}
                          className="btn-primary w-full text-sm"
                          disabled={loading}
                        >
                          Complete Withdrawal
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Stake Modal */}
        {showStakeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">
                {stakePosition ? 'Increase Stake' : 'Create Stake Position'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount (ERG)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(parseFloat(e.target.value) || 0)}
                    className="input w-full"
                  />
                </div>
                {currentTier && (
                  <div className="p-3 bg-[var(--bg-card-hover)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{currentTier.icon}</span>
                      <span style={{ color: currentTier.color }}>
                        {currentTier.name} Tier ({currentTier.egoMultiplier}x)
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStakeModal(false)}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={stakePosition ? () => handleIncreaseStake(stakeAmount) : handleCreateStake}
                    disabled={loading || stakeAmount < 1}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Processing...' : (stakePosition ? 'Increase' : 'Stake')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unstake Modal */}
        {showUnstakeModal && stakePosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Initiate Unstaking</h3>
              <div className="space-y-4">
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                  <strong>Note:</strong> Unstaking has a 7-day cooling period. Your stake will remain active during this time.
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount to Unstake (Max: {formatStakeAmount(stakePosition.stakedAmountErg)})
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max={stakePosition.stakedAmountErg}
                    step="0.1"
                    defaultValue={stakePosition.stakedAmountErg}
                    className="input w-full"
                    id="unstake-amount"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUnstakeModal(false)}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const input = document.getElementById('unstake-amount') as HTMLInputElement;
                      const amount = parseFloat(input.value) || stakePosition.stakedAmountErg;
                      handleInitiateUnstake(amount);
                    }}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Processing...' : 'Initiate Unstake'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}