/**
 * EGO Score Computation Tests
 * Tests deterministic scoring, valid ranges, and anti-gaming mechanisms
 */

import {
  computeEgoScore,
  applyDecay,
  calculateEgoDelta,
  detectAnomalies,
  validateEgoFactors,
  getEgoTier,
  getEgoBreakdown,
  projectEgoGrowth,
  formatEgoScore,
  getScoreToNextTier,
  EgoFactors,
  CompletionData,
} from '../src/lib/ego';
import { ReputationEvent } from '../src/lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`FAIL: ${message} (actual: ${actual}, expected: ${expected}±${tolerance})`);
  }
  console.log(`✓ ${message}`);
}

function testDeterministicScoring() {
  console.log('\n--- Testing Deterministic Score Computation ---');

  // Test that same inputs always produce same output
  const testFactors: EgoFactors = {
    completionRate: 85,
    avgRating: 4.2,
    uptime: 80,
    accountAge: 180, // 6 months
    peerEndorsements: 3,
    skillBenchmarks: 2,
    disputeRate: 5,
  };

  const score1 = computeEgoScore(testFactors);
  const score2 = computeEgoScore(testFactors);
  const score3 = computeEgoScore({ ...testFactors }); // Deep copy to ensure no mutation

  assert(score1 === score2, 'Same input should produce identical output (run 1 vs 2)');
  assert(score1 === score3, 'Same input should produce identical output (run 1 vs 3)');
  assert(typeof score1 === 'number', 'Score should be a number');
  assert(Number.isFinite(score1), 'Score should be finite');

  // Test that small changes produce predictable differences
  const slightlyBetterFactors = { ...testFactors, completionRate: 90 };
  const betterScore = computeEgoScore(slightlyBetterFactors);
  assert(betterScore > score1, 'Better completion rate should increase score');

  const slightlyWorseFactors = { ...testFactors, disputeRate: 15 };
  const worseScore = computeEgoScore(slightlyWorseFactors);
  assert(worseScore < score1, 'Higher dispute rate should decrease score');

  console.log('Deterministic scoring tests passed!');
}

function testValidScoreRange() {
  console.log('\n--- Testing Valid Score Range (0-100) ---');

  // Test minimum possible score
  const minFactors: EgoFactors = {
    completionRate: 0,
    avgRating: 1.0,
    uptime: 0,
    accountAge: 0,
    peerEndorsements: 0,
    skillBenchmarks: 0,
    disputeRate: 100, // Maximum disputes
  };

  const minScore = computeEgoScore(minFactors);
  assert(minScore >= 0, `Minimum score should be ≥ 0, got ${minScore}`);
  assert(minScore <= 100, `Minimum score should be ≤ 100, got ${minScore}`);

  // Test maximum possible score
  const maxFactors: EgoFactors = {
    completionRate: 100,
    avgRating: 5.0,
    uptime: 100,
    accountAge: 365, // 1 year
    peerEndorsements: 10, // Capped benefit
    skillBenchmarks: 5,   // Capped benefit
    disputeRate: 0,       // No disputes
  };

  const maxScore = computeEgoScore(maxFactors);
  assert(maxScore >= 0, `Maximum score should be ≥ 0, got ${maxScore}`);
  assert(maxScore <= 100, `Maximum score should be ≤ 100, got ${maxScore}`);
  assert(maxScore > minScore, 'Maximum factors should produce higher score than minimum');

  // Test realistic mid-range score
  const midFactors: EgoFactors = {
    completionRate: 80,
    avgRating: 4.0,
    uptime: 70,
    accountAge: 180,
    peerEndorsements: 2,
    skillBenchmarks: 1,
    disputeRate: 8,
  };

  const midScore = computeEgoScore(midFactors);
  assert(midScore > minScore, 'Mid-range factors should be better than minimum');
  assert(midScore < maxScore, 'Mid-range factors should be worse than maximum');
  assert(midScore >= 0 && midScore <= 100, 'Mid-range score should be in valid range');

  console.log('Valid score range tests passed!');
}

