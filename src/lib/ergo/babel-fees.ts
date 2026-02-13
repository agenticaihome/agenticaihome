/**
 * ─── Babel Fees (EIP-31) for EGO Token Payments ─────────────────────────────
 *
 * Enables users to pay Ergo transaction fees using EGO tokens instead of ERG.
 *
 * HOW EIP-31 WORKS:
 * 1. A "supporter" (Babel Fee Bot) locks ERG in a babel fee box with a price
 *    (nanoERG per EGO token) set in register R5.
 * 2. A user who needs to pay fees finds a babel fee box, spends it as a TX input,
 *    and recreates it as a TX output with:
 *    - Less ERG (the fee they need)
 *    - More EGO tokens (enough to cover the ERG at the R5 rate)
 * 3. The supporter profits from the spread between the rate they set and market price.
 *
 * KEY DIFFERENCE FROM CARDANO BABEL FEES:
 * - Cardano: user publishes incomplete TX, hopes someone completes it
 * - Ergo (EIP-31): supporter pre-publishes liquidity boxes, user knows upfront
 *   if babel fees are available and at what rate
 *
 * IMPORTANT DESIGN NOTE:
 * The existing EGO tokens on AgenticAiHome are SOULBOUND (non-transferable).
 * For Babel fees to work, we need a FUNGIBLE EGO utility token that users can
 * freely transfer. This module assumes a fungible EGO token exists or will be
 * created. The soulbound EGO reputation tokens remain separate.
 *
 * @see https://github.com/ergoplatform/eips/blob/master/eip-0031.md
 */

import {
  TransactionBuilder,
  OutputBuilder,
  ErgoAddress,
  SConstant,
  SLong,
  SInt,
  SSigmaProp,
  SGroupElement,
  SColl,
  SByte,
} from '@fleet-sdk/core';
import { getCurrentHeight, getBoxesByAddress, getBoxById } from './explorer';
import type { Box } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, ERGO_EXPLORER_API } from './constants';
import { pubkeyFromAddress } from './address-utils';

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Fungible EGO utility token ID for Babel fee payments.
 * 
 * TODO: Replace with actual fungible EGO token ID once minted.
 * This is NOT the soulbound EGO reputation token — it's a separate fungible
 * utility token that users earn/purchase for platform interactions.
 */
export const EGO_FUNGIBLE_TOKEN_ID = 'PLACEHOLDER_EGO_FUNGIBLE_TOKEN_ID';

/**
 * EIP-31 Babel Fee contract ErgoTree template.
 * The {tokenId} placeholder is replaced with the actual token ID at runtime.
 * This template is from the EIP-31 specification — DO NOT MODIFY.
 */
const BABEL_FEE_ERGOTREE_TEMPLATE =
  '100604000e20{tokenId}0400040005000500d803d601e30004d602e4c6a70408d603e4c6a7050595e67201d804d604b2a5e4720100d605b2db63087204730000d606db6308a7d60799c1a7c17204d1968302019683050193c27204c2a7938c720501730193e4c672040408720293e4c672040505720393e4c67204060ec5a796830201929c998c7205029591b1720673028cb272067303000273047203720792720773057202';

/**
 * Derive the babel fee contract ErgoTree for a specific token.
 * Each token gets a unique P2S address (same contract, different hardcoded token ID).
 */
export function getBabelFeeErgoTree(tokenId: string): string {
  return BABEL_FEE_ERGOTREE_TEMPLATE.replace('{tokenId}', tokenId);
}

/**
 * Derive the babel fee P2S address for EGO token.
 * All babel fee boxes for EGO will live at this address.
 */
