import {
  TransactionBuilder,
  OutputBuilder,
  SConstant,
  SInt,
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
  PLATFORM_FEE_ADDRESS,
  txExplorerUrl,
} from './constants';
import { compileErgoScript } from './compiler';

// ─── Types ───────────────────────────────────────────────────────────

export interface DisputeParams {
  posterAddress: string;
  agentAddress: string;
  amountNanoErg: bigint;
  deadlineHeight: number;
  posterPercent: number; // 0-100
  agentPercent: number; // 0-100
  taskId?: string;
}

export interface DisputeBox {
  boxId: string;
  transactionId: string;
  posterAddress: string;
  agentAddress: string;
  amount: bigint;
  deadlineHeight: number;
  posterPercent: number;
  agentPercent: number;
  status: 'disputed' | 'resolved' | 'refunded' | 'unknown';
  taskId?: string;
  creationHeight: number;
}

// ─── ErgoScript Contract ────────────────────────────────────────────

/**
 * ErgoScript contract for disputed escrows
 * 
 * Register layout:
 *   R4: SigmaProp — poster public key (can open dispute, gets refund after deadline)
 *   R5: Coll[Byte] — agent proposition bytes
 *   R6: Int        — mediation deadline block height (720 blocks from dispute creation)
 *   R7: Int        — poster percentage (0-100)
 *   R8: Int        — agent percentage (0-100) 
 *   R9: Coll[Byte] — task ID (UTF-8)
 * 
 * Contract logic:
 * 1. During mediation period: both parties can agree to split (poster & agent must both sign)
 * 2. After deadline: poster can refund alone (protective default)
 * 3. Split validation: posterPercent + agentPercent == 100
 */
const DISPUTE_ERGOSCRIPT = `{
  // Extract registers
  val posterPubKey = SELF.R4[SigmaProp].get
  val agentPropBytes = SELF.R5[Coll[Byte]].get
  val deadline = SELF.R6[Int].get
  val posterPercent = SELF.R7[Int].get
  val agentPercent = SELF.R8[Int].get
  
  // Validate percentages always sum to 100
  val validPercentages = (posterPercent + agentPercent) == 100 && 
                        posterPercent >= 0 && posterPercent <= 100 &&
                        agentPercent >= 0 && agentPercent <= 100
  
  // Find outputs to poster and agent
  val posterOutputExists = OUTPUTS.exists { (o: Box) =>
    o.propositionBytes == posterPubKey.propBytes &&
    o.value >= (SELF.value * posterPercent) / 100L
  }
  
  val agentOutputExists = OUTPUTS.exists { (o: Box) =>
    o.propositionBytes == agentPropBytes &&
    o.value >= (SELF.value * agentPercent) / 100L
  }
  
  // Agent signature check
  val agentSigned = OUTPUTS.exists { (o: Box) =>
    o.propositionBytes == agentPropBytes
  } && sigmaProp(
    INPUTS.exists { (input: Box) =>
      input.propositionBytes == agentPropBytes
    }
  )
  
  // Resolution paths:
  // 1. Mutual agreement during mediation: both parties sign + valid split
  val mutualResolution = HEIGHT <= deadline &&
                        posterPubKey &&
                        agentSigned &&
                        validPercentages &&
                        posterOutputExists &&
                        agentOutputExists
  
  // 2. Timeout refund: poster gets everything after deadline
  val timeoutRefund = HEIGHT > deadline &&
                     posterPubKey &&
                     OUTPUTS.exists { (o: Box) =>
                       o.propositionBytes == posterPubKey.propBytes &&
                       o.value >= SELF.value - 1000000L  // minus tx fee
                     }
  
  mutualResolution || timeoutRefund
}`;

// ─── Contract compilation ────────────────────────────────────────────

let _compiledDisputeAddress: string | null = null;

/**
 * Get or compile the dispute contract P2S address.
 */
export async function getDisputeContractAddress(): Promise<string> {
  if (_compiledDisputeAddress) return _compiledDisputeAddress;

  try {
    const result = await compileErgoScript(DISPUTE_ERGOSCRIPT);
    _compiledDisputeAddress = result.address;
    console.log('Compiled dispute contract address:', _compiledDisputeAddress);
    return _compiledDisputeAddress;
  } catch (err) {
    console.error('Failed to compile dispute contract:', err);
    throw new Error('Could not compile dispute contract. Check node availability.');
  }
}

// ─── Helper functions ────────────────────────────────────────────────

/**
 * Extract the 33-byte compressed public key from a P2PK Ergo address.
 */
