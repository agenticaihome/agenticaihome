/**
 * ─── AVL Tree On-Chain Reputation Oracle V2 ──────────────────────────────────
 *
 * This module implements a trustless reputation system using Ergo's native AVL
 * tree (authenticated dictionary) support. Instead of one box per agent (V1),
 * ALL agent reputations are stored in a single AVL tree. The tree's root hash
 * (digest) lives on-chain in a singleton box, while the full tree data and
 * proof generation happen off-chain.
 *
 * ── How Ergo AVL Trees Work ──
 *
 * Ergo's AVL trees are "authenticated data structures" — they allow you to:
 *   1. Store a compact digest (root hash) on-chain (~33 bytes)
 *   2. Perform operations (insert, update, lookup) off-chain
 *   3. Generate a cryptographic proof of the operation
 *   4. Verify the proof on-chain against the stored digest
 *
 * This gives us O(1) on-chain storage regardless of how many agents exist,
 * while maintaining full cryptographic verifiability.
 *
 * ── Data Flow ──
 *
 *   1. Agent completes a task via escrow
 *   2. Off-chain service reads the current AVL tree from local storage
 *   3. Computes the new reputation values and generates an update proof
 *   4. Builds a transaction with:
 *      - Input: current singleton box (with old digest in R4)
 *      - Output: new singleton box (with new digest in R4)
 *      - Context var 0: the AVL tree proof bytes
 *   5. Admin signs and submits the transaction
 *   6. On-chain contract verifies proof against old digest → accepts new digest
 *
 * ── Integration with Fleet SDK ──
 *
 * Fleet SDK doesn't have built-in AVL tree support yet. For proof generation,
 * we need ergo-lib-wasm (Rust bindings) which provides:
 *   - `AvlTree` type for tree management
 *   - `BatchAVLProver` for generating insertion/update proofs
 *   - `BatchAVLVerifier` for verifying proofs
 *
 * The scaffolding below uses type stubs that will be replaced with actual
 * ergo-lib-wasm calls once the AVL tree API is stabilized in the WASM bindings.
 *
 * @module reputation-avl
 * @version 2.0.0
 */

import {
  TransactionBuilder,
  OutputBuilder,
  ErgoAddress,
  SConstant,
  SSigmaProp,
  SGroupElement,
  SByte,
  SColl,
  SInt,
  SLong,
} from '@fleet-sdk/core';
import { getCurrentHeight, getBoxesByAddress, getBoxById } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, PLATFORM_FEE_ADDRESS } from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Reputation data stored per agent in the AVL tree.
 *
 * Serialized as 20 bytes:
 *   total_score:      Long  (8 bytes) — cumulative reputation score
 *   review_count:     Int   (4 bytes) — number of reviews received
 *   tasks_completed:  Int   (4 bytes) — number of tasks successfully completed
 *   last_updated:     Int   (4 bytes) — block height of last update
 */
export interface AgentReputationV2 {
  /** Cumulative EGO reputation score */
  totalScore: bigint;
  /** Number of reviews/ratings received */
  reviewCount: number;
  /** Number of tasks successfully completed */
  tasksCompleted: number;
  /** Block height when reputation was last updated */
  lastUpdated: number;
}

/**
 * AVL tree entry: the key is a 32-byte hash of the agent's address,
 * the value is the serialized AgentReputationV2 data.
 */
export interface AvlTreeEntry {
  /** blake2b256(agent_address_bytes) — 32 bytes */
  key: Uint8Array;
  /** Serialized reputation data — 20 bytes */
  value: Uint8Array;
}

/**
 * The singleton box that holds the AVL tree digest on-chain.
 * Identified by a unique NFT token.
 */