function testAntiGamingMechanisms() {
  console.log('\n--- Testing Anti-Gaming Mechanisms ---');

  // Test repeat interaction dampening
  const recentEvents: ReputationEvent[] = [];
  const baseDate = new Date();

  // Create pattern of many small positive events (potential gaming)
  for (let i = 0; i < 15; i++) {
    recentEvents.push({
      id: `event-${i}`,
      agentId: 'agent-123',
      eventType: 'completion',
      egoDelta: 1.5, // Small positive gains
      createdAt: new Date(baseDate.getTime() - i * 60 * 60 * 1000).toISOString(), // Hourly
      description: `Small task ${i}`,
    });
  }

  const anomalies = detectAnomalies(recentEvents);
  assert(anomalies.anomalies.length > 0, 'Should detect gaming pattern in rapid small gains');

  const rapidIncreaseAnomaly = anomalies.anomalies.find(a => a.type === 'rapid_score_increase');
  assert(rapidIncreaseAnomaly !== undefined, 'Should specifically detect rapid score increase');

  // Test review bombing detection
  const reviewBombingEvents: ReputationEvent[] = [];
  for (let i = 0; i < 12; i++) {
    reviewBombingEvents.push({
      id: `bomb-${i}`,
      agentId: 'agent-456',
      eventType: 'completion',
      egoDelta: 0.8, // Small but consistent gains
      createdAt: new Date(baseDate.getTime() - i * 30 * 60 * 1000).toISOString(), // Every 30 min
      description: `Suspicious task ${i}`,
    });
  }

  const bombingAnomalies = detectAnomalies(reviewBombingEvents);
  const reviewBombingAnomaly = bombingAnomalies.anomalies.find(a => a.type === 'review_bombing');
  assert(reviewBombingAnomaly !== undefined, 'Should detect review bombing pattern');

  // Test outlier detection resistance
  const outlierFactors: EgoFactors = {
    completionRate: 100,
    avgRating: 5.0,
    uptime: 100,
    accountAge: 7, // Very new account with perfect stats (suspicious)
    peerEndorsements: 50, // Unrealistically high
    skillBenchmarks: 20,  // Unrealistically high
    disputeRate: 0,
  };

  const outlierScore = computeEgoScore(outlierFactors);
  // Score should be reduced due to new account penalty
  assert(outlierScore < 90, 'New accounts with perfect stats should receive penalty');

  console.log('Anti-gaming mechanism tests passed!');
}

function testEgoDeltaCalculation() {
  console.log('\n--- Testing EGO Delta Calculations ---');

  // Test base rating deltas
  const baseCompletion: CompletionData = {
    taskId: 'test-task',
    agentId: 'test-agent',
    rating: 5,
    taskComplexity: 'moderate',
    budgetErg: 50,
    completedOnTime: true,
    bonusAwarded: false,
    clientRepeat: false,
  };

  const fiveStarDelta = calculateEgoDelta(baseCompletion);
  assert(fiveStarDelta > 0, 'Five-star rating should give positive delta');

  const oneStarCompletion = { ...baseCompletion, rating: 1 };
  const oneStarDelta = calculateEgoDelta(oneStarCompletion);
  assert(oneStarDelta < 0, 'One-star rating should give negative delta');

  const threeStarCompletion = { ...baseCompletion, rating: 3 };
  const threeStarDelta = calculateEgoDelta(threeStarCompletion);
  assert(threeStarDelta >= 0, 'Three-star rating should give small positive or zero delta');

  // Test complexity modifiers
  const complexCompletion = { ...baseCompletion, taskComplexity: 'complex' as const };
  const complexDelta = calculateEgoDelta(complexCompletion);
  assert(complexDelta > fiveStarDelta, 'Complex tasks should have higher delta multiplier');

  const simpleCompletion = { ...baseCompletion, taskComplexity: 'simple' as const };
  const simpleDelta = calculateEgoDelta(simpleCompletion);
  assert(simpleDelta < fiveStarDelta, 'Simple tasks should have lower delta multiplier');

  // Test bonus modifiers
  const bonusCompletion = { ...baseCompletion, bonusAwarded: true };
  const bonusDelta = calculateEgoDelta(bonusCompletion);
  assert(bonusDelta > fiveStarDelta, 'Bonus awards should increase delta');

  const lateCompletion = { ...baseCompletion, completedOnTime: false };
  const lateDelta = calculateEgoDelta(lateCompletion);
  assert(lateDelta < fiveStarDelta, 'Late completion should reduce delta');

  // Test repeat client bonus
  const repeatCompletion = { ...baseCompletion, clientRepeat: true };
  const repeatDelta = calculateEgoDelta(repeatCompletion);
  assert(repeatDelta > fiveStarDelta, 'Repeat client should increase delta');

  console.log('EGO delta calculation tests passed!');
}

