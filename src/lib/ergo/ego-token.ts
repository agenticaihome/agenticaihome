import {
  TransactionBuilder,
  OutputBuilder,
  ErgoAddress,
  SConstant,
  SSigmaProp,
  SGroupElement,
  SByte,
  SColl,
} from '@fleet-sdk/core';
import { getCurrentHeight, getAddressBalance, getTokenInfo } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, ERGO_EXPLORER_API } from './constants';
import { pubkeyFromAddress } from './address-utils';

// ─── Soulbound Contract ──────────────────────────────────────────────

/**
 * ErgoScript: Soulbound EGO Token Contract
 *
 * Tokens minted to this contract can NEVER be transferred to a different owner.
 * The agent's SigmaProp is stored in R4. To spend the box:
 *   1. Agent must sign (R4 SigmaProp)
 *   2. Token must go to an output with the SAME contract (propositionBytes)
 *   3. That output must have the SAME agent in R4
 *
 * This means the token is permanently bound to the agent who earned it.
 */
export const SOULBOUND_ERGOSCRIPT = `{
  val agentPk = SELF.R4[SigmaProp].get
  val egoTokenId = SELF.tokens(0)._1
  val tokenOutputs = OUTPUTS.filter { (box: Box) =>
    box.tokens.exists { (t: (Coll[Byte], Long)) => t._1 == egoTokenId }
  }
  val soulbound = tokenOutputs.size == 1 &&
    tokenOutputs(0).propositionBytes == SELF.propositionBytes &&
    tokenOutputs(0).R4[SigmaProp].get == agentPk
  agentPk && sigmaProp(soulbound)
}`;

/**
 * Pre-compiled P2S address for the soulbound contract (mainnet).
 * Compiled via node.ergo.watch on 2026-02-09.
 * If SOULBOUND_ERGOSCRIPT changes, this MUST be re-compiled.
 */
export const SOULBOUND_CONTRACT_ADDRESS =
  '49AoNXDVGUF3Y1XVFRjUa22LFJjV2pwQiLCd3usdRaAFvZGNXVCMMqaCL8pEBpqFLko8Bmh222hNh7w722E8bMJRuWT3QG2LCxGjRnv6AKrLAY2ZEA1BrngJynGAT79Z';

// ─── Constants ───────────────────────────────────────────────────────

const EGO_TOKEN_PREFIX = 'EGO-';
const EGO_TOKENS_PER_COMPLETION = 10;
const EGO_DESCRIPTION_PREFIX = 'AgenticAiHome Soulbound Reputation Token for';

// ─── Types ───────────────────────────────────────────────────────────

export interface EgoToken {
  tokenId: string;
  name: string;
  amount: bigint;
  description: string;
}

