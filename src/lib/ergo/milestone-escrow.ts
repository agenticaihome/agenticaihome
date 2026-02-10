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
import { getCurrentHeight, getBoxById } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, PLATFORM_FEE_ADDRESS } from './constants';
import { buildEgoMintTx } from './ego-token';

// Platform fee address hash for ErgoScript (will be replaced during compilation)
// Platform fee address hash - needs compilation after security update
// This will be populated after contract compilation completes

// ─── Milestone-Based Escrow Contract ────────────────────────────────

/**
 * ErgoScript: Milestone-Based Escrow Contract
 *
 * For complex tasks with multiple deliverables and payment stages.
 * Total amount is split across N milestones with configurable percentages.
 * Client releases payments per milestone, with remaining funds staying locked.
 * Each milestone release mints proportional EGO tokens for the agent.
 *
 * Register Layout:
 * R4: SigmaProp       - Client public key (can release milestones)
 * R5: Coll[Byte]      - Agent proposition bytes (payment destination)
 * R6: Coll[Int]       - Milestone deadlines (block heights)
 * R7: Coll[Int]       - Milestone percentages (basis points, must sum to 10000)
 * R8: Int             - Current milestone index (0-based)
 * R9: Coll[Byte]      - Task ID and metadata
 *
 * The contract logic:
 * 1. Milestone release: Client approves current milestone + valid outputs
 * 2. Partial completion: Creates new milestone box with updated index
 * 3. Final milestone: Releases remaining funds + mints final EGO tokens
 * 4. Timeout refund: Client can reclaim if current milestone deadline passed
 */
export const MILESTONE_ESCROW_ERGOSCRIPT = `{
  // Extract milestone configuration from registers
  val clientPk = SELF.R4[SigmaProp].get
  val agentPkBytes = SELF.R5[Coll[Byte]].get
  val milestoneDeadlines = SELF.R6[Coll[Int]].get
  val milestonePercentages = SELF.R7[Coll[Int]].get  // in basis points (100 = 1%)
  val currentMilestone = SELF.R8[Int].get
  val taskMetadata = SELF.R9[Coll[Byte]].get
  
  // Validate milestone configuration
  val totalMilestones = milestoneDeadlines.size
  val validConfig = milestoneDeadlines.size == milestonePercentages.size &&
                   currentMilestone >= 0 &&
                   currentMilestone < totalMilestones &&
                   milestonePercentages.fold(0, {(acc: Int, pct: Int) => acc + pct}) == 10000
  
  // Current milestone details
  val currentDeadline = milestoneDeadlines(currentMilestone)
  val currentPercentage = milestonePercentages(currentMilestone)
  
  // Financial calculations
  val protocolFeePercent = 100L  // 1% in basis points
  val escrowValue = SELF.value
  val protocolFee = (escrowValue * protocolFeePercent) / 10000L
  val txFee = 1100000L
  val netEscrowValue = escrowValue - protocolFee
  
  // Current milestone payment amount
  val milestonePayment = (netEscrowValue * currentPercentage) / 10000L - txFee
  val remainingValue = escrowValue - milestonePayment - protocolFee - txFee
  
  // Check if this is the final milestone
  val isFinalMilestone = currentMilestone == (totalMilestones - 1)
  
  // Milestone release path: client approves + valid outputs
  val milestoneRelease = {
    clientPk &&
    validConfig &&
    // Agent receives milestone payment
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPkBytes && o.value >= milestonePayment
    } &&
    // Protocol fee payment - NEEDS PLATFORM ADDRESS AFTER COMPILATION
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == blake2b256(fromBase64("PLACEHOLDER_PLATFORM_HASH")) &&
      o.value >= protocolFee
    } &&
    // For non-final milestones: continuation box with next milestone
    (isFinalMilestone || OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == SELF.propositionBytes &&
      o.value >= remainingValue &&
      o.R4[SigmaProp].get == clientPk &&
      o.R5[Coll[Byte]].get == agentPkBytes &&
      o.R6[Coll[Int]].get == milestoneDeadlines &&
      o.R7[Coll[Int]].get == milestonePercentages &&
      o.R8[Int].get == (currentMilestone + 1) &&
      o.R9[Coll[Byte]].get == taskMetadata
    })
  }
  
  // Timeout refund: if current milestone deadline passed, client can reclaim all
  val timeoutRefund = {
    validConfig &&
    HEIGHT > currentDeadline &&
    clientPk &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == clientPk.propBytes &&
      o.value >= (escrowValue - protocolFee - txFee)
    } &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == blake2b256(fromBase64("PLACEHOLDER_PLATFORM_HASH")) &&
      o.value >= protocolFee
    }
  }
  
  milestoneRelease || timeoutRefund
}`;