export interface ReputationSingletonBox {
  /** Box ID on the blockchain */
  boxId: string;
  /** Transaction that created this box */
  transactionId: string;
  /** NFT token ID that identifies this singleton */
  nftTokenId: string;
  /** Current AVL tree digest (root hash) — 33 bytes (1 byte flags + 32 bytes hash) */
  treeDigest: Uint8Array;
  /** Admin SigmaProp (who can authorize updates) */
  adminErgoTree: string;
  /** Monotonically increasing update counter */
  updateCounter: number;
  /** Escrow contract hash for validation */
  escrowContractHash: Uint8Array;
  /** Box value in nanoERG */
  value: bigint;
}

/**
 * Parameters for building a reputation update transaction.
 */
export interface ReputationUpdateParams {
  /** Agent's Ergo address (P2PK) */
  agentAddress: string;
  /** New reputation data for this agent */
  newReputation: AgentReputationV2;
  /** Whether this is a new agent (insert) or existing (update) */
  isNewAgent: boolean;
  /** Admin UTXOs to fund the transaction */
  adminUtxos: any[];
  /** Change address for leftover ERG */
  changeAddress: string;
}

/**
 * Result of a reputation lookup with cryptographic proof.
 */
export interface ReputationLookupResult {
  /** The agent's reputation data (null if not found) */
  reputation: AgentReputationV2 | null;
  /** Whether the agent exists in the tree */
  found: boolean;
  /** The lookup proof bytes (can be verified on-chain) */
  proofBytes: Uint8Array;
  /** The tree digest this proof was generated against */
  treeDigest: Uint8Array;
  /** Block height when the singleton was last updated */
  singletonHeight: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * NFT token ID for the reputation singleton box.
 * This will be set after the initial deployment transaction mints the NFT.
 * The NFT is created by spending a specific genesis box (first input's ID becomes token ID).
 */
export const REPUTATION_SINGLETON_NFT_ID = '0000000000000000000000000000000000000000000000000000000000000000'; // PLACEHOLDER — set after deployment

/**
 * Contract address for the V2 reputation oracle.
 * Will be populated after compiling reputation_oracle_v2.es.
 */
export const REPUTATION_ORACLE_V2_ADDRESS = ''; // PLACEHOLDER — compile and set

/**
 * Size of the reputation value in the AVL tree (bytes).
 * Long(8) + Int(4) + Int(4) + Int(4) = 20 bytes
 */
const REPUTATION_VALUE_SIZE = 20;

/**
 * Size of the AVL tree key (bytes).
 * blake2b256 hash = 32 bytes
 */
const REPUTATION_KEY_SIZE = 32;

// ─── Serialization Helpers ───────────────────────────────────────────────────

/**
 * Serialize AgentReputationV2 into a 20-byte Uint8Array for AVL tree storage.
 *
 * Layout (big-endian):
 *   [0..7]   totalScore     (Long, 8 bytes)
 *   [8..11]  reviewCount    (Int, 4 bytes)
 *   [12..15] tasksCompleted (Int, 4 bytes)
 *   [16..19] lastUpdated    (Int, 4 bytes)
 */
export function serializeReputation(rep: AgentReputationV2): Uint8Array {
  const buf = new ArrayBuffer(REPUTATION_VALUE_SIZE);
  const view = new DataView(buf);

  // BigInt → 8-byte big-endian
  view.setBigInt64(0, rep.totalScore, false);
  view.setInt32(8, rep.reviewCount, false);
  view.setInt32(12, rep.tasksCompleted, false);
  view.setInt32(16, rep.lastUpdated, false);

  return new Uint8Array(buf);
}

/**
 * Deserialize a 20-byte Uint8Array from the AVL tree into AgentReputationV2.
 */
export function deserializeReputation(data: Uint8Array): AgentReputationV2 {
  if (data.length !== REPUTATION_VALUE_SIZE) {
    throw new Error(`Invalid reputation data size: expected ${REPUTATION_VALUE_SIZE}, got ${data.length}`);
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  return {
    totalScore: view.getBigInt64(0, false),
    reviewCount: view.getInt32(8, false),
    tasksCompleted: view.getInt32(12, false),
    lastUpdated: view.getInt32(16, false),
  };
}

/**
 * Compute the AVL tree key for an agent address.
 * Key = blake2b256(ErgoAddress.ergoTree bytes)
 *
 * NOTE: In production, use ergo-lib-wasm's blake2b256.
 * This stub uses a simple hash for development/testing.
 */
export async function computeAgentKey(agentAddress: string): Promise<Uint8Array> {
  // Convert address to ergoTree bytes
  const ergoAddr = ErgoAddress.fromBase58(agentAddress);
  const ergoTreeHex = ergoAddr.ergoTree;
  const ergoTreeBytes = Uint8Array.from(Buffer.from(ergoTreeHex, 'hex'));

  // Use Web Crypto API for SHA-256 as a development stand-in for blake2b256.
  // In production, replace with ergo-lib-wasm's blake2b256 to match ErgoScript's blake2b256().
  // The key derivation MUST match what the ErgoScript contract expects.
  const hashBuffer = await crypto.subtle.digest('SHA-256', ergoTreeBytes);
  return new Uint8Array(hashBuffer);
}

// ─── AVL Tree Management (Off-Chain) ─────────────────────────────────────────
//
// The full AVL tree is maintained off-chain. This section provides the interface
// for managing the tree and generating proofs.
//
// In production, this will use ergo-lib-wasm's BatchAVLProver:
//
//   import { AvlTree, BatchAVLProver } from 'ergo-lib-wasm-nodejs';
//
//   const prover = new BatchAVLProver(keyLength=32, valueLengthOpt=Some(20));
//   prover.performInsert(key, value);       // returns proof bytes
//   prover.performUpdate(key, newValue);    // returns proof bytes
//   prover.performLookup(key);              // returns proof bytes + value
//   prover.digest();                        // returns current tree digest
//
// For now, we define the interface and provide stub implementations.

/**
 * Off-chain AVL tree state.
 * In production, this wraps ergo-lib-wasm's BatchAVLProver.
 *
 * IMPORTANT: The off-chain tree must be kept in sync with the on-chain digest.
 * If they diverge, proof generation will fail. The recommended pattern is:
 *   1. On startup, fetch the singleton box and its digest
 *   2. Rebuild the tree from historical transactions (or load from local cache)
 *   3. Verify local digest matches on-chain digest
 *   4. Generate proofs from the synchronized tree
 */
export class ReputationAvlTree {
  /**
   * In-memory store for development. Maps hex(key) → reputation data.
   * In production, this is replaced by ergo-lib-wasm's BatchAVLProver.
   */
  private entries: Map<string, AgentReputationV2> = new Map();

  /**
   * Current tree digest. In production, obtained from BatchAVLProver.digest().
   * For development, this is a placeholder.
   */
  private currentDigest: Uint8Array = new Uint8Array(33); // 1 flag byte + 32 hash bytes

  /**
   * Insert a new agent's reputation into the tree.
   * Returns the proof bytes for on-chain verification.
   *
   * @throws Error if the agent already exists (use update instead)
   */
  async insert(agentAddress: string, reputation: AgentReputationV2): Promise<{
    proof: Uint8Array;
    newDigest: Uint8Array;
  }> {
    const key = await computeAgentKey(agentAddress);
    const keyHex = Buffer.from(key).toString('hex');

    if (this.entries.has(keyHex)) {
      throw new Error(`Agent ${agentAddress} already exists in tree. Use update() instead.`);
    }

    this.entries.set(keyHex, reputation);

    // TODO: Replace with actual BatchAVLProver.performInsert()
    // const value = serializeReputation(reputation);
    // const proof = this.prover.performInsert(key, value);
    // const newDigest = this.prover.digest();

    const stubProof = new Uint8Array(64); // Placeholder proof
    const stubDigest = new Uint8Array(33); // Placeholder digest

    this.currentDigest = stubDigest;

    return { proof: stubProof, newDigest: stubDigest };
  }

  /**
   * Update an existing agent's reputation in the tree.
   * Returns the proof bytes for on-chain verification.
   *
   * @throws Error if the agent doesn't exist (use insert instead)
   */
  async update(agentAddress: string, reputation: AgentReputationV2): Promise<{
    proof: Uint8Array;
    newDigest: Uint8Array;
  }> {
    const key = await computeAgentKey(agentAddress);
    const keyHex = Buffer.from(key).toString('hex');

    if (!this.entries.has(keyHex)) {
      throw new Error(`Agent ${agentAddress} not found in tree. Use insert() instead.`);
    }

    this.entries.set(keyHex, reputation);

    // TODO: Replace with actual BatchAVLProver.performUpdate()
    // const value = serializeReputation(reputation);
    // const proof = this.prover.performUpdate(key, value);
    // const newDigest = this.prover.digest();

    const stubProof = new Uint8Array(64);
    const stubDigest = new Uint8Array(33);

    this.currentDigest = stubDigest;

    return { proof: stubProof, newDigest: stubDigest };
  }

  /**
   * Look up an agent's reputation and generate a lookup proof.
   * The proof can be verified on-chain by other contracts using data inputs.
   */
  async lookup(agentAddress: string): Promise<{
    reputation: AgentReputationV2 | null;
    proof: Uint8Array;
  }> {
    const key = await computeAgentKey(agentAddress);
    const keyHex = Buffer.from(key).toString('hex');

    const entry = this.entries.get(keyHex) ?? null;

    // TODO: Replace with actual BatchAVLProver.performLookup()
    // const result = this.prover.performLookup(key);
    // const proof = this.prover.generateProof();

    const stubProof = new Uint8Array(64);

    return { reputation: entry, proof: stubProof };
  }

  /**
   * Get the current tree digest (root hash).
   */
  getDigest(): Uint8Array {
    return this.currentDigest;
  }

  /**
   * Get total number of agents in the tree.
   */
  getAgentCount(): number {
    return this.entries.size;
  }

  /**
   * Check if an agent exists in the tree (off-chain only, no proof).
   */
  async hasAgent(agentAddress: string): Promise<boolean> {
    const key = await computeAgentKey(agentAddress);
    return this.entries.has(Buffer.from(key).toString('hex'));
  }
}

// ─── Singleton Box Queries ───────────────────────────────────────────────────

/**
 * Fetch the current reputation singleton box from the blockchain.
 * The singleton is identified by its unique NFT token.
 *
 * This is the primary entry point for reading on-chain reputation state.
 * Other contracts reference this box as a data input to read the AVL tree digest.
 */
export async function getReputationSingletonBox(): Promise<ReputationSingletonBox | null> {
  if (REPUTATION_SINGLETON_NFT_ID === '0000000000000000000000000000000000000000000000000000000000000000') {
    console.warn('Reputation singleton NFT ID not configured — system not deployed yet');
    return null;
  }

  try {
    // Find the box holding the reputation NFT
    // The singleton box lives at the V2 contract address and holds exactly 1 NFT
    const boxes = await getBoxesByAddress(REPUTATION_ORACLE_V2_ADDRESS);

    for (const box of boxes) {
      const assets = box.assets || [];
      const hasNft = assets.some(
        (a: any) => a.tokenId === REPUTATION_SINGLETON_NFT_ID && a.amount === '1'
      );
      if (!hasNft) continue;

      // Parse registers
      const registers = box.additionalRegisters || {};

      return {
        boxId: box.boxId,
        transactionId: box.transactionId,
        nftTokenId: REPUTATION_SINGLETON_NFT_ID,
        treeDigest: parseTreeDigestFromRegister(registers.R4),
        adminErgoTree: registers.R5 || '',
        updateCounter: parseIntFromRegister(registers.R6),
        escrowContractHash: parseByteArrayFromRegister(registers.R7),
        value: BigInt(box.value),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching reputation singleton:', error);
    return null;
  }
}

/**
 * Get the current AVL tree root digest from the on-chain singleton box.
 * This is the cryptographic commitment to the entire reputation dataset.
 */
export async function getReputationTreeRoot(): Promise<Uint8Array | null> {
  const singleton = await getReputationSingletonBox();
  return singleton?.treeDigest ?? null;
}

// ─── Transaction Builders ────────────────────────────────────────────────────

/**
 * Build a transaction that updates an agent's reputation in the AVL tree.
 *
 * This is the core function that:
 *   1. Fetches the current singleton box
 *   2. Generates the AVL tree proof (insert or update)
 *   3. Builds the transaction with the new digest and proof as context variable
 *   4. Returns the unsigned transaction for admin signing
 *
 * The resulting transaction:
 *   - Spends the current singleton box (input)
 *   - Creates a new singleton box with updated digest (output)
 *   - Passes the AVL proof as context variable 0
 *   - Increments the update counter
 *   - Preserves the NFT, admin key, and escrow hash
 *
 * @param tree - The off-chain AVL tree (must be in sync with on-chain digest)
 * @param params - Update parameters including agent address and new reputation
 * @returns Unsigned transaction in EIP-12 format
 */
export async function buildReputationUpdateTx(
  tree: ReputationAvlTree,
  params: ReputationUpdateParams
): Promise<any> {
  const {
    agentAddress,
    newReputation,
    isNewAgent,
    adminUtxos,
    changeAddress,
  } = params;

  // 1. Fetch current singleton
  const singleton = await getReputationSingletonBox();
  if (!singleton) {
    throw new Error('Reputation singleton box not found — is the system deployed?');
  }

  // 2. Verify our local tree is in sync with on-chain
  const localDigest = tree.getDigest();
  if (!digestsMatch(localDigest, singleton.treeDigest)) {
    throw new Error(
      'Local AVL tree digest does not match on-chain digest. ' +
      'Tree must be resynchronized before generating proofs.'
    );
  }

  // 3. Generate AVL tree proof
  const { proof, newDigest } = isNewAgent
    ? await tree.insert(agentAddress, newReputation)
    : await tree.update(agentAddress, newReputation);

  // 4. Get current height
  const currentHeight = await getCurrentHeight();

  // 5. Build output singleton box with updated state
  const singletonInput = await getBoxById(singleton.boxId);
  if (!singletonInput) {
    throw new Error('Singleton box not found by ID');
  }

  // Preserve existing register values that shouldn't change
  const existingRegisters = singletonInput.additionalRegisters || {};

  const outputSingleton = new OutputBuilder(
    singleton.value > MIN_BOX_VALUE ? singleton.value : MIN_BOX_VALUE,
    REPUTATION_ORACLE_V2_ADDRESS
  )
    // Mint/transfer the NFT to the output
    .addTokens([{ tokenId: REPUTATION_SINGLETON_NFT_ID, amount: '1' }])
    .setAdditionalRegisters({
      // R4: New AVL tree digest (the post-operation root hash)
      // TODO: Use proper SAvlTree encoding when Fleet SDK supports it
      // For now, encode as Coll[Byte] — the contract will need to handle this
      R4: SConstant(SColl(SByte, newDigest)),
      // R5: Admin key — preserved from input
      R5: existingRegisters.R5,
      // R6: Update counter — incremented by 1
      R6: SConstant(SInt(singleton.updateCounter + 1)),
      // R7: Escrow contract hash — preserved from input
      R7: existingRegisters.R7,
    });

  // 6. Build the transaction
  // The AVL proof is passed as context extension (context variable 0)
  const unsignedTx = new TransactionBuilder(currentHeight)
    .from([singletonInput, ...adminUtxos])
    .to([outputSingleton])
    .sendChangeTo(changeAddress)
    .payFee(RECOMMENDED_TX_FEE)
    // TODO: Add context extension for the proof when Fleet SDK supports it
    // .withContextExtension(0, proof)
    .build()
    .toEIP12Object();

  // Attach proof as context extension to the first input (singleton)
  // Fleet SDK context extension format:
  // unsignedTx.inputs[0].extension = { "0": proofHex }
  const proofHex = Buffer.from(proof).toString('hex');
  if (unsignedTx.inputs && unsignedTx.inputs[0]) {
    unsignedTx.inputs[0].extension = {
      ...unsignedTx.inputs[0].extension,
      '0': proofHex,
    };
  }

  return unsignedTx;
}

/**
 * Verify an agent's reputation by generating a lookup proof against
 * the current on-chain singleton digest.
 *
 * Returns the reputation data along with a cryptographic proof that
 * can be verified by any party (including other smart contracts).
 *
 * Use case: An escrow contract wants to check if an agent is reputable
 * before allowing them to accept a task. The client fetches this proof
 * and passes it as a data input + context variable.
 */
export async function verifyAgentReputation(
  tree: ReputationAvlTree,
  agentAddress: string
): Promise<ReputationLookupResult> {
  // Fetch current on-chain state
  const singleton = await getReputationSingletonBox();
  if (!singleton) {
    return {
      reputation: null,
      found: false,
      proofBytes: new Uint8Array(0),
      treeDigest: new Uint8Array(0),
      singletonHeight: 0,
    };
  }

  // Generate lookup proof from the off-chain tree
  const { reputation, proof } = await tree.lookup(agentAddress);

  return {
    reputation,
    found: reputation !== null,
    proofBytes: proof,
    treeDigest: singleton.treeDigest,
    singletonHeight: singleton.updateCounter,
  };
}

// ─── Register Parsing Helpers ────────────────────────────────────────────────

/**
 * Parse an AVL tree digest from a serialized register value.
 * The explorer returns registers as hex-encoded Sigma-serialized values.
 */
function parseTreeDigestFromRegister(register: any): Uint8Array {
  if (!register) return new Uint8Array(33);
  const hex = typeof register === 'object' ? register.serializedValue || '' : String(register);
  // AVL tree digest is serialized as Coll[Byte] in Sigma format
  // Skip the type prefix bytes to get the raw digest
  // For now, return raw hex parse (will need proper Sigma deserialization)
  try {
    return Uint8Array.from(Buffer.from(hex, 'hex'));
  } catch {
    return new Uint8Array(33);
  }
}

/**
 * Parse an integer from a serialized register value.
 */
function parseIntFromRegister(register: any): number {
  if (!register) return 0;
  if (typeof register === 'object' && register.renderedValue) {
    return parseInt(register.renderedValue, 10) || 0;
  }
  return 0;
}

/**
 * Parse a byte array from a serialized register value.
 */
function parseByteArrayFromRegister(register: any): Uint8Array {
  if (!register) return new Uint8Array(0);
  const hex = typeof register === 'object' ? register.serializedValue || '' : String(register);
  try {
    return Uint8Array.from(Buffer.from(hex, 'hex'));
  } catch {
    return new Uint8Array(0);
  }
}

/**
 * Compare two AVL tree digests for equality.
 */
function digestsMatch(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ─── Trust Level Computation ─────────────────────────────────────────────────

/**
 * Calculate trust level from V2 reputation data.
 * Same tiers as V1 but uses the AVL tree data structure.
 */
export function calculateTrustLevelV2(rep: AgentReputationV2): string {
  const score = Number(rep.totalScore);
  const { tasksCompleted, reviewCount } = rep;

  if (tasksCompleted < 3) return 'unverified';
  if (score >= 1000 && tasksCompleted >= 20 && reviewCount >= 15) return 'platinum';
  if (score >= 500 && tasksCompleted >= 10 && reviewCount >= 7) return 'gold';
  if (score >= 200 && tasksCompleted >= 5 && reviewCount >= 3) return 'silver';
  return 'bronze';
}

/**
 * Format V2 reputation data for display.
 */
export function formatReputationV2(rep: AgentReputationV2): string {
  return `EGO: ${rep.totalScore} | Tasks: ${rep.tasksCompleted} | Reviews: ${rep.reviewCount}`;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type { AvlTreeEntry as ReputationTreeEntry };