export interface EgoMintParams {
  agentAddress: string;  // Agent's P2PK address (goes into R4 as SigmaProp)
  agentName: string;
  amount?: number;       // defaults to EGO_TOKENS_PER_COMPLETION
  completionNumber?: number;
  minterAddress: string; // Client paying for mint
  minterUtxos: any[];
  currentHeight: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

// pubkeyFromAddress now imported from ./address-utils

// ─── Token Query Functions ───────────────────────────────────────────

/**
 * Get all EGO tokens held at the soulbound contract address.
 * Since all agents' EGO tokens live at the same contract address,
 * we need to check R4 to filter by agent.
 *
 * For now, we query the contract address and filter by token name prefix.
 * In the future, we can filter by R4 register value.
 */
export async function getAllEgoTokens(agentAddress: string): Promise<EgoToken[]> {
  try {
    // Check both: tokens at agent's direct address (legacy) and at soulbound contract
    const [directBalance, contractBoxes] = await Promise.all([
      getAddressBalance(agentAddress).catch(() => ({ confirmed: { tokens: [] } })),
      getContractBoxesForAgent(agentAddress).catch(() => []),
    ]);

    const egoTokens: EgoToken[] = [];

    // Legacy: tokens sent directly to agent address (old mints)
    const directTokens = directBalance.confirmed.tokens || [];
    for (const token of directTokens) {
      const name = token.name || '';
      if (name.startsWith(EGO_TOKEN_PREFIX)) {
        let description = '';
        try {
          const info = await getTokenInfo(token.tokenId);
          description = info?.description || '';
        } catch { /* ignore */ }
        egoTokens.push({ tokenId: token.tokenId, name, amount: BigInt(token.amount), description });
      }
    }

    // New: tokens at soulbound contract boxes with this agent's key in R4
    for (const box of contractBoxes) {
      for (const token of (box.assets || [])) {
        const name = token.name || '';
        if (name.startsWith(EGO_TOKEN_PREFIX)) {
          egoTokens.push({
            tokenId: token.tokenId,
            name,
            amount: BigInt(token.amount),
            description: `Soulbound EGO token (contract-locked)`,
          });
        }
      }
    }

    return egoTokens;
  } catch (error) {
    console.error('Failed to fetch EGO tokens:', error);
    return [];
  }
}

/**
 * Get unspent boxes at the soulbound contract address that belong to a specific agent.
 * Checks R4 register for matching agent SigmaProp.
 */
async function getContractBoxesForAgent(agentAddress: string): Promise<any[]> {
  try {
    const response = await fetch(
      `${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS}?limit=100`
    );
    if (!response.ok) {
      // Failed to fetch soulbound contract boxes
      return [];
    }
    const data = await response.json();
    const boxes = data.items || data || [];

    // Validate agent address
    if (!agentAddress || typeof agentAddress !== 'string') {
      // Invalid agent address for contract box filtering
      return [];
    }

    // Get agent's public key from address
    let agentPubkeyHex: string;
    try {
      const agentErgoTree = ErgoAddress.fromBase58(agentAddress).ergoTree;
      // For P2PK addresses, the pubkey hex is in the ergoTree after "0008cd"
      if (!agentErgoTree.startsWith('0008cd') || agentErgoTree.length < 72) {
        // Agent address is not a valid P2PK address
        return [];
      }
      agentPubkeyHex = agentErgoTree.slice(6); // Remove "0008cd" prefix
    } catch (error) {
      console.error('Failed to parse agent address:', error);
      return [];
    }

    // Filter boxes where R4 contains this agent's SigmaProp
    const agentBoxes = boxes.filter((box: any) => {
      try {
        const r4 = box.additionalRegisters?.R4;
        if (!r4) return false;
        
        // R4 contains serialized SigmaProp with the agent's public key
        // Check both serializedValue and renderedValue for the pubkey
        const serializedValue = r4.serializedValue || '';
        const renderedValue = r4.renderedValue || '';
        
        // More robust matching: check if the pubkey appears in either value
        const pubkeyFound = serializedValue.toLowerCase().includes(agentPubkeyHex.toLowerCase()) ||
                           renderedValue.toLowerCase().includes(agentPubkeyHex.toLowerCase());
        
        return pubkeyFound;
      } catch (error) {
        // Error processing contract box R4 register
        return false;
      }
    });

    return agentBoxes;
  } catch (error) {
    console.error('Error fetching contract boxes for agent:', error);
    return [];
  }
}

/**
 * Get total EGO score for an address (sum of all EGO token amounts).
 */
export async function getTotalEgoScore(address: string): Promise<bigint> {
  const tokens = await getAllEgoTokens(address);
  return tokens.reduce((sum, t) => sum + t.amount, BigInt(0));
}

/**
 * Check if an agent already has any EGO tokens.
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
  const totalAmount = tokens.reduce((sum, t) => sum + t.amount, BigInt(0));
  return { tokenId: tokens[0].tokenId, amount: totalAmount };
}

// ─── Token Minting (Soulbound) ──────────────────────────────────────

/**
 * Build a SOULBOUND EGO token mint transaction.
 *
 * Tokens are minted to the soulbound contract address with the agent's
 * SigmaProp in R4. This makes them permanently bound to the agent —
 * they can never be transferred to a different address.
 *
 * The minter (client) pays for the transaction.
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

  // Token naming: EGO-AgentName-#N
  const tokenName = completionNumber
    ? `${EGO_TOKEN_PREFIX}${agentName}-#${completionNumber}`
    : `${EGO_TOKEN_PREFIX}${agentName}`;

  const tokenDescription = `${EGO_DESCRIPTION_PREFIX} ${agentName}. Soulbound — locked by ErgoScript contract.`;

  // Extract agent's public key for R4
  const agentPubkey = pubkeyFromAddress(agentAddress);

  // Build output: token goes to SOULBOUND CONTRACT, not agent's wallet
  // R4 = agent's SigmaProp (only they can interact with this box)
  const tokenOutput = new OutputBuilder(MIN_BOX_VALUE, SOULBOUND_CONTRACT_ADDRESS)
    .mintToken({
      amount: BigInt(amount).toString(),
      name: tokenName,
      decimals: 0,
      description: tokenDescription,
    })
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(agentPubkey))),
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
 * Convenience wrapper that determines completion number automatically.
 */
export async function mintEgoAfterRelease(params: {
  agentAddress: string;
  agentName: string;
  minterAddress: string;
  minterUtxos: any[];
}): Promise<any> {
  const { agentAddress, agentName, minterAddress, minterUtxos } = params;

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

export function soulboundContractExplorerUrl(): string {
  return `https://explorer.ergoplatform.com/en/addresses/${SOULBOUND_CONTRACT_ADDRESS}`;
}

export { EGO_TOKENS_PER_COMPLETION, EGO_TOKEN_PREFIX };
