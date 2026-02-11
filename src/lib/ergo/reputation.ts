import {
  TransactionBuilder,
  OutputBuilder,
  SConstant,
  SInt,
  SColl,
  SByte,
  SAFE_MIN_BOX_VALUE,
} from '@fleet-sdk/core';
import { getCurrentHeight, getBoxesByAddress, getTokenInfo } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, SOULBOUND_EGO_CONTRACT_ADDRESS } from './constants';
import type { Asset } from './explorer';

// ─── Types ───────────────────────────────────────────────────────────

export interface EgoToken {
  tokenId: string;
  agentAddress: string;
  agentId: string;
  taskId: string;
  rating: number;
  egoDelta: number;
  oracleAddress: string;
  timestamp: number;
  verified: boolean;
}

export interface EgoMintParams {
  agentAddress: string;
  taskId: string;
  rating: number;
  egoDelta: number;
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

// ─── EGO Token Minting ──────────────────────────────────────────────

/**
 * Mint an EGO reputation token for an agent.
 * This uses Ergo's native token minting: the first input box ID becomes the token ID.
 * The minted token is sent to the agent's address, making it "soulbound" by convention.
 */
export async function mintEgoTokenTx(
  params: EgoMintParams,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const { agentAddress, taskId, rating, egoDelta } = params;

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  if (!agentAddress || !taskId) {
    throw new Error('Missing required parameters');
  }
  if (!walletUtxos.length) {
    throw new Error('No UTXOs available for minting');
  }

  const currentHeight = await getCurrentHeight();

  // Build EGO token output: mint 1 token, send to soulbound contract
  // R4 stores the agent address so the contract can enforce soulbound behavior
  const egoOutput = new OutputBuilder(MIN_BOX_VALUE, SOULBOUND_EGO_CONTRACT_ADDRESS)
    .mintToken({
      amount: 1n,
      name: `EGO-${taskId.slice(0, 8)}`,
      description: `AgenticAiHome reputation token. Rating: ${rating}/5, EGO: +${egoDelta}`,
      decimals: 0,
    })
    .setAdditionalRegisters({
      R4: SConstant(SColl(SByte, new TextEncoder().encode(agentAddress))), // Agent identity (soulbound to this address)
      R5: SConstant(SInt(rating)),
      R6: SConstant(SColl(SByte, new TextEncoder().encode(taskId))),
      R7: SConstant(SInt(egoDelta)),
      R8: SConstant(SInt(currentHeight)), // timestamp as block height
    });

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(walletUtxos)
    .to([egoOutput])
    .sendChangeTo(changeAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

// ─── Token querying ──────────────────────────────────────────────────

/**
 * Get all EGO tokens held by an address.
 */
export async function getAgentEgoTokens(address: string): Promise<EgoToken[]> {
  try {
    const boxes = await getBoxesByAddress(address);
    const egoTokens: EgoToken[] = [];

    for (const box of boxes) {
      if (!box.assets) continue;
      for (const asset of box.assets) {
        if (await isEgoToken(asset.tokenId)) {
          egoTokens.push({
            tokenId: asset.tokenId,
            agentAddress: address,
            agentId: '',
            taskId: '',
            rating: 0,
            egoDelta: 0,
            oracleAddress: '',
            timestamp: box.creationHeight || Date.now(),
            verified: true,
          });
        }
      }
    }

    return egoTokens;
  } catch (error) {
    console.error('Error getting agent EGO tokens:', error);
    return [];
  }
}

async function isEgoToken(tokenId: string): Promise<boolean> {
  try {
    const info = await getTokenInfo(tokenId);
    return info?.name?.startsWith('EGO-') || false;
  } catch {
    return false;
  }
}

// ─── Reputation calculation ──────────────────────────────────────────

export async function getAgentReputation(address: string): Promise<AgentReputation> {
  const egoTokens = await getAgentEgoTokens(address);

  const totalRating = egoTokens.reduce((sum, t) => sum + t.rating, 0);
  const ratingCount = egoTokens.length;
  const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
  const egoScore = egoTokens.reduce((sum, t) => sum + t.egoDelta, 0);

  const trustLevel = calculateTrustLevel(egoScore, ratingCount, averageRating);
  const badges = generateBadges(egoTokens, egoScore, averageRating);

  return {
    address,
    totalRating,
    ratingCount,
    averageRating,
    egoScore,
    trustLevel,
    badges,
    onChainTokens: egoTokens,
  };
}

function calculateTrustLevel(
  egoScore: number,
  ratingCount: number,
  averageRating: number
): AgentReputation['trustLevel'] {
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
  return badges;
}

export function calculateReputationStats(tokens: EgoToken[]) {
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

  return { weeklyRating, monthlyRating, ratingTrend: 'stable' as const, topSkills: [] as string[] };
}
