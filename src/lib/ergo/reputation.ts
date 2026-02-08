// import { TransactionBuilder, OutputBuilder, SConstant, SInt } from "@fleet-sdk/core";
import { getBoxesByAddress, getTokenInfo, Asset } from './explorer';
import { EGO_TOKEN_POLICY_ID, MIN_BOX_VALUE } from './constants';

// EGO reputation token types
export interface EgoToken {
  tokenId: string;
  agentAddress: string;
  agentId: string;
  taskId: string;
  rating: number; // 1-5 stars
  egoDelta: number; // EGO points gained/lost
  oracleAddress: string;
  timestamp: number;
  verified: boolean;
}

export interface EgoMintParams {
  agentAddress: string;
  agentId: string;
  taskId: string;
  rating: number;
  egoDelta: number;
  oracleAddress: string; // platform oracle that signs
  clientAddress: string; // who's rating the agent
}

export interface ReputationVerification {
  agentAddress: string;
  totalTokens: number;
  verifiedScore: number;
  claimedScore: number;
  variance: number;
  confidence: 'high' | 'medium' | 'low';
  proofs: EgoToken[];
  lastVerified: number;
}

export interface AgentReputation {
  address: string;
  totalRating: number;
  ratingCount: number;
  averageRating: number;
  egoScore: number;
  trustLevel: 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum';
  badges: string[];
  onChainTokens: EgoToken[];
}

// EGO token contract (placeholder)
const EGO_TOKEN_SCRIPT = `
{
  // EGO reputation token (soulbound)
  // Cannot be transferred, only minted by oracle
  // Stores rating and EGO delta in registers
  
  val oracle = SELF.R4[SigmaProp].get
  val agentAddr = SELF.R5[Coll[Byte]].get
  val rating = SELF.R6[Int].get
  val egoDelta = SELF.R7[Int].get
  val timestamp = SELF.R8[Int].get
  
  // Only oracle can create/destroy these tokens
  oracle && sigmaProp(true)
}
`;

export async function mintEgoToken(params: EgoMintParams): Promise<any> {
  const {
    agentAddress,
    agentId,
    taskId,
    rating,
    egoDelta,
    oracleAddress,
    clientAddress
  } = params;

  // Validate parameters
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  if (!agentAddress || !agentId || !taskId) {
    throw new Error('Missing required parameters');
  }

  try {
    // Build EGO token minting transaction (placeholder implementation)
    // const txBuilder = new TransactionBuilder();
    // 
    // // Create EGO token output (soulbound to agent)
    // const egoTokenOutput = new OutputBuilder(MIN_BOX_VALUE, agentAddress)
    //   .mintToken({
    //     amount: 1n, // Only 1 token per rating
    //     name: `EGO-${agentId}-${taskId}`,
    //     description: `AgenticAiHome reputation token for task ${taskId}`,
    //     decimals: 0
    //   })
    //   .setAdditionalRegisters({
    //     R4: SConstant.from(oracleAddress), // Oracle signature
    //     R5: SConstant.from(agentAddress),  // Agent address
    //     R6: SConstant.from(SInt(rating)),  // Rating (1-5)
    //     R7: SConstant.from(SInt(egoDelta)), // EGO points
    //     R8: SConstant.from(SInt(Date.now())), // Timestamp
    //     R9: SConstant.from(taskId),        // Task ID
    //     // R10: SConstant.from(clientAddress) // Client who rated (optional)
    //   });
    //
    // txBuilder.to(egoTokenOutput);

    // In real implementation, this would need:
    // 1. Oracle signature verification
    // 2. Task completion verification
    // 3. Duplicate rating prevention
    // 4. Proper fee calculation

    return {
      unsignedTx: {}, // Would contain the actual transaction
      tokenId: `ego-${agentId}-${taskId}-${Date.now()}`, // Placeholder
      description: `Minted EGO token for agent ${agentId}, task ${taskId}, rating ${rating}`
    };
  } catch (error) {
    console.error('Error minting EGO token:', error);
    throw new Error('Failed to mint EGO token');
  }
}

export async function getAgentEgoTokens(address: string): Promise<EgoToken[]> {
  try {
    const boxes = await getBoxesByAddress(address);
    const egoTokens: EgoToken[] = [];

    for (const box of boxes) {
      // Check if box contains EGO tokens
      for (const asset of box.assets) {
        if (await isEgoToken(asset.tokenId)) {
          const egoToken = await parseEgoToken(asset, box);
          if (egoToken) {
            egoTokens.push(egoToken);
          }
        }
      }
    }

    return egoTokens.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting agent EGO tokens:', error);
    return [];
  }
}

export async function verifyReputation(address: string): Promise<ReputationVerification> {
  try {
    const egoTokens = await getAgentEgoTokens(address);
    
    // Calculate verified score from on-chain tokens
    const verifiedScore = egoTokens.reduce((total, token) => {
      return total + (token.verified ? token.egoDelta : 0);
    }, 0);

    // Get claimed score from off-chain data (would query local database)
    const claimedScore = 0; // Placeholder

    const variance = Math.abs(verifiedScore - claimedScore);
    const confidence = calculateConfidence(variance, egoTokens.length);

    return {
      agentAddress: address,
      totalTokens: egoTokens.length,
      verifiedScore,
      claimedScore,
      variance,
      confidence,
      proofs: egoTokens,
      lastVerified: Date.now()
    };
  } catch (error) {
    console.error('Error verifying reputation:', error);
    throw new Error('Failed to verify reputation');
  }
}