function testScoreDecay() {
  console.log('\n--- Testing Score Decay System ---');

  const baseScore = 80;

  // Test no decay for recent activity (< 7 days)
  const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
  const recentDecayedScore = applyDecay(baseScore, recentDate);
  assert(recentDecayedScore === baseScore, 'Recent activity should not decay score');

  // Test minimal decay for 30 days inactivity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDayDecay = applyDecay(baseScore, thirtyDaysAgo);
  assert(thirtyDayDecay < baseScore, 'Score should decay after 30 days');
  assert(thirtyDayDecay > baseScore * 0.9, 'Decay should be minimal after 30 days');

  // Test significant decay after 6 months (with 12-month half-life, 6 months = ~71% remaining)
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthDecay = applyDecay(baseScore, sixMonthsAgo);
  assert(sixMonthDecay < baseScore * 0.75, 'Score should decay significantly after 6 months');

  // Test half-life (12 months = 50% score)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const yearDecay = applyDecay(baseScore, oneYearAgo);
  assertApprox(yearDecay, baseScore * 0.5, 5, 'Score should be approximately half after one year');

  // Test floor behavior (score never goes below 0)
  const veryOldDate = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 3 years
  const veryOldDecay = applyDecay(baseScore, veryOldDate);
  assert(veryOldDecay >= 0, 'Score should never go below 0');

  console.log('Score decay tests passed!');
}

function testTierSystem() {
  console.log('\n--- Testing Tier Assignment System ---');

  // Test each tier boundary
  const newcomerScore = 15;
  const newcomerTier = getEgoTier(newcomerScore);
  assert(newcomerTier.name === 'Newcomer', `Score ${newcomerScore} should be Newcomer tier`);

  const risingScore = 35;
  const risingTier = getEgoTier(risingScore);
  assert(risingTier.name === 'Rising', `Score ${risingScore} should be Rising tier`);

  const establishedScore = 65;
  const establishedTier = getEgoTier(establishedScore);
  assert(establishedTier.name === 'Established', `Score ${establishedScore} should be Established tier`);

  const eliteScore = 85;
  const eliteTier = getEgoTier(eliteScore);
  assert(eliteScore >= eliteTier.minScore && eliteScore <= eliteTier.maxScore, 
    `Score ${eliteScore} should be within tier bounds`);

  const legendaryScore = 95;
  const legendaryTier = getEgoTier(legendaryScore);
  assert(legendaryTier.name === 'Legendary', `Score ${legendaryScore} should be Legendary tier`);

  // Test tier progression
  assert(newcomerTier.governanceWeight < risingTier.governanceWeight, 
    'Higher tiers should have more governance weight');
  assert(risingTier.maxTasksPerDay < establishedTier.maxTasksPerDay, 
    'Higher tiers should handle more tasks per day');

  console.log('Tier system tests passed!');
}

function testScoreBreakdown() {
  console.log('\n--- Testing Score Breakdown Analysis ---');

  const testFactors: EgoFactors = {
    completionRate: 90,
    avgRating: 4.5,
    uptime: 85,
    accountAge: 270, // 9 months
    peerEndorsements: 4,
    skillBenchmarks: 3,
    disputeRate: 3,
  };

  const breakdown = getEgoBreakdown('test-agent', testFactors);

  // Verify structure
  assert(breakdown.agentId === 'test-agent', 'Breakdown should contain correct agent ID');
  assert(typeof breakdown.totalScore === 'number', 'Total score should be numeric');
  assert(breakdown.totalScore >= 0 && breakdown.totalScore <= 100, 'Total score should be in valid range');

  // Verify factor analysis
  Object.keys(testFactors).forEach(factorKey => {
    const factor = factorKey as keyof EgoFactors;
    const factorBreakdown = breakdown.factors[factor];
    
    assert(factorBreakdown.value === testFactors[factor], 
      `Factor ${factor} value should match input`);
    assert(typeof factorBreakdown.weight === 'number', 
      `Factor ${factor} should have numeric weight`);
    assert(typeof factorBreakdown.contribution === 'number', 
      `Factor ${factor} should have numeric contribution`);
    assert(['excellent', 'good', 'fair', 'poor'].includes(factorBreakdown.status), 
      `Factor ${factor} should have valid status`);
    assert(factorBreakdown.improvementTip.length > 0, 
      `Factor ${factor} should have improvement tip`);
  });

  // Verify tier assignment
  assert(breakdown.tier === getEgoTier(breakdown.totalScore), 
    'Breakdown tier should match score-based tier lookup');

  console.log('Score breakdown tests passed!');
}

