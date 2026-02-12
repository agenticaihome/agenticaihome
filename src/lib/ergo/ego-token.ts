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
 * ErgoScript: Soulbound EGO Token Contract v2
 *
 * Tokens minted to this contract can NEVER be transferred to a different owner.
 * R4/R5/R6 are reserved for EIP-4 token metadata (name, description, decimals).
 * The agent's SigmaProp is stored in R7. To spend the box:
 *   1. Agent must sign (R7 SigmaProp)
 *   2. Token must go to an output with the SAME contract (propositionBytes)
 *   3. That output must have the SAME agent in R7
 *
 * This enables atomic single-TX minting with proper on-chain metadata.
 */
/**
 * Soulbound EGO Token Contract V2 — Hardened after external audit (Feb 11, 2026)
 *
 * Audit findings addressed:
 *   1. CRITICAL: OUTPUTS(0) soulbound bypass → already using OUTPUTS.filter (V2 was clean)
 *   2. HIGH: Token amount not enforced → added exact amount preservation
 *   3. MEDIUM: Register state not preserved → R4-R6 (EIP-4 metadata) + R7 (agent) all enforced
 *   4. MEDIUM: Value preservation missing → min box value enforced on output
 *   5. LOW: Creation height window → not used (correct, no expiry)
 *
 * Invariants:
 *   - Token goes to exactly 1 output box
 *   - Output must be at same contract address (propositionBytes match)
 *   - Agent pubkey (R7) must be preserved (soulbound)
 *   - Token amount must be exactly preserved (no partial burn)
 *   - EIP-4 metadata registers (R4/R5/R6) must be preserved (immutable name/desc)
 *   - Output must maintain minimum ERG value
 *   - Agent must sign the transaction
 */
export const SOULBOUND_ERGOSCRIPT_V2 = `{
  val agentPk = SELF.R7[SigmaProp].get
  val egoTokenId = SELF.tokens(0)._1
  val egoTokenAmt = SELF.tokens(0)._2
  val minBoxVal = 1000000L

  val tokenOutputs = OUTPUTS.filter { (box: Box) =>
    box.tokens.exists { (t: (Coll[Byte], Long)) => t._1 == egoTokenId }
  }

  // Exactly one output receives the token
  val singleOutput = tokenOutputs.size == 1
  val out = tokenOutputs(0)

  // Soulbound: stays at same contract, same agent
  val soulbound = out.propositionBytes == SELF.propositionBytes &&
    out.R7[SigmaProp].get == agentPk

  // Token amount exactly preserved (no partial burn)
  val tokenPreserved = out.tokens.exists { (t: (Coll[Byte], Long)) =>
    t._1 == egoTokenId && t._2 == egoTokenAmt
  }

  // EIP-4 metadata registers preserved (immutable name, description, decimals)
  val metadataPreserved =
    out.R4[Coll[Byte]].get == SELF.R4[Coll[Byte]].get &&
    out.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get &&
    out.R6[Coll[Byte]].get == SELF.R6[Coll[Byte]].get

  // Minimum ERG value maintained
  val valueOk = out.value >= minBoxVal

  agentPk && sigmaProp(
    singleOutput &&
    soulbound &&
    tokenPreserved &&
    metadataPreserved &&
    valueOk
  )
}`;

// ─── Soulbound V3 (Ultra-Hardened) ───────────────────────────────────────────────
// ** ULTRA-HARDENED VERSION (Feb 12, 2026) **
// Addresses all audit findings with tightened token position + singleton enforcement.
// 
// **AUDITOR FALSE POSITIVE**: The suggestion `out.id == egoTokenId` is INCORRECT.
// Box ID only equals token ID at MINT TIME. After the first spend, the output box
// gets a NEW box ID while the token ID stays the same. This is how UTXO works.
// Implementing `out.id == egoTokenId` would make tokens unspendable after first transfer.
export const SOULBOUND_ERGOSCRIPT_V3 = `{
  val agentPk     = SELF.R7[SigmaProp].get
  val egoTokenId  = SELF.tokens(0)._1
  val egoTokenAmt = SELF.tokens(0)._2
  val minBoxVal   = 1000000L

  // STRICT: exactly one output has ANY of our token, and it must be first token
  val tokenOutputs = OUTPUTS.filter { (box: Box) =>
    box.tokens.size > 0 && box.tokens(0)._1 == egoTokenId  // Token MUST be in position 0
  }

  val singleOutput = tokenOutputs.size == 1
  val out = tokenOutputs(0)

  // Soulbound: stays at same contract, same agent
  val soulbound = out.propositionBytes == SELF.propositionBytes &&
    out.R7[SigmaProp].get == agentPk

  // Token: must be ONLY token (singleton), exact amount preserved
  val tokenPreserved = out.tokens.size == 1 &&             // STRICT: exactly 1 token
    out.tokens(0)._1 == egoTokenId &&                      // STRICT: correct token ID in pos 0
    out.tokens(0)._2 == egoTokenAmt                         // STRICT: exact amount preserved

  // EIP-4 metadata preserved (immutable name, description, decimals)
  val metadataPreserved =
    out.R4[Coll[Byte]].get == SELF.R4[Coll[Byte]].get &&
    out.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get &&
    out.R6[Coll[Byte]].get == SELF.R6[Coll[Byte]].get

  // Minimum ERG value maintained
  val valueOk = out.value >= minBoxVal

  agentPk && sigmaProp(
    singleOutput &&
    soulbound &&
    tokenPreserved &&
    metadataPreserved &&
    valueOk
  )
}`;

