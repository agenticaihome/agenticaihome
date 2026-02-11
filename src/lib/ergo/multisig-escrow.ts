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
} from '@fleet-sdk/core';
import { getCurrentHeight, getBoxById } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, PLATFORM_FEE_ADDRESS } from './constants';

// ─── Multi-Sig Escrow Contract ──────────────────────────────────────

/**
 * ErgoScript: Multi-Signature Escrow Contract
 *
 * Enhanced escrow for high-value tasks requiring multiple approvers.
 * Supports configurable N-of-M signature schemes (e.g., 2-of-3: client + agent + mediator).
 * Compatible with existing 1-of-1 escrow for simple tasks through configuration.
 *
 * Register Layout:
 * R4: Coll[Coll[Byte]] - Array of participant public keys (client, agent, mediator, etc.)
 * R5: Coll[Byte]       - Agent proposition bytes (payment destination)
 * R6: Int              - Deadline block height
 * R7: Coll[Byte]       - Protocol fee address proposition bytes
 * R8: Coll[Byte]       - Task ID (metadata)
 * R9: Coll[Int]        - Configuration: [requiredSignatures, totalParticipants, timeoutRefundIndex]
 *
 * The contract logic:
 * 1. Multi-sig release: N-of-M signatures + valid outputs (agent + fee)
 * 2. Timeout refund: After deadline, specific participant (usually client) can reclaim
 * 3. Platform fee: Always deducted and sent to protocol treasury
 */
export const MULTISIG_ESCROW_ERGOSCRIPT = `{
  val clientPk = SELF.R4[SigmaProp].get
  val agentPk = SELF.R5[SigmaProp].get  
  val mediatorPk = SELF.R6[SigmaProp].get
  val deadline = SELF.R7[Int].get
  val agentPkBytes = SELF.R8[Coll[Byte]].get
  val feePkBytes = SELF.R9[Coll[Byte]].get
  
  val escrowValue = SELF.value
  val feePercent = 100L  // 1% in basis points  
  val protocolFee = escrowValue * feePercent / 10000L
  val txFee = 1100000L
  val agentPayout = escrowValue - protocolFee - txFee
  
  // Release: any 2-of-3 approve + correct outputs
  val validOutputs = OUTPUTS.exists { (o: Box) => 
    o.propositionBytes == agentPkBytes && o.value >= agentPayout
  } && OUTPUTS.exists { (o: Box) =>
    o.propositionBytes == feePkBytes && o.value >= protocolFee  
  }
  
  val release = atLeast(2, Coll(clientPk, agentPk, mediatorPk)) && sigmaProp(validOutputs)
  
  // Timeout refund: client can reclaim after deadline
  val refund = clientPk && sigmaProp(HEIGHT > deadline)
  
  release || refund
}`;

/**
 * Pre-compiled P2S address for the multi-sig escrow contract.
 * NOTE: Needs compilation via node.ergo.watch
 */
export let MULTISIG_ESCROW_CONTRACT_ADDRESS = '777XzGB9VzAtjbbr5DpEasgzN7HXVit8MqQjeJDvX4jdQGBjJj1dXrjPhrhxuPJnPq8nyM6zPksDtL8nNgK71wK1nsWiYCgb5kHW7AjRsYXWdfStXTNeQR6CeKvCV5zx736xNkYZsCLq5cLpisznZ6zKYCibvzEEJcnN8K82c9tai8Fkf';

// ─── Types ───────────────────────────────────────────────────────────

export interface MultiSigParticipant {
  address: string;
  pubKey: Uint8Array;
  role: 'client' | 'agent' | 'mediator' | 'reviewer' | 'other';
  name?: string;
}

export interface MultiSigEscrowParams {
  participants: MultiSigParticipant[];
  requiredSignatures: number;
  agentAddress: string;
  deadlineHeight: number;
  amountNanoErg: bigint;
  taskId: string;
  timeoutRefundParticipant?: number; // Index of participant who can refund (default: 0)
}

export interface MultiSigEscrowBox {
  boxId: string;
  transactionId: string;
  participants: MultiSigParticipant[];
  requiredSignatures: number;
  agentAddress: string;
  amount: bigint;
  deadlineHeight: number;
  taskId: string;
  timeoutRefundIndex: number;
  status: 'active' | 'released' | 'refunded';
  creationHeight: number;
}

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Extract 33-byte compressed public key from P2PK address
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

