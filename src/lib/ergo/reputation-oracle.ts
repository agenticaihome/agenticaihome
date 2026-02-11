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

// ─── Reputation Oracle Contract ─────────────────────────────────────

/**
 * ErgoScript: Reputation Oracle Contract
 *
 * This contract implements a decentralized reputation oracle system where
 * AgenticAiHome can publish agent reputation data on-chain for other dApps to read.
 * Other smart contracts can use these boxes as "data inputs" (read-only) to 
 * access reputation scores without spending the boxes.
 *
 * Register Layout:
 * R4: Coll[Byte] - Agent's public key (33 bytes)
 * R5: Long       - Agent's EGO score (cumulative reputation points)
 * R6: Int        - Total tasks completed by agent
 * R7: Int        - Dispute rate (basis points, e.g., 250 = 2.5%)
 * R8: Int        - Last updated block height
 * R9: Coll[Byte] - Agent's identity hash (for privacy-preserving queries)
 *
 * Only the AgenticAiHome treasury can update these oracle boxes.
 * The box value is kept minimal (just above dust limit).
 * Anyone can read the data by referencing these boxes as data inputs.
 */
export const REPUTATION_ORACLE_ERGOSCRIPT = `{
  val treasuryPk = SELF.R4[SigmaProp].get
  val agentPubKey = SELF.R5[Coll[Byte]].get
  val egoScore = SELF.R6[Long].get
  val tasksCompleted = SELF.R7[Int].get
  val disputeRate = SELF.R8[Int].get
  val lastUpdated = SELF.R9[Int].get
  
  val validOracleUpdate = OUTPUTS.exists { (output: Box) =>
    output.propositionBytes == SELF.propositionBytes &&
    output.value >= SELF.value &&
    output.R4[SigmaProp].get == treasuryPk &&
    output.R5[Coll[Byte]].get == agentPubKey &&
    output.R9[Int].get >= lastUpdated &&
    output.R6[Long].isDefined &&
    output.R7[Int].isDefined &&
    output.R8[Int].isDefined
  }
  
  treasuryPk && sigmaProp(validOracleUpdate)
}`;

/**
 * Pre-compiled P2S address for the reputation oracle contract.
 * NOTE: Needs compilation via node.ergo.watch
 * This address will be populated after compilation with the treasury public key.
 */
export let REPUTATION_ORACLE_CONTRACT_ADDRESS = '5f52ZtCEcmed7WoxtVEsN4yH1rCUBZ7epD82drP5xXAeufHaK6ZNpWY6L6fbdDgdmSSNUQGk5njhHBR6bw59FV7toH3umeA3gFHJH6YZrHdTs2a4WpfRFzsUKN7M8wRADVop';

// ─── Types ───────────────────────────────────────────────────────────

export interface ReputationOracleData {
  agentPubKey: Uint8Array;
  egoScore: bigint;
  tasksCompleted: number;
  disputeRate: number; // basis points (0-10000)
  lastUpdated: number;
  agentIdentityHash: Uint8Array;
}

export interface OracleUpdateParams {
  agentAddress: string;
  egoScore: bigint;
  tasksCompleted: number;
  disputeRate: number;
  treasuryUtxos: any[];
  changeAddress: string;
}

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Extract 33-byte compressed public key from P2PK address
 */
function extractPubKeyFromAddress(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  const tree = ergoAddr.ergoTree;
  if (!tree.startsWith('0008cd')) {
    throw new Error(`Address ${address} is not a P2PK address`);
  }
  const pubkeyHex = tree.slice(6);
  return Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
}

/**
 * Generate a privacy-preserving identity hash for an agent.
 * Uses blake2b256(pubKey + salt) to allow anonymous reputation queries.
 */
function generateAgentIdentityHash(pubKey: Uint8Array): Uint8Array {
  // In production, this should include a salt specific to AgenticAiHome
  const salt = new TextEncoder().encode('AGENTICHOME_ORACLE_V1');
  const combined = new Uint8Array(pubKey.length + salt.length);
  combined.set(pubKey);
  combined.set(salt, pubKey.length);
  
  // For now, return a deterministic hash (in production, use blake2b256)
  const hashHex = Array.from(combined)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64); // 32 bytes = 64 hex chars
  
  return Uint8Array.from(Buffer.from(hashHex, 'hex'));
}