export function getEgoBabelFeeAddress(): string {
  const ergoTree = getBabelFeeErgoTree(EGO_FUNGIBLE_TOKEN_ID);
  return ErgoAddress.fromErgoTree(ergoTree).toString();
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Check if a user has enough fungible EGO tokens to pay babel fees.
 * Returns the user's fungible EGO balance and whether babel fee boxes exist.
 */
export async function canUseBabelFees(userAddress: string): Promise<{
  hasEgoTokens: boolean;
  egoBalance: bigint;
  babelBoxesAvailable: boolean;
  bestRate: bigint | null; // nanoERG per EGO token
}> {
  try {
    // Check user's fungible EGO balance
    const balanceRes = await fetch(
      `${ERGO_EXPLORER_API}/addresses/${userAddress}/balance/confirmed`
    );
    const balance = await balanceRes.json();

    let egoBalance = BigInt(0);
    if (balance.tokens) {
      const egoToken = balance.tokens.find(
        (t: { tokenId: string; amount: string }) => t.tokenId === EGO_FUNGIBLE_TOKEN_ID
      );
      if (egoToken) {
        egoBalance = BigInt(egoToken.amount);
      }
    }

    // Check for available babel fee boxes
    const babelAddress = getEgoBabelFeeAddress();
    const babelBoxes = await getBoxesByAddress(babelAddress);

    let bestRate: bigint | null = null;
    for (const box of babelBoxes) {
      // R5 contains the nanoERG price per token
      const r5 = box.additionalRegisters?.R5;
      if (r5) {
        const rate = decodeR5Rate(r5);
        if (rate && (!bestRate || rate > bestRate)) {
          bestRate = rate; // Higher rate = more ERG per EGO = better for user
        }
      }
    }

    return {
      hasEgoTokens: egoBalance > BigInt(0),
      egoBalance,
      babelBoxesAvailable: babelBoxes.length > 0,
      bestRate,
    };
  } catch (error) {
    console.error('Failed to check babel fee availability:', error);
    return {
      hasEgoTokens: false,
      egoBalance: BigInt(0),
      babelBoxesAvailable: false,
      bestRate: null,
    };
  }
}

/**
 * Estimate the EGO token cost for a given ERG fee amount.
 * Uses the best available babel fee box rate.
 *
 * @param feeNanoErg - Transaction fee in nanoERG (default: RECOMMENDED_TX_FEE)
 * @returns EGO tokens needed, or null if no babel boxes available
 */
export async function estimateBabelFeeRate(
  feeNanoErg: bigint = RECOMMENDED_TX_FEE
): Promise<{
  egoTokensNeeded: bigint;
  rateNanoErgPerEgo: bigint;
  babelBoxId: string;
} | null> {
  try {
    const babelAddress = getEgoBabelFeeAddress();
    const babelBoxes = await getBoxesByAddress(babelAddress);

    if (babelBoxes.length === 0) return null;

    // Find the best box: enough ERG to cover fee, best rate for user
    let bestBox: Box | null = null;
    let bestRate = BigInt(0);

    for (const box of babelBoxes) {
      const r5 = box.additionalRegisters?.R5;
      if (!r5) continue;

      const rate = decodeR5Rate(r5);
      if (!rate || rate <= BigInt(0)) continue;

      const boxErg = BigInt(box.value);
      // Box must have enough ERG to cover the fee + MIN_BOX_VALUE for recreated box
      if (boxErg >= feeNanoErg + MIN_BOX_VALUE) {
        if (rate > bestRate) {
          bestRate = rate;
          bestBox = box;
        }
      }
    }

    if (!bestBox || bestRate <= BigInt(0)) return null;

    // Calculate EGO tokens needed: ceil(feeNanoErg / ratePerToken)
    const egoNeeded = (feeNanoErg + bestRate - BigInt(1)) / bestRate;

    return {
      egoTokensNeeded: egoNeeded,
      rateNanoErgPerEgo: bestRate,
      babelBoxId: bestBox.boxId,
    };
  } catch (error) {
    console.error('Failed to estimate babel fee rate:', error);
    return null;
  }
}

/**
 * Create a babel fee box — called by the Babel Fee Bot (supporter).
 * Locks ERG in the EIP-31 contract, offering to exchange EGO tokens for ERG.
 *
 * @param creatorAddress - Bot/supporter wallet address
 * @param ergAmount - nanoERG to lock in the babel box
 * @param rateNanoErgPerEgo - How many nanoERG the supporter pays per 1 EGO token
 * @param utxos - Available UTXOs from the creator's wallet
 * @returns Unsigned transaction to create the babel fee box
 */
export async function createBabelFeeBox(
  creatorAddress: string,
  ergAmount: bigint,
  rateNanoErgPerEgo: bigint,
  utxos: Box[]
): Promise<ReturnType<TransactionBuilder['build']>> {
  const height = await getCurrentHeight();
  const babelErgoTree = getBabelFeeErgoTree(EGO_FUNGIBLE_TOKEN_ID);
  const creatorPubkey = pubkeyFromAddress(creatorAddress);

  const babelOutput = new OutputBuilder(ergAmount, babelErgoTree)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(creatorPubkey))),
      R5: SConstant(SLong(rateNanoErgPerEgo)),
    });

  const tx = new TransactionBuilder(height)
    .from(utxos)
    .to([babelOutput])
    .sendChangeTo(creatorAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build();

  return tx;
}