function pubkeyFromAddress(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  const tree = ergoAddr.ergoTree; // hex string
  if (!tree.startsWith('0008cd')) {
    throw new Error(`Address ${address} is not a P2PK address`);
  }
  const pubkeyHex = tree.slice(6); // remove "0008cd" prefix
  return Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
}

/**
 * Get propositionBytes (ergoTree bytes) for an address.
 */
function propositionBytesFromAddress(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  return Uint8Array.from(Buffer.from(ergoAddr.ergoTree, 'hex'));
}

/**
 * Decode a Sigma ZigZag+VLQ encoded integer from hex bytes.
 */
function decodeSigmaVlqInt(hex: string): { value: number; bytesRead: number } {
  let offset = 0;
  let vlq = 0;
  let shift = 0;
  while (offset < hex.length) {
    const byte = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;
    vlq |= (byte & 0x7f) << (7 * shift);
    shift++;
    if ((byte & 0x80) === 0) break;
  }
  // ZigZag decode: (vlq >>> 1) ^ -(vlq & 1)
  const value = (vlq >>> 1) ^ -(vlq & 1);
  return { value, bytesRead: offset / 2 };
}

/**
 * Decode an SInt constant from its serialized hex representation.
 */
function decodeSInt(serializedHex: string): number {
  if (!serializedHex.startsWith('05')) {
    throw new Error(`Expected SInt type prefix 05, got ${serializedHex.slice(0, 2)}`);
  }
  const { value } = decodeSigmaVlqInt(serializedHex.slice(2));
  return value;
}

// ─── Transaction builders ────────────────────────────────────────────

/**
 * Create a dispute transaction: moves funds from escrow to dispute contract
 * This is called when a poster opens a dispute on a task in review status
 */
