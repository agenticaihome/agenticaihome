/**
 * Private Bidding — Commit-Reveal Sealed Bid System
 * ==================================================
 * 
 * Implements a cryptographic commit-reveal protocol for sealed-bid auctions
 * on Ergo blockchain. This prevents undercutting and front-running by hiding
 * bid amounts until all bids are submitted.
 * 
 * PROTOCOL OVERVIEW:
 * 
 * 1. COMMIT PHASE (blocks 0 → commitDeadline):
 *    - Bidder generates random 32-byte salt
 *    - Bidder computes commitment = blake2b256(longToByteArray(amount) ++ salt)
 *    - Bidder creates a box with: commitment hash, locked ERG, bidder pubkey
 *    - Nobody can see the bid amount (only the hash is on-chain)
 * 
 * 2. REVEAL PHASE (blocks commitDeadline → refundDeadline):
 *    - Bidder spends their commit box, providing amount + salt in the output
 *    - Contract verifies: blake2b256(amount ++ salt) == stored commitment
 *    - Revealed bid amount is now public
 * 
 * 3. SELECTION PHASE (after all reveals):
 *    - Task owner reviews revealed bids and selects winner
 *    - Winner's funds move to escrow for task execution
 *    - Losing bidders reclaim their funds
 * 
 * SECURITY:
 * - Commitment hiding: hash is one-way, amount cannot be derived
 * - Commitment binding: bidder cannot change amount after committing
 * - Salt prevents brute-force (bid amounts are small search space without salt)
 * - Height-based deadlines enforced on-chain (no trusted coordinator)
 */

import {
  TransactionBuilder,
  OutputBuilder,
  SConstant,
  SInt,
  SLong,
  SColl,
  SByte,
  SSigmaProp,
  SGroupElement,
  ErgoAddress,
} from '@fleet-sdk/core';
import { getCurrentHeight, getBoxesByAddress, getBoxById } from './explorer';
import {
  MIN_BOX_VALUE,
  RECOMMENDED_TX_FEE,
  SEALED_BID_CONTRACT_ADDRESS,
  BID_REVEAL_CONTRACT_ADDRESS,
} from './constants';
import { pubkeyFromAddress, propositionBytesFromAddress } from './address-utils';
import { compileErgoScript } from './compiler';

// ─── Types ───────────────────────────────────────────────────────────

export interface SealedBidParams {
  taskId: string;
  bidAmountNanoErg: bigint;
  bidderAddress: string;
  /** Commit deadline: no new bids after this height */
  commitDeadlineHeight: number;
  /** Refund deadline: unrevealed bids reclaimable after this */
  refundDeadlineHeight: number;
}

export interface SealedBidCommitment {
  boxId: string;
  commitHash: string;
  bidderAddress: string;
  commitDeadlineHeight: number;
  refundDeadlineHeight: number;
  taskId: string;
  lockedValue: bigint;
  creationHeight: number;
}

export interface RevealedBid {
  boxId: string;
  bidAmountNanoErg: bigint;
  bidderAddress: string;
  taskId: string;
  salt: Uint8Array;
  commitHash: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Default commit window: ~720 blocks (~1 day on Ergo's 2-min blocks) */
export const DEFAULT_COMMIT_WINDOW_BLOCKS = 720;

/** Default reveal window: ~360 blocks (~12 hours) after commit deadline */
export const DEFAULT_REVEAL_WINDOW_BLOCKS = 360;

/** Default selection window: ~360 blocks (~12 hours) after reveal deadline */
export const DEFAULT_SELECTION_WINDOW_BLOCKS = 360;

// ─── Cryptographic Helpers ───────────────────────────────────────────

/**
 * Generate a cryptographically secure 32-byte salt for bid commitment.
 * 
 * The salt is critical for security: without it, an attacker could brute-force
 * the bid amount by hashing all possible amounts and comparing to the on-chain hash.
 * Since bid amounts are typically in a small range (e.g., 1-10000 ERG), 
 * the salt adds 256 bits of entropy making brute-force infeasible.
 */
export function generateBidSalt(): Uint8Array {
  const salt = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(salt);
  } else {
    // Node.js environment
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('crypto');
    const buf = randomBytes(32);
    salt.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  }
  return salt;
}

/**
 * Convert a bigint to an 8-byte big-endian byte array (matches ErgoScript's longToByteArray).
 */
function longToByteArray(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Number(value & 0xFFn);
    value >>= 8n;
  }
  return bytes;
}