/**
 * Build a transaction that uses a babel fee box to pay fees with EGO tokens.
 *
 * This wraps an existing transaction's intent with babel fee support:
 * 1. Adds the babel fee box as an input
 * 2. Recreates the babel fee box as an output (with less ERG, more EGO)
 * 3. The ERG difference covers the transaction fee
 * 4. User provides EGO tokens from their wallet
 *
 * @param userAddress - User's wallet address
 * @param userUtxos - User's available UTXOs (must contain EGO tokens)
 * @param outputs - Desired transaction outputs (the "real" transaction)
 * @param babelBoxId - ID of the babel fee box to use
 * @returns Unsigned transaction with babel fee support
 */
export async function buildTransactionWithBabelFee(
  userAddress: string,
  userUtxos: Box[],
  outputs: OutputBuilder[],
  babelBoxId?: string
): Promise<ReturnType<TransactionBuilder['build']>> {
  const height = await getCurrentHeight();

  // Find best babel fee box if not specified
  let babelBox: Box | null;
  if (babelBoxId) {
    babelBox = await getBoxById(babelBoxId);
  } else {
    const estimate = await estimateBabelFeeRate();
    if (!estimate) {
      throw new Error('No babel fee boxes available. User must pay fees in ERG.');
    }
    babelBox = await getBoxById(estimate.babelBoxId);
  }
  if (!babelBox) {
    throw new Error('Babel fee box not found on-chain.');
  }

  // Parse babel box parameters
  const r5 = babelBox.additionalRegisters?.R5;
  if (!r5) throw new Error('Invalid babel fee box: missing R5 (rate)');
  const rate = decodeR5Rate(r5);
  if (!rate) throw new Error('Invalid babel fee box: cannot decode R5 rate');

  const babelBoxErg = BigInt(babelBox.value);
  const feeNeeded = RECOMMENDED_TX_FEE;

  // Ensure babel box has enough ERG
  if (babelBoxErg < feeNeeded + MIN_BOX_VALUE) {
    throw new Error('Babel fee box does not have enough ERG to cover fees');
  }

  // Calculate EGO tokens the user must provide
  const egoTokensNeeded = (feeNeeded + rate - BigInt(1)) / rate;

  // Existing tokens in the babel box
  const existingBabelTokens = babelBox.assets?.find(
    (a) => a.tokenId === EGO_FUNGIBLE_TOKEN_ID
  );
  const existingTokenAmount = existingBabelTokens ? BigInt(existingBabelTokens.amount) : BigInt(0);

  // Recreate the babel fee box with less ERG and more EGO tokens
  // The recreated box index will be set as context variable 0
  const recreatedBabelOutput = new OutputBuilder(
    babelBoxErg - feeNeeded,
    babelBox.ergoTree
  )
    .addTokens({
      tokenId: EGO_FUNGIBLE_TOKEN_ID,
      amount: (existingTokenAmount + egoTokensNeeded).toString(),
    })
    .setAdditionalRegisters({
      R4: babelBox.additionalRegisters.R4, // preserve creator pubkey
      R5: babelBox.additionalRegisters.R5, // preserve rate
      R6: SColl(SByte, babelBox.boxId),    // spent box ID (required by contract)
    });

  // Build the transaction:
  // - Inputs: babel fee box + user's UTXOs
  // - Outputs: recreated babel box (index 0) + user's desired outputs + change
  const tx = new TransactionBuilder(height)
    .from([babelBox, ...userUtxos])
    .to([recreatedBabelOutput, ...outputs])
    .sendChangeTo(userAddress)
    .payFee(feeNeeded)
    // Context variable 0 on the babel box input: index of recreated box in outputs
    .configureSelector((selector) =>
      selector.ensureInclusion(babelBox.boxId)
    )
    .build();

  // NOTE: The context variable (Var 0 = recreated box index) must be set
  // on the babel fee box input. Fleet SDK handles this via the spending proof.
  // The recreated babel box should be at OUTPUTS(0) based on our ordering.
  //
  // TODO: Verify Fleet SDK context extension API — may need:
  // .setContextExtension(babelBox.boxId, { 0: SConstant(SInt(0)) })

  return tx;
}