// ─── Common Multi-Sig Configurations ────────────────────────────────

/**
 * Create a 2-of-3 escrow configuration: client + agent + mediator
 */
export function create2of3EscrowConfig(
  clientAddress: string,
  agentAddress: string,
  mediatorAddress: string
): MultiSigParticipant[] {
  return [
    {
      address: clientAddress,
      pubKey: extractPubKey(clientAddress),
      role: 'client',
      name: 'Client',
    },
    {
      address: agentAddress,
      pubKey: extractPubKey(agentAddress),
      role: 'agent',
      name: 'Agent',
    },
    {
      address: mediatorAddress,
      pubKey: extractPubKey(mediatorAddress),
      role: 'mediator',
      name: 'Mediator',
    },
  ];
}

/**
 * Create a 1-of-1 escrow configuration (backward compatibility)
 */
export function create1of1EscrowConfig(clientAddress: string): MultiSigParticipant[] {
  return [
    {
      address: clientAddress,
      pubKey: extractPubKey(clientAddress),
      role: 'client',
      name: 'Client',
    },
  ];
}

/**
 * Create a 3-of-5 escrow configuration for high-value tasks
 */
export function create3of5EscrowConfig(
  clientAddress: string,
  agentAddress: string,
  mediator1Address: string,
  mediator2Address: string,
  reviewerAddress: string
): MultiSigParticipant[] {
  return [
    {
      address: clientAddress,
      pubKey: extractPubKey(clientAddress),
      role: 'client',
      name: 'Client',
    },
    {
      address: agentAddress,
      pubKey: extractPubKey(agentAddress),
      role: 'agent',
      name: 'Agent',
    },
    {
      address: mediator1Address,
      pubKey: extractPubKey(mediator1Address),
      role: 'mediator',
      name: 'Primary Mediator',
    },
    {
      address: mediator2Address,
      pubKey: extractPubKey(mediator2Address),
      role: 'mediator',
      name: 'Secondary Mediator',
    },
    {
      address: reviewerAddress,
      pubKey: extractPubKey(reviewerAddress),
      role: 'reviewer',
      name: 'Technical Reviewer',
    },
  ];
}

// ─── Transaction Builders ────────────────────────────────────────────

/**
 * Create a multi-signature escrow transaction
 */
export async function createMultiSigEscrowTx(
  params: MultiSigEscrowParams,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const {
    participants,
    requiredSignatures,
    agentAddress,
    deadlineHeight,
    amountNanoErg,
    taskId,
    timeoutRefundParticipant = 0,
  } = params;

  // Validation
  if (participants.length < 1 || participants.length > 10) {
    throw new Error('Must have 1-10 participants');
  }
  if (requiredSignatures < 1 || requiredSignatures > participants.length) {
    throw new Error('Required signatures must be between 1 and total participants');
  }
  if (timeoutRefundParticipant >= participants.length) {
    throw new Error('Invalid timeout refund participant index');
  }
  if (amountNanoErg < MIN_BOX_VALUE) {
    throw new Error(`Amount must be at least ${MIN_BOX_VALUE} nanoERG`);
  }

  const currentHeight = await getCurrentHeight();

  // Prepare register data for 2-of-3 escrow
  if (participants.length !== 3) {
    throw new Error('Multi-sig escrow now supports exactly 3 participants (2-of-3)');
  }
  
  const clientPubKey = participants[0].pubKey; // Client
  const agentPubKey = participants[1].pubKey;  // Agent  
  const mediatorPubKey = participants[2].pubKey; // Mediator
  const agentPropBytes = getPropositionBytes(agentAddress);
  const feePropBytes = getPropositionBytes(PLATFORM_FEE_ADDRESS);

  // Build 2-of-3 multi-sig escrow output
  const escrowOutput = new OutputBuilder(amountNanoErg, MULTISIG_ESCROW_CONTRACT_ADDRESS)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(clientPubKey))),    // Client key
      R5: SConstant(SSigmaProp(SGroupElement(agentPubKey))),     // Agent key
      R6: SConstant(SSigmaProp(SGroupElement(mediatorPubKey))),  // Mediator key
      R7: SConstant(SInt(deadlineHeight)),                       // Deadline
      R8: SConstant(SColl(SByte, agentPropBytes)),               // Agent address
      R9: SConstant(SColl(SByte, feePropBytes)),                 // Fee address
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
 * Release multi-sig escrow: requires N-of-M signatures
 */