/**
 * Compute the bid commitment hash: blake2b256(longToByteArray(amount) ++ salt).
 * 
 * This must match exactly what the ErgoScript contract computes on-chain.
 * Uses blake2b-256 which is natively supported by ErgoScript.
 * 
 * @param amountNanoErg - Bid amount in nanoERG
 * @param salt - 32-byte random salt
 * @returns 32-byte blake2b256 hash as Uint8Array
 */
export async function hashBid(amountNanoErg: bigint, salt: Uint8Array): Promise<Uint8Array> {
  if (salt.length !== 32) {
    throw new Error(`Salt must be 32 bytes, got ${salt.length}`);
  }
  
  // Concatenate longToByteArray(amount) ++ salt
  const amountBytes = longToByteArray(amountNanoErg);
  const preimage = new Uint8Array(8 + 32);
  preimage.set(amountBytes, 0);
  preimage.set(salt, 8);
  
  // Use blake2b-256 (matching ErgoScript's blake2b256)
  // We use the blakejs library which is commonly available in Ergo ecosystem
  const { blake2b } = await import('blakejs');
  return blake2b(preimage, undefined, 32);
}

/**
 * Convert bytes to hex string for display/storage.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string to bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ─── Salt Storage ────────────────────────────────────────────────────
// 
// CRITICAL: The salt must be stored locally by the bidder. If lost, the bid
// cannot be revealed and the funds are locked until refund deadline.
// We store in localStorage as a fallback, but users should be warned to save it.

const SALT_STORAGE_KEY = 'aih_bid_salts';

interface StoredSalt {
  taskId: string;
  boxId: string;
  salt: string; // hex-encoded
  amount: string; // nanoERG as string (bigint serialization)
  createdAt: number;
}

/**
 * Store bid salt locally so the bidder can reveal later.
 * WARNING: If localStorage is cleared, the salt is lost and funds are locked until refund.
 */