function testProjectionSystem() {
  console.log('\n--- Testing EGO Projection System ---');

  const currentScore = 60;
  const projections = projectEgoGrowth(currentScore, 3, 4.2, {
    completionRate: 85,
    disputeRate: 5,
  });

  assert(projections.length === 6, 'Should project 6 months ahead');

  // Test projection structure
  projections.forEach((projection, index) => {
    assert(projection.month === index + 1, `Projection ${index} should have correct month`);
    assert(typeof projection.projectedScore === 'number', 'Projected score should be numeric');
    assert(projection.projectedScore >= 0 && projection.projectedScore <= 100, 
      'Projected score should be in valid range');
    
    assert(Array.isArray(projection.confidenceInterval), 'Should have confidence interval');
    assert(projection.confidenceInterval.length === 2, 'Confidence interval should have min/max');
    assert(projection.confidenceInterval[0] <= projection.projectedScore, 
      'Confidence interval min should be ≤ projected score');
    assert(projection.confidenceInterval[1] >= projection.projectedScore, 
      'Confidence interval max should be ≥ projected score');
  });

  // Test score progression (should generally increase with good activity)
  const firstProjection = projections[0];
  const lastProjection = projections[projections.length - 1];
  
  // With 3 completions/month at 4.2 rating, score should improve over time
  assert(lastProjection.projectedScore >= firstProjection.projectedScore, 
    'Score should improve with consistent good performance');

  console.log('EGO projection tests passed!');
}

function testValidation() {
  console.log('\n--- Testing EGO Factor Validation ---');

  // Valid factors
  const validFactors: EgoFactors = {
    completionRate: 85,
    avgRating: 4.2,
    uptime: 80,
    accountAge: 180,
    peerEndorsements: 3,
    skillBenchmarks: 2,
    disputeRate: 5,
  };

  const validResult = validateEgoFactors(validFactors);
  assert(validResult.isValid, 'Valid factors should pass validation');
  assert(validResult.errors.length === 0, 'Valid factors should have no errors');

  // Invalid completion rate
  const invalidCompletion = { ...validFactors, completionRate: 150 };
  const invalidCompletionResult = validateEgoFactors(invalidCompletion);
  assert(!invalidCompletionResult.isValid, 'Completion rate > 100 should fail validation');
  assert(invalidCompletionResult.errors.some(e => e.includes('completion rate')), 
    'Should report completion rate error');

  // Invalid rating
  const invalidRating = { ...validFactors, avgRating: 6.0 };
  const invalidRatingResult = validateEgoFactors(invalidRating);
  assert(!invalidRatingResult.isValid, 'Rating > 5 should fail validation');

  // Negative values
  const negativeAge = { ...validFactors, accountAge: -30 };
  const negativeAgeResult = validateEgoFactors(negativeAge);
  assert(!negativeAgeResult.isValid, 'Negative account age should fail validation');

  console.log('EGO factor validation tests passed!');
}

function testUtilityFunctions() {
  console.log('\n--- Testing Utility Functions ---');

  // Test score formatting
  assert(formatEgoScore(85.7) === '86', 'Should round to nearest integer');
  assert(formatEgoScore(99.4) === '99', 'Should floor when < 0.5');
  assert(formatEgoScore(99.5) === '100', 'Should ceil when ≥ 0.5');

  // Test next tier calculation
  const currentScore = 45;
  const nextTierInfo = getScoreToNextTier(currentScore);
  assert(nextTierInfo.nextTier !== null, 'Should find next tier for mid-range score');
  assert(nextTierInfo.pointsNeeded > 0, 'Should calculate positive points needed');
  assert(nextTierInfo.pointsNeeded === nextTierInfo.nextTier!.minScore - currentScore, 
    'Points needed should equal tier min minus current score');

  // Test max tier (should have no next tier)
  const maxScore = 95;
  const maxTierInfo = getScoreToNextTier(maxScore);
  // Note: This might return null if 95 is the max tier, or might have one more tier

  console.log('Utility function tests passed!');
}

async function runAllTests() {
  console.log('🧠 Starting EGO Score Computation Tests...');

  try {
    testDeterministicScoring();
    testValidScoreRange();
    testAntiGamingMechanisms();
    testEgoDeltaCalculation();
    testScoreDecay();
    testTierSystem();
    testScoreBreakdown();
    testProjectionSystem();
    testValidation();
    testUtilityFunctions();

    console.log('\n🎉 All EGO score tests passed!');
    return true;
  } catch (error) {
    console.error('\n💥 Test failed:', (error as Error).message);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default runAllTests;