// V1 contract (R4 = agent pubkey) — kept for reference only, old tokens live here
// NOTE: V1 is NOT re-deployed. This source is preserved for documentation.
// Old tokens at V1 address remain readable but V1 has weaker protections.
export const SOULBOUND_ERGOSCRIPT_V1 = `{
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
 * Pre-compiled P2S address for the soulbound contract v2 (mainnet).
 * V2 uses R7 for agent pubkey, keeping R4-R6 free for EIP-4 token metadata.
 * Compiled via node.ergo.watch on 2026-02-11.
 */
/**
 * V2.1 contract address — hardened with metadata preservation + token amount enforcement.
 * Compiled via node.ergo.watch on 2026-02-11.
 * V2.0 address preserved below for backward compatibility (tokens already minted there).
 */
// V3 MIGRATION (Feb 12, 2026): Use V3 as primary for new mints, keep old versions for reading existing tokens
export const SOULBOUND_CONTRACT_ADDRESS =
  '5N4W9T1RrFxzSMTxVPoygg4xY5gNbcdKrz8x5fCLeV7iSjXnAo4cwud5oe4rEShqMfmmsRsFt8AFbj9BbkfRUcU6kDrgqzMU2keydQso4vLc6BmWpTgjikSBQSurTAqwJv1q2Q6cwoh1P5wLq8ZRPA8jKgur1sQyVy4Kt9CFCC2kq9crbdcVCoexbbyZ2MSW3D9iDm1VWdf4Hygg9ettxdXUGeQqBhcz8zgVnyFScwMLvbwhhFfv';

/** V2.0 contract address — first version with R7=agentPk. No metadata/amount preservation. */
export const SOULBOUND_CONTRACT_ADDRESS_V2_0 =
  '49AoNXDVGUF3Y1XVFRjUa22LFbYEHB7XGEJqmRZ7BDVRsGgCasqPkxhpzNQfx9ACgJizWaBNHNZiKsjU4Lzm8eUPUvsMJsnb6mzdeKVkDTCLFNo65Qk6vszw6jFijLFs';

/** V1 contract address (R4 = agent pubkey) — old tokens live here, still valid */
export const SOULBOUND_CONTRACT_ADDRESS_V1 =
  '49AoNXDVGUF3Y1XVFRjUa22LFJjV2pwQiLCd3usdRaAFvZGNXVCMMqaCL8pEBpqFLko8Bmh222hNh7w722E8bMJRuWT3QG2LCxGjRnv6AKrLAY2ZEA1BrngJynGAT79Z';

/** V3 contract address — Ultra-hardened with strict token position enforcement (compiled Feb 12, 2026) */
export const SOULBOUND_CONTRACT_ADDRESS_V3 =
  '4rpBVtyT3mwAqMYSGvUUQyuyJvn1Whxpc4k4E5gefnfBGK7dqHnqehe9Nxyubho4NJ4rn5qaFvXwGK7uRTF6VNyqECeeVAVkkyyt5W65MZShFdrt41DB32hYs9me9MuwUf8jGvfK4BvjNghg15QLNdmNaicAqiL8VYbXFzt8VnMrAg67iSXEL9NssQZRE3Ca936z71poiZmbBNMMkTZSj15zrBgo1b3Sz7529FcocTRtZiM6jJGkPaZqVQdhWxH8N46BiYgFp3W31KrVUssARg4HreXr7';

/** V3 Ultra-hardened address — PRIMARY for new EGO token mints */
export const ACTIVE_SOULBOUND_ADDRESS = SOULBOUND_CONTRACT_ADDRESS_V3;

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
        const isEgoByName = name.startsWith(EGO_TOKEN_PREFIX);
        const isIdentityNft = name.startsWith('AIH-AGENT-');
        // Only include tokens with proper EGO- prefix name (EIP-4 metadata)
        // Unnamed tokens are legacy mints from before the metadata fix — skip them
        if (isEgoByName) {
          let description = '';
          try {
            const info = await getTokenInfo(token.tokenId);
            description = info?.description || '';
          } catch { /* ignore */ }
          egoTokens.push({
            tokenId: token.tokenId,
            name,
            amount: BigInt(token.amount),
            description: description || `Soulbound EGO token (contract-locked)`,
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
 * Get unspent boxes at soulbound contract addresses that belong to a specific agent.
 * Checks V1 (R4) and V2 (R7) contracts for matching agent SigmaProp.
 */
async function getContractBoxesForAgent(agentAddress: string): Promise<any[]> {
  try {
    if (!agentAddress || typeof agentAddress !== 'string') return [];

    // Get agent's public key hex
    let agentPubkeyHex: string;
    try {
      const agentErgoTree = ErgoAddress.fromBase58(agentAddress).ergoTree;
      if (!agentErgoTree.startsWith('0008cd') || agentErgoTree.length < 72) return [];
      agentPubkeyHex = agentErgoTree.slice(6);
    } catch { return []; }

    // Fetch boxes from V1, V2.0, V2.1, and V3 contracts for backward compatibility
    const [v1Response, v20Response, v21Response, v3Response] = await Promise.all([
      fetch(`${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS_V1}?limit=100`).catch(() => null),
      fetch(`${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS_V2_0}?limit=100`).catch(() => null),
      fetch(`${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS}?limit=100`).catch(() => null),
      fetch(`${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS_V3}?limit=100`).catch(() => null),
    ]);

    const v1Data = v1Response?.ok ? await v1Response.json() : { items: [] };
    const v20Data = v20Response?.ok ? await v20Response.json() : { items: [] };
    const v21Data = v21Response?.ok ? await v21Response.json() : { items: [] };
    const v3Data = v3Response?.ok ? await v3Response.json() : { items: [] };
    const v1Boxes = v1Data.items || v1Data || [];
    const v2Boxes = [...(v20Data.items || v20Data || []), ...(v21Data.items || v21Data || [])];
    const v3Boxes = v3Data.items || v3Data || [];

    const matchesPubkey = (registerValue: any) => {
      if (!registerValue) return false;
      const serialized = (registerValue.serializedValue || '').toLowerCase();
      const rendered = (registerValue.renderedValue || '').toLowerCase();
      const pk = agentPubkeyHex.toLowerCase();
      return serialized.includes(pk) || rendered.includes(pk);
    };

    // V1 boxes: agent pubkey in R4
    const v1Matches = v1Boxes.filter((box: any) => {
      try { return matchesPubkey(box.additionalRegisters?.R4); } catch { return false; }
    });

    // V2 boxes: agent pubkey in R7
    const v2Matches = v2Boxes.filter((box: any) => {
      try { return matchesPubkey(box.additionalRegisters?.R7); } catch { return false; }
    });

    // V3 boxes: agent pubkey in R7 (same as V2)
    const v3Matches = v3Boxes.filter((box: any) => {
      try { return matchesPubkey(box.additionalRegisters?.R7); } catch { return false; }
    });

    return [...v1Matches, ...v2Matches, ...v3Matches];
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

  const agentPubkey = pubkeyFromAddress(agentAddress);

  // V2 soulbound contract: R7 = agent pubkey, R4-R6 = EIP-4 metadata.
  // Since we set additionalRegisters, Fleet SDK won't auto-populate EIP-4 from mintToken().
  // We must explicitly set R4 (name), R5 (description), R6 (decimals) as Coll[Byte].
  const nameBytes = new TextEncoder().encode(tokenName);
  const descBytes = new TextEncoder().encode(tokenDescription);
  const decimalsBytes = new TextEncoder().encode('0');

  // Use V3 ultra-hardened contract for new token mints
  const tokenOutput = new OutputBuilder(MIN_BOX_VALUE, ACTIVE_SOULBOUND_ADDRESS)
    .mintToken({
      amount: BigInt(amount).toString(),
      name: tokenName,
      decimals: 0,
      description: tokenDescription,
    })
    .setAdditionalRegisters({
      R4: SConstant(SColl(SByte, nameBytes)),          // EIP-4: token name
      R5: SConstant(SColl(SByte, descBytes)),           // EIP-4: token description
      R6: SConstant(SColl(SByte, decimalsBytes)),       // EIP-4: decimals
      R7: SConstant(SSigmaProp(SGroupElement(agentPubkey))),  // Soulbound: agent owner
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

/**
 * @deprecated V2 contract mints directly to soulbound in one TX. No step 2 needed.
 * Kept for backward compatibility but should not be called.
 */
export async function buildLockToSoulboundTx(_params: {
  tokenId: string;
  tokenAmount: number;
  agentAddress: string;
  senderAddress: string;
  senderUtxos: any[];
  currentHeight: number;
}): Promise<any> {
  throw new Error('buildLockToSoulboundTx is deprecated. V2 contract mints directly to soulbound in one atomic TX.');
}

// ─── Utilities ───────────────────────────────────────────────────────

export function egoTokenExplorerUrl(tokenId: string): string {
  return `https://explorer.ergoplatform.com/en/token/${tokenId}`;
}

export function soulboundContractExplorerUrl(): string {
  return `https://explorer.ergoplatform.com/en/addresses/${SOULBOUND_CONTRACT_ADDRESS}`;
}

export { EGO_TOKENS_PER_COMPLETION, EGO_TOKEN_PREFIX };