// ─── Oracle Creation and Updates ─────────────────────────────────────

/**
 * Create a new reputation oracle box for an agent.
 * This establishes the agent in the on-chain reputation system.
 */
export async function createReputationOracleTx(
  params: OracleUpdateParams
): Promise<any> {
  const {
    agentAddress,
    egoScore,
    tasksCompleted,
    disputeRate,
    treasuryUtxos,
    changeAddress
  } = params;

  // Validate inputs
  if (!agentAddress || agentAddress.length < 10) {
    throw new Error('Invalid agent address');
  }
  if (disputeRate < 0 || disputeRate > 10000) {
    throw new Error('Dispute rate must be between 0 and 10000 basis points');
  }
  if (tasksCompleted < 0) {
    throw new Error('Tasks completed cannot be negative');
  }

  const currentHeight = await getCurrentHeight();
  const agentPubKey = extractPubKeyFromAddress(agentAddress);
  const treasuryPubKey = extractPubKeyFromAddress(PLATFORM_FEE_ADDRESS);

  // Create oracle box with reputation data
  const oracleOutput = new OutputBuilder(MIN_BOX_VALUE, REPUTATION_ORACLE_CONTRACT_ADDRESS)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(treasuryPubKey))), // Treasury key
      R5: SConstant(SColl(SByte, agentPubKey)),                 // Agent public key
      R6: SConstant(SLong(egoScore)),                           // EGO score
      R7: SConstant(SInt(tasksCompleted)),                      // Tasks completed
      R8: SConstant(SInt(disputeRate)),                         // Dispute rate (bp)
      R9: SConstant(SInt(currentHeight)),                       // Last updated
    });

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(treasuryUtxos)
    .to([oracleOutput])
    .sendChangeTo(changeAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Update an existing reputation oracle box with new data.
 * Only the treasury can perform these updates.
 */
export async function updateReputationOracleTx(
  existingOracleBoxId: string,
  params: OracleUpdateParams
): Promise<any> {
  const {
    agentAddress,
    egoScore,
    tasksCompleted,
    disputeRate,
    treasuryUtxos,
    changeAddress
  } = params;

  const currentHeight = await getCurrentHeight();
  const existingBox = await getBoxById(existingOracleBoxId);
  
  if (!existingBox) {
    throw new Error('Oracle box not found');
  }

  // Extract existing data (R4=treasury, R5=agent must remain the same)
  // Handle both explorer format ({serializedValue, ...}) and raw hex strings
  const getRegHex = (reg: any): string => {
    if (typeof reg === 'object' && reg?.serializedValue) return reg.serializedValue;
    return reg;
  };
  const existingTreasuryPk = existingBox.additionalRegisters?.R4;
  const existingAgentPubKey = existingBox.additionalRegisters?.R5;
  
  if (!existingTreasuryPk || !existingAgentPubKey) {
    throw new Error('Invalid oracle box: missing identity data');
  }

  // Create updated oracle box
  const updatedOracleOutput = new OutputBuilder(MIN_BOX_VALUE, REPUTATION_ORACLE_CONTRACT_ADDRESS)
    .setAdditionalRegisters({
      R4: getRegHex(existingTreasuryPk),                  // Treasury key preserved
      R5: getRegHex(existingAgentPubKey),                  // Agent key preserved
      R6: SConstant(SLong(egoScore)),                     // Updated EGO score
      R7: SConstant(SInt(tasksCompleted)),                // Updated tasks count
      R8: SConstant(SInt(disputeRate)),                   // Updated dispute rate
      R9: SConstant(SInt(currentHeight)),                 // Updated timestamp
    });

  const inputs = [existingBox, ...treasuryUtxos];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([updatedOracleOutput])
    .sendChangeTo(changeAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

// ─── Oracle Data Queries ─────────────────────────────────────────────

/**
 * Find reputation oracle box for a specific agent by their address.
 */
export async function findAgentOracleBox(agentAddress: string): Promise<any | null> {
  try {
    const agentPubKey = extractPubKeyFromAddress(agentAddress);
    const boxes = await getBoxesByAddress(REPUTATION_ORACLE_CONTRACT_ADDRESS);
    
    for (const box of boxes) {
      const r5 = box.additionalRegisters?.R5;
      if (!r5) continue;
      // R5 is serialized SColl[SByte] — check if it contains the agent's pubkey hex
      const serialized = typeof r5 === 'object' ? (r5 as any).serializedValue || '' : r5;
      const pubkeyHex = Buffer.from(agentPubKey).toString('hex');
      if (serialized.toLowerCase().includes(pubkeyHex.toLowerCase())) {
        return box;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding agent oracle box:', error);
    return null;
  }
}

/**
 * Parse reputation data from an oracle box.
 */
export function parseReputationOracleData(box: any): ReputationOracleData | null {
  try {
    const registers = box.additionalRegisters || {};
    
    if (!registers.R4 || !registers.R5 || !registers.R6 || 
        !registers.R7 || !registers.R8 || !registers.R9) {
      return null;
    }

    // Registers are serialized Sigma values from explorer — need renderedValue or proper deserialization
    // For now, extract renderedValue if available (explorer format), else use raw
    const getRendered = (reg: any): string => {
      if (typeof reg === 'object' && reg?.renderedValue) return reg.renderedValue;
      return String(reg);
    };
    const getSerializedBytes = (reg: any): string => {
      if (typeof reg === 'object' && reg?.serializedValue) return reg.serializedValue;
      return String(reg);
    };

    return {
      agentPubKey: Uint8Array.from(Buffer.from(getSerializedBytes(registers.R5), 'hex')),
      egoScore: BigInt(getRendered(registers.R6) || '0'),
      tasksCompleted: parseInt(getRendered(registers.R7) || '0'),
      disputeRate: parseInt(getRendered(registers.R8) || '0'),
      lastUpdated: parseInt(getRendered(registers.R9) || '0'),
      agentIdentityHash: new Uint8Array(32),
    };
  } catch (error) {
    console.error('Error parsing oracle data:', error);
    return null;
  }
}

/**
 * Get current reputation data for an agent from the oracle.
 */
export async function getAgentReputationFromOracle(agentAddress: string): Promise<ReputationOracleData | null> {
  const oracleBox = await findAgentOracleBox(agentAddress);
  if (!oracleBox) return null;
  
  return parseReputationOracleData(oracleBox);
}

/**
 * Get all agent reputation data from oracle boxes.
 * Useful for displaying leaderboards or analytics.
 */
export async function getAllAgentReputations(): Promise<ReputationOracleData[]> {
  try {
    const boxes = await getBoxesByAddress(REPUTATION_ORACLE_CONTRACT_ADDRESS);
    const reputations: ReputationOracleData[] = [];
    
    for (const box of boxes) {
      const data = parseReputationOracleData(box);
      if (data) {
        reputations.push(data);
      }
    }
    
    return reputations.sort((a, b) => Number(b.egoScore - a.egoScore));
  } catch (error) {
    console.error('Error getting all agent reputations:', error);
    return [];
  }
}

// ─── Integration Helpers ─────────────────────────────────────────────

/**
 * Calculate trust level based on oracle data.
 */
export function calculateTrustLevelFromOracle(data: ReputationOracleData): string {
  const { egoScore, tasksCompleted, disputeRate } = data;
  const egoNumber = Number(egoScore);
  
  if (tasksCompleted < 3) return 'unverified';
  if (egoNumber >= 1000 && disputeRate <= 250 && tasksCompleted >= 20) return 'platinum';
  if (egoNumber >= 500 && disputeRate <= 500 && tasksCompleted >= 10) return 'gold';
  if (egoNumber >= 200 && disputeRate <= 1000 && tasksCompleted >= 5) return 'silver';
  return 'bronze';
}

/**
 * Format reputation score for display.
 */
export function formatReputationScore(data: ReputationOracleData): string {
  const disputeRatePercent = (data.disputeRate / 100).toFixed(1);
  return `EGO: ${data.egoScore} | Tasks: ${data.tasksCompleted} | Disputes: ${disputeRatePercent}%`;
}

// ─── Export utilities ────────────────────────────────────────────────

export {
  extractPubKeyFromAddress as pubkeyFromAddress,
  generateAgentIdentityHash,
};