export function storeSalt(taskId: string, boxId: string, salt: Uint8Array, amountNanoErg: bigint): void {
  if (typeof window === 'undefined') return;
  
  const existing = JSON.parse(localStorage.getItem(SALT_STORAGE_KEY) || '[]') as StoredSalt[];
  existing.push({
    taskId,
    boxId,
    salt: bytesToHex(salt),
    amount: amountNanoErg.toString(),
    createdAt: Date.now(),
  });
  localStorage.setItem(SALT_STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Retrieve stored salt for a specific commit box.
 */
export function getSaltForBox(boxId: string): { salt: Uint8Array; amount: bigint } | null {
  if (typeof window === 'undefined') return null;
  
  const stored = JSON.parse(localStorage.getItem(SALT_STORAGE_KEY) || '[]') as StoredSalt[];
  const entry = stored.find(s => s.boxId === boxId);
  if (!entry) return null;
  
  return {
    salt: hexToBytes(entry.salt),
    amount: BigInt(entry.amount),
  };
}

/**
 * Get all stored salts for a task (for the current bidder).
 */
export function getSaltsForTask(taskId: string): StoredSalt[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(SALT_STORAGE_KEY) || '[]')
    .filter((s: StoredSalt) => s.taskId === taskId);
}

// ─── Transaction Builders ────────────────────────────────────────────

/**
 * Create a sealed bid (commit phase transaction).
 * 
 * Builds a transaction that:
 * 1. Takes ERG from the bidder's wallet
 * 2. Creates a box at the sealed bid contract address with:
 *    - Value: bid amount + fees
 *    - R4: commitment hash (blake2b256 of amount + salt)
 *    - R5: bidder's public key (SigmaProp)
 *    - R6: commit deadline height
 *    - R7: refund deadline height  
 *    - R8: task ID
 * 
 * @returns Unsigned transaction ready for wallet signing
 */
export async function createSealedBid(params: SealedBidParams, salt: Uint8Array) {
  const {
    taskId,
    bidAmountNanoErg,
    bidderAddress,
    commitDeadlineHeight,
    refundDeadlineHeight,
  } = params;

  // Validate parameters
  if (bidAmountNanoErg < MIN_BOX_VALUE) {
    throw new Error(`Bid amount must be at least ${MIN_BOX_VALUE} nanoERG`);
  }
  if (commitDeadlineHeight >= refundDeadlineHeight) {
    throw new Error('Refund deadline must be after commit deadline');
  }
  if (salt.length !== 32) {
    throw new Error('Salt must be 32 bytes');
  }

  const currentHeight = await getCurrentHeight();
  if (currentHeight >= commitDeadlineHeight) {
    throw new Error('Commit deadline has already passed');
  }

  // Compute commitment hash
  const commitHash = await hashBid(bidAmountNanoErg, salt);
  
  // Get bidder's public key for SigmaProp
  const bidderPubkey = pubkeyFromAddress(bidderAddress);

  // Get bidder's UTXOs for inputs
  const wallet = (window as unknown as Record<string, unknown>).ergoConnector 
    ? await ((window as unknown) as Record<string, unknown> & { ergo: { get_utxos: () => Promise<unknown[]> } }).ergo.get_utxos()
    : [];

  // Build the sealed bid output
  const sealedBidOutput = new OutputBuilder(
    bidAmountNanoErg + RECOMMENDED_TX_FEE, // Lock bid amount + fee buffer
    SEALED_BID_CONTRACT_ADDRESS
  )
    .setAdditionalRegisters({
      R4: SConstant(SColl(SByte, Array.from(commitHash))),
      R5: SConstant(SSigmaProp(SGroupElement(Buffer.from(bidderPubkey).toString('hex')))),
      R6: SConstant(SInt(commitDeadlineHeight)),
      R7: SConstant(SInt(refundDeadlineHeight)),
      R8: SConstant(SColl(SByte, Array.from(Buffer.from(taskId, 'utf-8')))),
    });

  // Build transaction
  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(wallet as never[])
    .to([sealedBidOutput])
    .sendChangeTo(bidderAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return { unsignedTx, commitHash: bytesToHex(commitHash) };
}

/**
 * Reveal a previously committed bid.
 * 
 * Spends the sealed bid box and creates a revealed bid box with the
 * actual bid amount and salt exposed. The sealed_bid.es contract verifies
 * that blake2b256(amount ++ salt) matches the original commitment.
 * 
 * @param commitBoxId - Box ID of the sealed bid to reveal
 * @param bidAmountNanoErg - The actual bid amount
 * @param salt - The salt used in the original commitment
 * @returns Unsigned transaction ready for wallet signing
 */
export async function revealBid(
  commitBoxId: string,
  bidAmountNanoErg: bigint,
  salt: Uint8Array
) {
  const currentHeight = await getCurrentHeight();
  
  // Fetch the commit box
  const commitBox = await getBoxById(commitBoxId);
  if (!commitBox) {
    throw new Error(`Commit box ${commitBoxId} not found`);
  }

  // Verify we're in the reveal window
  // R6 = commitDeadline, R7 = refundDeadline
  // We need: HEIGHT > commitDeadline AND HEIGHT <= refundDeadline
  
  // Get bidder's wallet UTXOs for tx fee
  const wallet = (window as unknown as Record<string, unknown>).ergoConnector
    ? await ((window as unknown) as Record<string, unknown> & { ergo: { get_utxos: () => Promise<unknown[]> } }).ergo.get_utxos()
    : [];

  // The revealed bid output goes to the bid_reveal contract
  // R4: bid amount (Long), R5: salt, R6: bidder pubkey, R7: selection deadline, R8: taskId, R9: original hash
  const selectionDeadlineHeight = currentHeight + DEFAULT_SELECTION_WINDOW_BLOCKS;
  
  // Extract bidder pubkey and taskId from commit box registers
  const bidderPkHex = commitBox.additionalRegisters?.R5 || '';
  const taskIdHex = commitBox.additionalRegisters?.R8 || '';
  const taskOwnerPkHex = commitBox.additionalRegisters?.R9 || ''; // Task owner from commit box

  const revealOutput = new OutputBuilder(
    BigInt(commitBox.value),
    BID_REVEAL_CONTRACT_ADDRESS
  )
    .setAdditionalRegisters({
      R4: SConstant(SLong(bidAmountNanoErg)),
      R5: SConstant(SColl(SByte, Array.from(salt))),
      R6: bidderPkHex, // Preserve bidder's SigmaProp from commit box (already encoded)
      R7: SConstant(SInt(selectionDeadlineHeight)),
      R8: taskIdHex, // Preserve task ID from commit box (already encoded)
      R9: taskOwnerPkHex, // Task owner pubkey carried from commit box for secure winner selection
    });

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from([commitBox as never, ...(wallet as never[])])
    .to([revealOutput])
    .sendChangeTo(ErgoAddress.fromErgoTree(commitBox.ergoTree || '').toString())
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return { unsignedTx };
}

/**
 * Fetch all sealed bid commitment boxes for a specific task.
 * Scans the sealed bid contract address for boxes with matching task ID in R8.
 */
export async function getTaskBidCommitments(taskId: string): Promise<SealedBidCommitment[]> {
  const boxes = await getBoxesByAddress(SEALED_BID_CONTRACT_ADDRESS);
  const taskIdHex = Buffer.from(taskId, 'utf-8').toString('hex');
  
  return boxes
    .filter(box => {
      // Check R8 contains our task ID
      const r8 = box.additionalRegisters?.R8;
      return r8 && r8.includes(taskIdHex);
    })
    .map(box => ({
      boxId: box.boxId,
      commitHash: box.additionalRegisters?.R4 || '',
      bidderAddress: box.address,
      commitDeadlineHeight: 0, // Would need to decode R6
      refundDeadlineHeight: 0, // Would need to decode R7
      taskId,
      lockedValue: BigInt(box.value),
      creationHeight: box.creationHeight,
    }));
}

/**
 * Fetch all revealed bids for a specific task.
 * Scans the bid reveal contract address for boxes with matching task ID in R8.
 */
export async function getTaskRevealedBids(taskId: string): Promise<RevealedBid[]> {
  const boxes = await getBoxesByAddress(BID_REVEAL_CONTRACT_ADDRESS);
  const taskIdHex = Buffer.from(taskId, 'utf-8').toString('hex');
  
  return boxes
    .filter(box => {
      const r8 = box.additionalRegisters?.R8;
      return r8 && r8.includes(taskIdHex);
    })
    .map(box => ({
      boxId: box.boxId,
      bidAmountNanoErg: BigInt(0), // Would need to decode R4 SLong
      bidderAddress: box.address,
      taskId,
      salt: new Uint8Array(0), // Would need to decode R5
      commitHash: box.additionalRegisters?.R9 || '',
    }));
}

/**
 * Build a refund transaction for an unrevealed bid past the refund deadline.
 * Only the original bidder can execute this (enforced by contract).
 */
export async function refundExpiredBid(commitBoxId: string, bidderAddress: string) {
  const currentHeight = await getCurrentHeight();
  const commitBox = await getBoxById(commitBoxId);
  if (!commitBox) {
    throw new Error(`Commit box ${commitBoxId} not found`);
  }

  const refundOutput = new OutputBuilder(
    BigInt(commitBox.value) - RECOMMENDED_TX_FEE,
    bidderAddress
  );

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from([commitBox as never])
    .to([refundOutput])
    .sendChangeTo(bidderAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return { unsignedTx };
}