export async function createDisputeTx(
  escrowBoxId: string,
  params: DisputeParams,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const { posterAddress, agentAddress, amountNanoErg, posterPercent, agentPercent, taskId } = params;

  const validation = validateDisputeParams(params);
  if (!validation.valid) {
    throw new Error(`Invalid dispute params: ${validation.errors.join(', ')}`);
  }

  const currentHeight = await getCurrentHeight();
  const contractAddress = await getDisputeContractAddress();
  
  // Mediation period: 720 blocks (~1 day)
  const mediationDeadline = currentHeight + 720;

  // Get the escrow box
  const escrowBox = await getBoxById(escrowBoxId);
  if (!escrowBox) {
    throw new Error('Escrow box not found');
  }

  // R4: poster SigmaProp (can refund after deadline)
  const posterPubkey = pubkeyFromAddress(posterAddress);

  // R5: agent propositionBytes
  const agentPropBytes = propositionBytesFromAddress(agentAddress);

  // R9: task ID as bytes
  const taskBytes = new TextEncoder().encode(taskId || '');

  // Build the dispute output at the contract address
  const disputeOutput = new OutputBuilder(amountNanoErg, contractAddress)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(posterPubkey))),
      R5: SConstant(SColl(SByte, agentPropBytes)),
      R6: SConstant(SInt(mediationDeadline)),
      R7: SConstant(SInt(posterPercent)),
      R8: SConstant(SInt(agentPercent)),
      R9: SConstant(SColl(SByte, taskBytes)),
    });

  // Convert explorer box format to Fleet SDK format
  const convertedRegisters = Object.fromEntries(
    Object.entries((escrowBox as any).additionalRegisters || {}).map(([key, val]: [string, any]) => {
      if (typeof val === 'object' && val?.serializedValue) {
        return [key, val.serializedValue];
      }
      return [key, val];
    })
  );

  const fleetEscrowBox: any = {
    ...escrowBox,
    additionalRegisters: convertedRegisters,
  };

  const inputs: any[] = [fleetEscrowBox, ...(Array.isArray(walletUtxos) ? walletUtxos : [])];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([disputeOutput])
    .sendChangeTo(changeAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Resolve dispute with agreed split: both parties get their percentage
 */
export async function resolveDisputeTx(
  disputeBoxId: string,
  posterAddress: string,
  agentAddress: string,
  posterPercent: number,
  agentPercent: number,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();

  const rawBox = await getBoxById(disputeBoxId);
  if (!rawBox) {
    throw new Error('Dispute box not found on-chain');
  }

  // Convert explorer box format to Fleet SDK format
  const convertedRegisters = Object.fromEntries(
    Object.entries((rawBox as any).additionalRegisters || {}).map(([key, val]: [string, any]) => {
      if (typeof val === 'object' && val?.serializedValue) {
        return [key, val.serializedValue];
      }
      return [key, val];
    })
  );

  const disputeBox: any = {
    ...rawBox,
    additionalRegisters: convertedRegisters,
  };

  // Validate the dispute box
  const validation = validateDisputeBox(disputeBox);
  if (!validation.valid) {
    throw new Error(`Invalid dispute box: ${validation.errors.join(', ')}`);
  }

  // Validate percentages
  if (posterPercent + agentPercent !== 100 || posterPercent < 0 || agentPercent < 0) {
    throw new Error('Invalid percentage split: must sum to 100 and be non-negative');
  }

  const disputeValue = BigInt(disputeBox.value);
  const fee = RECOMMENDED_TX_FEE;
  
  // Calculate splits (subtract fee from total first)
  const totalAfterFee = disputeValue - fee;
  const posterAmount = (totalAfterFee * BigInt(posterPercent)) / 100n;
  const agentAmount = (totalAfterFee * BigInt(agentPercent)) / 100n;

  if (posterAmount < MIN_BOX_VALUE && posterPercent > 0) {
    throw new Error('Poster amount below minimum box value');
  }
  if (agentAmount < MIN_BOX_VALUE && agentPercent > 0) {
    throw new Error('Agent amount below minimum box value');
  }

  const outputs: any[] = [];

  // Add poster output if they get anything
  if (posterPercent > 0) {
    outputs.push(new OutputBuilder(posterAmount, posterAddress));
  }

  // Add agent output if they get anything
  if (agentPercent > 0) {
    outputs.push(new OutputBuilder(agentAmount, agentAddress));
  }

  const inputs: any[] = [disputeBox, ...(Array.isArray(walletUtxos) ? walletUtxos : [])];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to(outputs)
    .sendChangeTo(changeAddress)
    .payFee(fee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Refund dispute after mediation deadline: poster gets everything back
 */
export async function refundDisputeTx(
  disputeBoxId: string,
  posterAddress: string,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();

  const rawBox = await getBoxById(disputeBoxId);
  if (!rawBox) {
    throw new Error('Dispute box not found on-chain');
  }

  // Convert explorer box format to Fleet SDK format
  const convertedRegisters = Object.fromEntries(
    Object.entries((rawBox as any).additionalRegisters || {}).map(([key, val]: [string, any]) => {
      if (typeof val === 'object' && val?.serializedValue) {
        return [key, val.serializedValue];
      }
      return [key, val];
    })
  );

  const disputeBox: any = {
    ...rawBox,
    additionalRegisters: convertedRegisters,
  };

  // Validate the dispute box
  const validation = validateDisputeBox(disputeBox);
  if (!validation.valid) {
    throw new Error(`Invalid dispute box: ${validation.errors.join(', ')}`);
  }

  // Check deadline
  const deadlineReg = disputeBox.additionalRegisters?.R6;
  if (!deadlineReg) {
    throw new Error('Missing deadline register R6 in dispute box');
  }
  
  let deadlineHeight: number;
  try {
    deadlineHeight = decodeSInt(deadlineReg);
  } catch (err) {
    throw new Error(`Invalid deadline format in R6: ${deadlineReg} — ${(err as Error).message}`);
  }

  if (currentHeight <= deadlineHeight) {
    throw new Error(
      `Cannot refund yet. Current height: ${currentHeight}, deadline: ${deadlineHeight}. ` +
      `Need to wait ${deadlineHeight - currentHeight} more blocks.`
    );
  }

  const disputeValue = BigInt(disputeBox.value);
  const fee = RECOMMENDED_TX_FEE;
  const refundAmount = disputeValue - fee;

  if (refundAmount < MIN_BOX_VALUE) {
    throw new Error('Dispute amount too small to refund after fees');
  }

  const refundOutput = new OutputBuilder(refundAmount, posterAddress);

  const inputs: any[] = [disputeBox, ...(Array.isArray(walletUtxos) ? walletUtxos : [])];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([refundOutput])
    .sendChangeTo(changeAddress)
    .payFee(fee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

// ─── Box parsing and queries ────────────────────────────────────────

export function parseDisputeBox(box: any): DisputeBox | null {
  try {
    const regs = box.additionalRegisters || {};
    
    // Decode values from registers
    const posterPercent = regs.R7 ? decodeSInt(regs.R7) : 0;
    const agentPercent = regs.R8 ? decodeSInt(regs.R8) : 0;
    
    return {
      boxId: box.boxId as string,
      transactionId: box.transactionId as string,
      posterAddress: box.address as string,
      agentAddress: '',
      amount: BigInt((box.value as string) || '0'),
      deadlineHeight: regs.R6 ? decodeSInt(regs.R6) : 0,
      posterPercent,
      agentPercent,
      status: (box as Record<string, unknown>).settlementHeight ? 'resolved' : 'disputed',
      taskId: '',
      creationHeight: (box.creationHeight as number) || 0,
    };
  } catch {
    return null;
  }
}

export async function getActiveDisputesByAddress(address: string): Promise<DisputeBox[]> {
  try {
    const contractAddress = await getDisputeContractAddress();
    const boxes = await getBoxesByAddress(contractAddress);
    return boxes
      .filter((box: any) => {
        const regs = (box.additionalRegisters || {}) as Record<string, unknown>;
        return regs.R4 && regs.R5 && regs.R6 && regs.R7 && regs.R8;
      })
      .map((box: any) => parseDisputeBox(box))
      .filter((b: DisputeBox | null): b is DisputeBox => b !== null);
  } catch {
    return [];
  }
}

// ─── Validation ──────────────────────────────────────────────────────

export function validateDisputeParams(params: DisputeParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.posterAddress || params.posterAddress.length < 10) {
    errors.push('Invalid poster address');
  }
  if (!params.agentAddress || params.agentAddress.length < 10) {
    errors.push('Invalid agent address');
  }
  if (params.amountNanoErg < MIN_BOX_VALUE) {
    errors.push(`Amount must be at least ${MIN_BOX_VALUE} nanoERG (0.001 ERG)`);
  }
  if (params.deadlineHeight <= 0) {
    errors.push('Deadline must be a positive block height');
  }
  if (params.posterPercent < 0 || params.posterPercent > 100) {
    errors.push('Poster percentage must be between 0 and 100');
  }
  if (params.agentPercent < 0 || params.agentPercent > 100) {
    errors.push('Agent percentage must be between 0 and 100');
  }
  if (params.posterPercent + params.agentPercent !== 100) {
    errors.push('Poster and agent percentages must sum to 100');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDisputeBox(disputeBox: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!disputeBox) {
    errors.push('Dispute box is null or undefined');
    return { valid: false, errors };
  }

  // Check basic box properties
  if (!disputeBox.boxId) {
    errors.push('Missing box ID');
  }
  if (!disputeBox.value || BigInt(disputeBox.value) < MIN_BOX_VALUE) {
    errors.push('Box has insufficient value');
  }

  // Check required registers exist
  const regs = disputeBox.additionalRegisters || {};
  if (!regs.R4) errors.push('Missing poster public key (R4)');
  if (!regs.R5) errors.push('Missing agent proposition bytes (R5)');
  if (!regs.R6) errors.push('Missing deadline (R6)');
  if (!regs.R7) errors.push('Missing poster percentage (R7)');
  if (!regs.R8) errors.push('Missing agent percentage (R8)');
  if (!regs.R9) errors.push('Missing task ID (R9)');

  // Validate percentages
  if (regs.R7 && regs.R8) {
    try {
      const posterPercent = decodeSInt(regs.R7);
      const agentPercent = decodeSInt(regs.R8);
      
      if (posterPercent < 0 || posterPercent > 100) {
        errors.push('Invalid poster percentage in R7');
      }
      if (agentPercent < 0 || agentPercent > 100) {
        errors.push('Invalid agent percentage in R8');
      }
      if (posterPercent + agentPercent !== 100) {
        errors.push('Percentages in R7 and R8 do not sum to 100');
      }
    } catch (err) {
      errors.push(`Failed to parse percentages: ${(err as Error).message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Utilities ───────────────────────────────────────────────────────

export function calculateDisputeSplit(totalAmount: bigint, posterPercent: number, agentPercent: number) {
  const posterAmount = (totalAmount * BigInt(posterPercent)) / 100n;
  const agentAmount = (totalAmount * BigInt(agentPercent)) / 100n;
  
  return {
    posterAmount,
    agentAmount,
    totalSplit: posterAmount + agentAmount
  };
}

export function isDisputeExpired(disputeBox: DisputeBox, currentHeight: number): boolean {
  return currentHeight > disputeBox.deadlineHeight;
}

export function getBlocksUntilExpiry(disputeBox: DisputeBox, currentHeight: number): number {
  return Math.max(0, disputeBox.deadlineHeight - currentHeight);
}

export { txExplorerUrl };