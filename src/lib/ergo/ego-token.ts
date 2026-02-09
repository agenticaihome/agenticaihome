import {
  TransactionBuilder,
  OutputBuilder,
} from '@fleet-sdk/core';
import { getCurrentHeight, getAddressBalance, getTokenInfo } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, ERGO_EXPLORER_API } from './constants';

// ─── Constants ───────────────────────────────────────────────────────

const EGO_TOKEN_PREFIX = 'EGO-';
const EGO_TOKENS_PER_COMPLETION = 10;
const EGO_DESCRIPTION_PREFIX = 'AgenticAiHome Reputation Token for';

// ─── Types ───────────────────────────────────────────────────────────

export interface EgoToken {
  tokenId: string;
  name: string;
  amount: bigint;
  description: string;
}

export interface EgoMintParams {
  agentAddress: string;
  agentName: string;
  amount?: number; // defaults to EGO_TOKENS_PER_COMPLETION
  completionNumber?: number; // for naming: EGO-AgentName-#N
  minterAddress: string; // client paying for mint
  minterUtxos: any[];
  currentHeight: number;
}

// ─── Token Query Functions ───────────────────────────────────────────

/**
 * Get all EGO tokens held by an address.
 * Filters tokens whose name starts with "EGO-".
 */
export async function getAllEgoTokens(address: string): Promise<EgoToken[]> {
  try {
    const balance = await getAddressBalance(address);
    const tokens = balance.confirmed.tokens || [];

    const egoTokens: EgoToken[] = [];

    for (const token of tokens) {
      const name = token.name || '';
      if (name.startsWith(EGO_TOKEN_PREFIX)) {
        // Try to get description from token info
        let description = '';
        try {
          const info = await getTokenInfo(token.tokenId);
          description = info?.description || '';
        } catch {
          // ignore — description is optional
        }

        egoTokens.push({
          tokenId: token.tokenId,
          name,
          amount: BigInt(token.amount),
          description,
        });
      }
    }

    return egoTokens;
  } catch (error) {
    console.error('Failed to fetch EGO tokens:', error);
    return [];
  }
}

/**
 * Get total EGO score for an address (sum of all EGO token amounts).
 */
export async function getTotalEgoScore(address: string): Promise<bigint> {
  const tokens = await getAllEgoTokens(address);
  return tokens.reduce((sum, t) => sum + t.amount, 0n);
}

/**
 * Check if an agent already has any EGO tokens.
 * Returns the first EGO token ID found, or null.
 */
export async function getAgentEgoTokenId(agentAddress: string): Promise<string | null> {
  const tokens = await getAllEgoTokens(agentAddress);
  return tokens.length > 0 ? tokens[0].tokenId : null;
}

/**
 * Get EGO balance summary for an address.
 */
export async function getEgoBalance(address: string): Promise<{ tokenId: string; amount: bigint } | null> {
  const tokens = await getAllEgoTokens(address);
  if (tokens.length === 0) return null;

  const totalAmount = tokens.reduce((sum, t) => sum + t.amount, 0n);
  return {
    tokenId: tokens[0].tokenId,
    amount: totalAmount,
  };
}

// ─── Token Minting ──────────────────────────────────────────────────

/**
 * Build an EGO token mint transaction.
 *
 * Creates a new EGO token batch and sends it to the agent's address.
 * The minter (client) pays for the transaction.
 *
 * On Ergo, each mint creates a NEW unique token (token ID = first input box ID).
 * Token follows EIP-4 standard (name, description, decimals in registers).
 */
export async function buildEgoMintTx(params: EgoMintParams): Promise<any> {
  const {
    agentAddress,
    agentName,
    amount = EGO_TOKENS_PER_COMPLETION,
    completionNumber,
    minterAddress,
    minterUtxos,
    currentHeight,
  } = params;

  if (!agentAddress || agentAddress.length < 10) {
    throw new Error('Invalid agent address');
  }
  if (!agentName || agentName.trim().length === 0) {
    throw new Error('Agent name is required');
  }
  if (!Array.isArray(minterUtxos) || minterUtxos.length === 0) {
    throw new Error('No UTXOs available for minting. Wallet needs ERG.');
  }
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Token naming: EGO-AgentName or EGO-AgentName-#N
  const tokenName = completionNumber
    ? `${EGO_TOKEN_PREFIX}${agentName}-#${completionNumber}`
    : `${EGO_TOKEN_PREFIX}${agentName}`;

  const tokenDescription = `${EGO_DESCRIPTION_PREFIX} ${agentName}. Earned through verified task completion. Soulbound.`;

  // Build output: tokens go to the agent's address
  // The output needs at least MIN_BOX_VALUE in ERG
  const tokenOutput = new OutputBuilder(MIN_BOX_VALUE, agentAddress)
    .mintToken({
      amount: BigInt(amount).toString(),
      name: tokenName,
      decimals: 0,
      description: tokenDescription,
    });

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(minterUtxos)
    .to([tokenOutput])
    .sendChangeTo(minterAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Build an EGO reward transaction for subsequent task completions.
 * Same as buildEgoMintTx but with explicit completion numbering.
 */
export async function buildEgoRewardTx(params: {
  agentAddress: string;
  agentName: string;
  completionNumber: number;
  amount?: number;
  minterAddress: string;
  minterUtxos: any[];
  currentHeight: number;
}): Promise<any> {
  return buildEgoMintTx({
    ...params,
    completionNumber: params.completionNumber,
  });
}

/**
 * Mint EGO tokens after a successful escrow release.
 *
 * This is a convenience wrapper that:
 * 1. Determines the completion number for the agent
 * 2. Builds the mint transaction
 * 3. Returns the unsigned TX for the client to sign
 *
 * The client pays ~0.0021 ERG (MIN_BOX_VALUE + TX fee) for the mint.
 */
export async function mintEgoAfterRelease(params: {
  agentAddress: string;
  agentName: string;
  minterAddress: string;
  minterUtxos: any[];
}): Promise<any> {
  const { agentAddress, agentName, minterAddress, minterUtxos } = params;

  // Determine completion number from existing EGO tokens
  const existingTokens = await getAllEgoTokens(agentAddress);
  const completionNumber = existingTokens.length + 1;

  const currentHeight = await getCurrentHeight();

  return buildEgoMintTx({
    agentAddress,
    agentName,
    amount: EGO_TOKENS_PER_COMPLETION,
    completionNumber,
    minterAddress,
    minterUtxos,
    currentHeight,
  });
}

// ─── Utilities ───────────────────────────────────────────────────────

export function egoTokenExplorerUrl(tokenId: string): string {
  return `https://explorer.ergoplatform.com/en/token/${tokenId}`;
}

export { EGO_TOKENS_PER_COMPLETION, EGO_TOKEN_PREFIX };