/**
 * Pre-compiled P2S address for the milestone escrow contract.
 * NOTE: Needs compilation via node.ergo.watch with actual platform fee address hash
 */
export let MILESTONE_ESCROW_CONTRACT_ADDRESS = '';

// ─── Types ───────────────────────────────────────────────────────────

export interface Milestone {
  name: string;
  description: string;
  percentage: number; // 0-100 (will be converted to basis points)
  deadlineHeight: number;
  deliverables: string[];
  egoReward?: number; // Custom EGO reward for this milestone
}

export interface MilestoneEscrowParams {
  clientAddress: string;
  agentAddress: string;
  totalAmountNanoErg: bigint;
  milestones: Milestone[];
  taskId: string;
  metadata?: any;
}

export interface MilestoneEscrowBox {
  boxId: string;
  transactionId: string;
  clientAddress: string;
  agentAddress: string;
  totalAmount: bigint;
  currentMilestone: number;
  milestones: Milestone[];
  taskId: string;
  metadata?: any;
  status: 'active' | 'completed' | 'refunded';
  creationHeight: number;
}

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Validate milestone configuration
 */
function validateMilestones(milestones: Milestone[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (milestones.length === 0) {
    errors.push('At least one milestone required');
  }
  if (milestones.length > 10) {
    errors.push('Maximum 10 milestones allowed');
  }
  
  // Check percentages sum to 100
  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    errors.push(`Milestone percentages must sum to 100%, got ${totalPercentage}%`);
  }
  
  // Validate individual milestones
  milestones.forEach((milestone, index) => {
    if (milestone.percentage <= 0) {
      errors.push(`Milestone ${index + 1}: percentage must be positive`);
    }
    if (milestone.percentage > 100) {
      errors.push(`Milestone ${index + 1}: percentage cannot exceed 100%`);
    }
    if (milestone.deadlineHeight <= 0) {
      errors.push(`Milestone ${index + 1}: invalid deadline height`);
    }
    if (!milestone.name || milestone.name.trim().length === 0) {
      errors.push(`Milestone ${index + 1}: name is required`);
    }
  });
  
  // Check deadlines are in order
  for (let i = 1; i < milestones.length; i++) {
    if (milestones[i].deadlineHeight <= milestones[i - 1].deadlineHeight) {
      errors.push(`Milestone ${i + 1}: deadline must be after previous milestone`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Extract public key from P2PK address
 */
function extractPubKey(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  const tree = ergoAddr.ergoTree;
  if (!tree.startsWith('0008cd')) {
    throw new Error(`Address ${address} is not a P2PK address`);
  }
  const pubkeyHex = tree.slice(6);
  return Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
}

/**
 * Get proposition bytes for an address
 */
function getPropositionBytes(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  return Uint8Array.from(Buffer.from(ergoAddr.ergoTree, 'hex'));
}

// ─── Transaction Builders ────────────────────────────────────────────

/**
 * Create a milestone-based escrow transaction
 */
export async function createMilestoneEscrowTx(
  params: MilestoneEscrowParams,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const {
    clientAddress,
    agentAddress,
    totalAmountNanoErg,
    milestones,
    taskId,
    metadata = {}
  } = params;

  // Validate inputs
  const validation = validateMilestones(milestones);
  if (!validation.valid) {
    throw new Error(`Invalid milestones: ${validation.errors.join(', ')}`);
  }

  if (totalAmountNanoErg < MIN_BOX_VALUE) {
    throw new Error(`Total amount must be at least ${MIN_BOX_VALUE} nanoERG`);
  }

  const currentHeight = await getCurrentHeight();

  // Prepare milestone data for registers
  const milestoneDeadlines = milestones.map(m => m.deadlineHeight);
  const milestonePercentages = milestones.map(m => Math.round(m.percentage * 100)); // Convert to basis points
  const clientPubKey = extractPubKey(clientAddress);
  const agentPropBytes = getPropositionBytes(agentAddress);

  // Encode metadata with milestones and task info
  const fullMetadata = {
    taskId,
    milestones: milestones.map(m => ({
      name: m.name,
      description: m.description,
      deliverables: m.deliverables,
      egoReward: m.egoReward || 10
    })),
    ...metadata
  };
  const metadataBytes = new TextEncoder().encode(JSON.stringify(fullMetadata));

  // Build milestone escrow output
  const escrowOutput = new OutputBuilder(totalAmountNanoErg, MILESTONE_ESCROW_CONTRACT_ADDRESS)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(clientPubKey))),    // Client key
      R5: SConstant(SColl(SByte, agentPropBytes)),              // Agent address
      R6: SConstant(SColl(SInt, milestoneDeadlines)),           // Deadlines
      R7: SConstant(SColl(SInt, milestonePercentages)),         // Percentages (bp)
      R8: SConstant(SInt(0)),                                   // Current milestone = 0
      R9: SConstant(SColl(SByte, metadataBytes)),               // Metadata
    });

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(walletUtxos)
    .to([escrowOutput])
    .sendChangeTo(changeAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Release a milestone: pays agent and creates continuation box (if not final)
 */
export async function releaseMilestoneTx(
  escrowBoxId: string,
  clientUtxos: any[], // For transaction fees
  changeAddress: string,
  agentName?: string // For EGO token minting
): Promise<{ milestoneReleaseTx: any; egoMintTx?: any }> {
  const currentHeight = await getCurrentHeight();
  const escrowBox = await getBoxById(escrowBoxId);
  
  if (!escrowBox) {
    throw new Error('Milestone escrow box not found');
  }

  // Parse escrow data
  const escrowData = parseMilestoneEscrowBox(escrowBox);
  if (!escrowData) {
    throw new Error('Invalid milestone escrow box format');
  }

  const currentMilestone = escrowData.currentMilestone;
  const milestone = escrowData.milestones[currentMilestone];
  const isFinalMilestone = currentMilestone === escrowData.milestones.length - 1;

  // Calculate payment amounts
  const escrowValue = BigInt(escrowBox.value);
  const protocolFee = escrowValue / BigInt(100); // 1%
  const txFee = RECOMMENDED_TX_FEE;
  const netValue = escrowValue - protocolFee;
  const milestonePayment = (netValue * BigInt(Math.round(milestone.percentage * 100))) / BigInt(10000) - txFee;

  const outputs: OutputBuilder[] = [];

  // Agent payment for this milestone
  outputs.push(new OutputBuilder(milestonePayment, escrowData.agentAddress));
  
  // Protocol fee
  outputs.push(new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS));

  // Continuation box for remaining milestones (if not final)
  if (!isFinalMilestone) {
    const remainingValue = escrowValue - milestonePayment - protocolFee - txFee;
    const continuationOutput = new OutputBuilder(remainingValue, MILESTONE_ESCROW_CONTRACT_ADDRESS)
      .setAdditionalRegisters({
        R4: escrowBox.additionalRegisters.R4,                   // Client key (unchanged)
        R5: escrowBox.additionalRegisters.R5,                   // Agent address (unchanged)
        R6: escrowBox.additionalRegisters.R6,                   // Deadlines (unchanged)
        R7: escrowBox.additionalRegisters.R7,                   // Percentages (unchanged)
        R8: SConstant(SInt(currentMilestone + 1)),              // Next milestone
        R9: escrowBox.additionalRegisters.R9,                   // Metadata (unchanged)
      });
    outputs.push(continuationOutput);
  }

  const inputs = [escrowBox, ...clientUtxos];

  const milestoneReleaseTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to(outputs)
    .sendChangeTo(changeAddress)
    .payFee(txFee)
    .build()
    .toEIP12Object();

  // Build EGO token mint transaction for this milestone
  let egoMintTx;
  if (agentName && clientUtxos.length > 0) {
    try {
      const egoReward = milestone.egoReward || 10;
      egoMintTx = await buildEgoMintTx({
        agentAddress: escrowData.agentAddress,
        agentName,
        amount: egoReward,
        completionNumber: currentMilestone + 1,
        minterAddress: changeAddress,
        minterUtxos: clientUtxos.slice(0, 1), // Use one UTXO for EGO minting
        currentHeight,
      });
    } catch (error) {
      // Failed to build EGO mint transaction
      // Continue without EGO minting if it fails
    }
  }

  return { milestoneReleaseTx, egoMintTx };
}

/**
 * Refund milestone escrow after current milestone deadline
 */
export async function refundMilestoneEscrowTx(
  escrowBoxId: string,
  clientUtxos: any[],
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();
  const escrowBox = await getBoxById(escrowBoxId);
  
  if (!escrowBox) {
    throw new Error('Milestone escrow box not found');
  }

  // Parse escrow data
  const escrowData = parseMilestoneEscrowBox(escrowBox);
  if (!escrowData) {
    throw new Error('Invalid milestone escrow box format');
  }

  // Check if current milestone deadline has passed
  const currentMilestone = escrowData.milestones[escrowData.currentMilestone];
  if (currentHeight <= currentMilestone.deadlineHeight) {
    throw new Error(
      `Cannot refund yet. Current height: ${currentHeight}, milestone deadline: ${currentMilestone.deadlineHeight}`
    );
  }

  // Calculate refund amounts
  const escrowValue = BigInt(escrowBox.value);
  const protocolFee = escrowValue / BigInt(100); // 1%
  const txFee = RECOMMENDED_TX_FEE;
  const refundAmount = escrowValue - protocolFee - txFee;

  // Create refund outputs
  const refundOutput = new OutputBuilder(refundAmount, escrowData.clientAddress);
  const feeOutput = new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS);

  const inputs = [escrowBox, ...clientUtxos];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([refundOutput, feeOutput])
    .sendChangeTo(changeAddress)
    .payFee(txFee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

// ─── Box Parsing and Queries ────────────────────────────────────────

/**
 * Parse a milestone escrow box into structured data
 */
export function parseMilestoneEscrowBox(box: any): MilestoneEscrowBox | null {
  try {
    const registers = box.additionalRegisters || {};
    
    if (!registers.R4 || !registers.R5 || !registers.R6 || 
        !registers.R7 || !registers.R8 || !registers.R9) {
      return null;
    }

    // Parse metadata
    const metadataBytes = Buffer.from(registers.R9, 'hex');
    const metadataStr = new TextDecoder().decode(metadataBytes);
    const metadata = JSON.parse(metadataStr);

    // Reconstruct milestones from metadata and register data
    const deadlines = JSON.parse(registers.R6); // Array of deadlines
    const percentagesBp = JSON.parse(registers.R7); // Array of percentages in basis points
    
    const milestones: Milestone[] = metadata.milestones.map((m: any, i: number) => ({
      name: m.name,
      description: m.description,
      percentage: percentagesBp[i] / 100, // Convert back from basis points
      deadlineHeight: deadlines[i],
      deliverables: m.deliverables || [],
      egoReward: m.egoReward || 10,
    }));

    return {
      boxId: box.boxId,
      transactionId: box.transactionId,
      clientAddress: '', // Would need to derive from R4
      agentAddress: '', // Would need to derive from R5  
      totalAmount: BigInt(box.value),
      currentMilestone: parseInt(registers.R8),
      milestones,
      taskId: metadata.taskId,
      metadata: metadata,
      status: box.spentTransactionId ? 'completed' : 'active',
      creationHeight: box.creationHeight || 0,
    };
  } catch (error) {
    console.error('Error parsing milestone escrow box:', error);
    return null;
  }
}

// ─── Milestone Management Utilities ──────────────────────────────────

/**
 * Create common milestone templates
 */
export const MilestoneTemplates = {
  // Simple 3-milestone template: Design -> Development -> Testing
  software3Phase: (baseDeadline: number): Milestone[] => [
    {
      name: 'Design & Planning',
      description: 'Requirements analysis, system design, and project planning',
      percentage: 25,
      deadlineHeight: baseDeadline + (720 * 7), // 1 week
      deliverables: ['Requirements document', 'System architecture', 'Project timeline'],
      egoReward: 8,
    },
    {
      name: 'Development',
      description: 'Core implementation and feature development',
      percentage: 60,
      deadlineHeight: baseDeadline + (720 * 21), // 3 weeks
      deliverables: ['Working software', 'Code documentation', 'Unit tests'],
      egoReward: 15,
    },
    {
      name: 'Testing & Deployment',
      description: 'Quality assurance, testing, and production deployment',
      percentage: 15,
      deadlineHeight: baseDeadline + (720 * 28), // 4 weeks
      deliverables: ['Test results', 'Deployment guide', 'User documentation'],
      egoReward: 7,
    },
  ],

  // Content creation template: Research -> Draft -> Final
  content3Phase: (baseDeadline: number): Milestone[] => [
    {
      name: 'Research & Outline',
      description: 'Topic research and content structure planning',
      percentage: 30,
      deadlineHeight: baseDeadline + (720 * 3), // 3 days
      deliverables: ['Research notes', 'Content outline', 'Reference list'],
      egoReward: 6,
    },
    {
      name: 'Draft Creation',
      description: 'First draft writing and initial content creation',
      percentage: 50,
      deadlineHeight: baseDeadline + (720 * 7), // 1 week
      deliverables: ['Complete first draft', 'Supporting materials', 'Initial reviews'],
      egoReward: 10,
    },
    {
      name: 'Editing & Finalization',
      description: 'Content editing, review incorporation, and final delivery',
      percentage: 20,
      deadlineHeight: baseDeadline + (720 * 10), // 10 days
      deliverables: ['Final content', 'Revision notes', 'Quality checklist'],
      egoReward: 4,
    },
  ],

  // Custom milestone creator
  createCustom: (
    phases: Array<{
      name: string;
      description: string;
      percentage: number;
      daysFromStart: number;
      deliverables: string[];
    }>,
    startHeight: number
  ): Milestone[] => {
    return phases.map(phase => ({
      name: phase.name,
      description: phase.description,
      percentage: phase.percentage,
      deadlineHeight: startHeight + (720 * phase.daysFromStart),
      deliverables: phase.deliverables,
      egoReward: Math.max(5, Math.round(phase.percentage / 5)), // Roughly 1 EGO per 5%
    }));
  },
};

// ─── Status and Analytics ────────────────────────────────────────────

/**
 * Calculate milestone progress and statistics
 */
export function calculateMilestoneProgress(escrowData: MilestoneEscrowBox) {
  const totalMilestones = escrowData.milestones.length;
  const completedMilestones = escrowData.currentMilestone;
  const progress = (completedMilestones / totalMilestones) * 100;
  
  const remainingValue = escrowData.milestones
    .slice(escrowData.currentMilestone)
    .reduce((sum, m) => sum + m.percentage, 0);
  
  const nextMilestone = escrowData.currentMilestone < totalMilestones 
    ? escrowData.milestones[escrowData.currentMilestone]
    : null;
  
  return {
    totalMilestones,
    completedMilestones,
    progress,
    remainingPercentage: remainingValue,
    nextMilestone,
    isComplete: completedMilestones >= totalMilestones,
  };
}

/**
 * Check if milestone is overdue
 */
export function isMilestoneOverdue(milestone: Milestone, currentHeight: number): boolean {
  return currentHeight > milestone.deadlineHeight;
}

// ─── Export utilities ────────────────────────────────────────────────

export {
  validateMilestones,
  extractPubKey as pubkeyFromAddress,
  getPropositionBytes,
};