export async function releaseMultiSigEscrowTx(
  escrowBoxId: string,
  signerUtxos: any[], // UTXOs from one of the signers for fees
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();
  const escrowBox = await getBoxById(escrowBoxId);
  
  if (!escrowBox) {
    throw new Error('Escrow box not found');
  }

  // Parse escrow data
  const escrowData = parseMultiSigEscrowBox(escrowBox);
  if (!escrowData) {
    throw new Error('Invalid escrow box format');
  }

  // Calculate amounts
  const escrowValue = BigInt(escrowBox.value);
  const protocolFee = escrowValue / BigInt(100); // 1%
  const txFee = RECOMMENDED_TX_FEE;
  const agentPayout = escrowValue - protocolFee - txFee;

  // Create outputs
  const agentOutput = new OutputBuilder(agentPayout, escrowData.agentAddress);
  const feeOutput = new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS);

  const inputs = [escrowBox, ...signerUtxos];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([agentOutput, feeOutput])
    .sendChangeTo(changeAddress)
    .payFee(txFee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Refund multi-sig escrow after timeout
 */
export async function refundMultiSigEscrowTx(
  escrowBoxId: string,
  refunderUtxos: any[], // UTXOs from the designated refund participant
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();
  const escrowBox = await getBoxById(escrowBoxId);
  
  if (!escrowBox) {
    throw new Error('Escrow box not found');
  }

  // Parse escrow data
  const escrowData = parseMultiSigEscrowBox(escrowBox);
  if (!escrowData) {
    throw new Error('Invalid escrow box format');
  }

  // Check deadline
  if (currentHeight <= escrowData.deadlineHeight) {
    throw new Error(
      `Cannot refund yet. Current height: ${currentHeight}, deadline: ${escrowData.deadlineHeight}`
    );
  }

  // Calculate refund amount
  // NOTE: Contract refund path does NOT enforce fee output — this is a voluntary protocol fee
  const escrowValue = BigInt(escrowBox.value);
  const protocolFee = escrowValue / BigInt(100); // 1%
  const txFee = RECOMMENDED_TX_FEE;
  if (escrowValue < protocolFee + txFee + MIN_BOX_VALUE) {
    throw new Error('Escrow value too small to refund after fees');
  }
  const refundAmount = escrowValue - protocolFee - txFee;

  // Refund goes to the designated timeout participant
  const refundParticipant = escrowData.participants[escrowData.timeoutRefundIndex];
  const refundOutput = new OutputBuilder(refundAmount, refundParticipant.address);
  const feeOutput = new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS);

  const inputs = [escrowBox, ...refunderUtxos];

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
 * Parse a multi-sig escrow box into structured data
 */
export function parseMultiSigEscrowBox(box: any): MultiSigEscrowBox | null {
  try {
    const registers = box.additionalRegisters || {};
    
    // 2-of-3 contract uses R4-R9 with SigmaProps and SColl[SByte]
    if (!registers.R4 || !registers.R5 || !registers.R6 || 
        !registers.R7 || !registers.R8 || !registers.R9) {
      return null;
    }

    // R4=clientPk, R5=agentPk, R6=mediatorPk (SigmaProps — can't easily parse client-side)
    // R7=deadline (SInt), R8=agent address (SColl[SByte]), R9=fee address (SColl[SByte])
    // For now, return partial data — full deserialization requires sigma-serialization lib
    const participants: MultiSigParticipant[] = [];
    
    return {
      boxId: box.boxId,
      transactionId: box.transactionId,
      participants,
      requiredSignatures: 2, // Hardcoded for 2-of-3 contract
      agentAddress: '', // Would need to deserialize R8 SColl[SByte] → ergoTree → address
      amount: BigInt(box.value),
      deadlineHeight: 0, // Would need SInt deserialization of R7
      taskId: '',
      timeoutRefundIndex: 0, // Client is always index 0 in 2-of-3
      status: box.spentTransactionId ? 'released' : 'active',
      creationHeight: box.creationHeight || 0,
    };
  } catch (error) {
    console.error('Error parsing multi-sig escrow box:', error);
    return null;
  }
}

// ─── Validation and Utilities ────────────────────────────────────────

/**
 * Validate multi-sig escrow parameters
 */
export function validateMultiSigParams(params: MultiSigEscrowParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.participants.length < 1) {
    errors.push('At least one participant required');
  }
  if (params.participants.length > 10) {
    errors.push('Maximum 10 participants allowed');
  }
  if (params.requiredSignatures < 1) {
    errors.push('At least one signature required');
  }
  if (params.requiredSignatures > params.participants.length) {
    errors.push('Required signatures cannot exceed total participants');
  }
  if (!params.agentAddress || params.agentAddress.length < 10) {
    errors.push('Invalid agent address');
  }
  if (params.amountNanoErg < MIN_BOX_VALUE) {
    errors.push(`Amount must be at least ${MIN_BOX_VALUE} nanoERG`);
  }
  if (params.deadlineHeight <= 0) {
    errors.push('Invalid deadline height');
  }

  // Validate all participant addresses
  params.participants.forEach((p, i) => {
    if (!p.address || p.address.length < 10) {
      errors.push(`Invalid address for participant ${i + 1}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Check if current user is a participant in the escrow
 */
export function isParticipant(escrowData: MultiSigEscrowBox, userAddress: string): boolean {
  return escrowData.participants.some(p => p.address === userAddress);
}

/**
 * Get participant by address
 */
export function getParticipantByAddress(
  escrowData: MultiSigEscrowBox,
  address: string
): MultiSigParticipant | null {
  return escrowData.participants.find(p => p.address === address) || null;
}

/**
 * Create a multi-sig dispute resolution transaction
 * Builds transaction for either agent payout or client refund based on mediator decision
 */
export async function resolveMultiSigDispute(
  escrowBoxId: string,
  resolution: 'agent' | 'client',
  mediatorAddress: string,
  signerUtxos: any[],
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();
  const escrowBox = await getBoxById(escrowBoxId);
  
  if (!escrowBox) {
    throw new Error('Escrow box not found');
  }

  // Parse escrow data
  const escrowData = parseMultiSigEscrowBox(escrowBox);
  if (!escrowData) {
    throw new Error('Invalid escrow box format');
  }

  // Calculate amounts
  const escrowValue = BigInt(escrowBox.value);
  const protocolFee = escrowValue / BigInt(100); // 1%
  const txFee = RECOMMENDED_TX_FEE;

  let primaryOutput: any;
  let secondaryOutput: any;

  if (resolution === 'agent') {
    // Release to agent
    const agentPayout = escrowValue - protocolFee - txFee;
    primaryOutput = new OutputBuilder(agentPayout, escrowData.agentAddress);
    secondaryOutput = new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS);
  } else {
    // Refund to client (assuming first participant is client)
    const refundAmount = escrowValue - protocolFee - txFee;
    const clientAddress = escrowData.participants[0]?.address || changeAddress;
    primaryOutput = new OutputBuilder(refundAmount, clientAddress);
    secondaryOutput = new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS);
  }

  const inputs = [escrowBox, ...signerUtxos];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([primaryOutput, secondaryOutput])
    .sendChangeTo(changeAddress)
    .payFee(txFee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Fund multi-sig escrow (alias for createMultiSigEscrowTx for compatibility)
 */
export async function fundMultiSigEscrow(
  clientAddress: string,
  agentAddress: string,
  mediatorAddress: string,
  amountNanoErg: bigint,
  deadlineHeight: number,
  taskId: string,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const participants = create2of3EscrowConfig(clientAddress, agentAddress, mediatorAddress);
  
  const params: MultiSigEscrowParams = {
    participants,
    requiredSignatures: 2,
    agentAddress,
    deadlineHeight,
    amountNanoErg,
    taskId,
    timeoutRefundParticipant: 0, // Client can refund
  };

  return createMultiSigEscrowTx(params, walletUtxos, changeAddress);
}

// ─── Export utilities ────────────────────────────────────────────────

export {
  extractPubKey as pubkeyFromAddress,
  getPropositionBytes,
};