export async function getAgentReputation(address: string): Promise<AgentReputation> {
  try {
    const egoTokens = await getAgentEgoTokens(address);
    
    // Calculate aggregate statistics
    const totalRating = egoTokens.reduce((sum, token) => sum + token.rating, 0);
    const ratingCount = egoTokens.length;
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    const egoScore = egoTokens.reduce((sum, token) => sum + token.egoDelta, 0);
    
    // Determine trust level based on score and rating count
    const trustLevel = calculateTrustLevel(egoScore, ratingCount, averageRating);
    
    // Generate badges based on achievements
    const badges = generateBadges(egoTokens, egoScore, averageRating);

    return {
      address,
      totalRating,
      ratingCount,
      averageRating,
      egoScore,
      trustLevel,
      badges,
      onChainTokens: egoTokens
    };
  } catch (error) {
    console.error('Error getting agent reputation:', error);
    throw new Error('Failed to get agent reputation');
  }
}

export async function validateEgoToken(tokenId: string): Promise<boolean> {
  try {
    const tokenInfo = await getTokenInfo(tokenId);
    if (!tokenInfo) return false;

    // Check if it's a valid EGO token by name pattern or policy ID
    return tokenInfo.name?.startsWith('EGO-') || 
           tokenInfo.id === EGO_TOKEN_POLICY_ID;
  } catch (error) {
    console.error('Error validating EGO token:', error);
    return false;
  }
}

// Helper functions

async function isEgoToken(tokenId: string): Promise<boolean> {
  const tokenInfo = await getTokenInfo(tokenId);
  return tokenInfo?.name?.startsWith('EGO-') || false;
}

async function parseEgoToken(asset: Asset, box: any): Promise<EgoToken | null> {
  try {
    // Parse EGO token data from box registers
    // This is a placeholder - real implementation would parse actual register data
    
    const registers = box.additionalRegisters;
    
    return {
      tokenId: asset.tokenId,
      agentAddress: registers.R5 || '',
      agentId: '', // Would extract from token name or registers
      taskId: registers.R9 || '',
      rating: parseInt(registers.R6) || 0,
      egoDelta: parseInt(registers.R7) || 0,
      oracleAddress: registers.R4 || '',
      timestamp: parseInt(registers.R8) || Date.now(),
      verified: true // Would verify oracle signature
    };
  } catch (error) {
    console.error('Error parsing EGO token:', error);
    return null;
  }
}

function calculateConfidence(variance: number, tokenCount: number): 'high' | 'medium' | 'low' {
  if (tokenCount >= 10 && variance <= 50) return 'high';
  if (tokenCount >= 5 && variance <= 100) return 'medium';
  return 'low';
}

function calculateTrustLevel(
  egoScore: number, 
  ratingCount: number, 
  averageRating: number
): 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (ratingCount < 3) return 'unverified';
  if (egoScore >= 1000 && averageRating >= 4.5 && ratingCount >= 20) return 'platinum';
  if (egoScore >= 500 && averageRating >= 4.0 && ratingCount >= 10) return 'gold';
  if (egoScore >= 200 && averageRating >= 3.5 && ratingCount >= 5) return 'silver';
  return 'bronze';
}

function generateBadges(tokens: EgoToken[], egoScore: number, averageRating: number): string[] {
  const badges: string[] = [];
  
  if (tokens.length >= 10) badges.push('Veteran');
  if (averageRating >= 4.5) badges.push('Top Rated');
  if (egoScore >= 500) badges.push('EGO Master');
  if (tokens.length >= 50) badges.push('Expert');
  
  // Task-specific badges
  const taskTypes = new Set(tokens.map(t => t.taskId.split('-')[0])); // Assuming taskId format
  if (taskTypes.size >= 5) badges.push('Versatile');
  
  return badges;
}

// Statistics and analytics
export function calculateReputationStats(tokens: EgoToken[]): {
  weeklyRating: number;
  monthlyRating: number;
  ratingTrend: 'up' | 'down' | 'stable';
  topSkills: string[];
} {
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const month = 30 * 24 * 60 * 60 * 1000;
  
  const weeklyTokens = tokens.filter(t => now - t.timestamp < week);
  const monthlyTokens = tokens.filter(t => now - t.timestamp < month);
  
  const weeklyRating = weeklyTokens.length > 0 
    ? weeklyTokens.reduce((sum, t) => sum + t.rating, 0) / weeklyTokens.length 
    : 0;
    
  const monthlyRating = monthlyTokens.length > 0
    ? monthlyTokens.reduce((sum, t) => sum + t.rating, 0) / monthlyTokens.length
    : 0;
  
  // Simple trend calculation
  const recentRating = tokens.slice(0, 5).reduce((sum, t) => sum + t.rating, 0) / Math.min(5, tokens.length);
  const olderRating = tokens.slice(5, 10).reduce((sum, t) => sum + t.rating, 0) / Math.min(5, tokens.slice(5).length);
  
  let ratingTrend: 'up' | 'down' | 'stable' = 'stable';
  if (recentRating > olderRating + 0.2) ratingTrend = 'up';
  else if (recentRating < olderRating - 0.2) ratingTrend = 'down';
  
  // Extract top skills (placeholder)
  const topSkills = ['AI Development', 'Smart Contracts', 'Web3 Integration'];
  
  return {
    weeklyRating,
    monthlyRating,
    ratingTrend,
    topSkills
  };
}