/**
 * Fulfill a babel fee box — called by the Babel Fee Bot.
 * The bot withdraws accumulated EGO tokens and optionally tops up the ERG.
 *
 * @param babelBoxId - The babel fee box to withdraw from
 * @param botAddress - Bot's wallet address (must match R4 creator)
 * @param botUtxos - Bot's available UTXOs
 * @returns Unsigned transaction to withdraw/manage the babel box
 */
export async function fulfillBabelFee(
  babelBoxId: string,
  botAddress: string,
  botUtxos: Box[]
): Promise<ReturnType<TransactionBuilder['build']>> {
  const height = await getCurrentHeight();
  const babelBox = await getBoxById(babelBoxId);
  if (!babelBox) {
    throw new Error('Babel fee box not found on-chain.');
  }

  // Bot just spends the box (R4 creator path — no context variable needed)
  // This withdraws all ERG + accumulated EGO tokens to the bot's address
  const tx = new TransactionBuilder(height)
    .from([babelBox as any, ...botUtxos])
    .sendChangeTo(botAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build();

  return tx;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Decode the R5 register value (nanoERG per token rate).
 * R5 is encoded as SLong in the explorer API.
 */
/**
 * Decode SLong from serialized hex using proper VLQ + ZigZag decoding.
 * SLong format: type byte (05) + VLQ-encoded ZigZag value.
 */
function decodeR5Rate(r5Hex: string): bigint | null {
  try {
    if (!r5Hex.startsWith('05')) return null;

    // Decode VLQ (Variable-Length Quantity)
    let offset = 2; // skip type byte
    let result = 0n;
    let shift = 0n;
    while (offset < r5Hex.length) {
      const byte = parseInt(r5Hex.slice(offset, offset + 2), 16);
      offset += 2;
      result |= BigInt(byte & 0x7f) << shift;
      shift += 7n;
      if ((byte & 0x80) === 0) break;
    }

    // ZigZag decode: (n >>> 1) ^ -(n & 1)
    const value = (result >> 1n) ^ -(result & 1n);
    return value;
  } catch {
    return null;
  }
}

/**
 * Find all available babel fee boxes for EGO token.
 * Useful for UI display and bot monitoring.
 */
export async function findBabelFeeBoxes(): Promise<Array<{
  boxId: string;
  ergAvailable: bigint;
  rateNanoErgPerEgo: bigint;
  egoTokensAccumulated: bigint;
  creatorAddress: string;
}>> {
  try {
    const babelAddress = getEgoBabelFeeAddress();
    const boxes = await getBoxesByAddress(babelAddress);

    return boxes
      .map((box) => {
        const r5 = box.additionalRegisters?.R5;
        const rate = r5 ? decodeR5Rate(r5) : null;
        if (!rate) return null;

        const egoAsset = box.assets?.find((a) => a.tokenId === EGO_FUNGIBLE_TOKEN_ID);

        return {
          boxId: box.boxId,
          ergAvailable: BigInt(box.value),
          rateNanoErgPerEgo: rate,
          egoTokensAccumulated: egoAsset ? BigInt(egoAsset.amount) : BigInt(0),
          creatorAddress: box.address,
        };
      })
      .filter(Boolean) as Array<{
        boxId: string;
        ergAvailable: bigint;
        rateNanoErgPerEgo: bigint;
        egoTokensAccumulated: bigint;
        creatorAddress: string;
      }>;
  } catch (error) {
    console.error('Failed to find babel fee boxes:', error);
    return [];
  }
}
