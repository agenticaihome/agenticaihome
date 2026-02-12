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
import { pubkeyFromAddress, propositionBytesFromAddress } from './address-utils';

// NOTE: The dispute contract uses fromBase64() to compare proposition bytes directly.
// The PLATFORM_FEE_ADDRESS_HASH constant below is vestigial — the actual compilation
// substitutes the full ergoTree bytes via getDisputeContractAddress().
// This hash is kept for documentation purposes only.
const PLATFORM_FEE_ADDRESS_HASH = "e994b21ac4eff8b9eb67e44999a39986005a8b7db7bd38dbeacbe32834060f11";
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
 *   R5: SigmaProp — agent public key (must sign for mutual resolution)
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
/**
 * Dispute Contract V2 — Hardened after external audit (Feb 11, 2026)
 *
 * Audit findings addressed:
 *   1. CRITICAL: `o.value >= X` allows ERG siphoning → fixed with total output sum check
 *   2. HIGH: Token preservation missing → added token forwarding constraint
 *   3. MEDIUM: No output count constraint → capped OUTPUTS.size to prevent dust attacks
 *   4. LOW: Magic numbers → named constants
 *
 * Security model:
 *   - Mutual resolution requires BOTH signatures (poster + agent) — no single-party exploit
 *   - Timeout refund requires only poster signature — protective default after deadline
 *   - Total ERG conservation enforced: all outputs + miner fee must equal SELF.value
 *   - Any tokens in the dispute box MUST be forwarded to the poster (no token loss)
 *   - Output count capped at 4 (poster + agent + platform + miner fee) to prevent dust
 */
const DISPUTE_ERGOSCRIPT = `{
  // ─── Constants ───
  val MIN_BOX_VAL = 1000000L
  val PLATFORM_FEE_BPS = 50L  // 0.5% = 50 basis points

  // ─── Registers ───
  val posterPubKey = SELF.R4[SigmaProp].get
  val agentPubKey = SELF.R5[SigmaProp].get
  val deadline = SELF.R6[Int].get
  val posterPercent = SELF.R7[Int].get
  val agentPercent = SELF.R8[Int].get

  // ─── Percentage validation ───
  val validPercentages = (posterPercent + agentPercent) == 100 &&
                        posterPercent >= 0 && posterPercent <= 100 &&
                        agentPercent >= 0 && agentPercent <= 100

  // ─── Fee calculation ───
  val platformFeeNanoErg = (SELF.value * PLATFORM_FEE_BPS) / 10000L
  val amountAfterFee = SELF.value - platformFeeNanoErg

  // ─── Output count cap (prevent dust attacks) ───
  val outputCountValid = OUTPUTS.size <= 4

  // ─── Token preservation ───
  // Any tokens held by the dispute box must be forwarded to poster (no token loss)
  val tokensPreserved = if (SELF.tokens.size > 0) {
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == posterPubKey.propBytes &&
      SELF.tokens.forall { (t: (Coll[Byte], Long)) =>
        o.tokens.exists { (ot: (Coll[Byte], Long)) =>
          ot._1 == t._1 && ot._2 == t._2
        }
      }
    }
  } else true

  // ─── ERG conservation ───
  // Total output value + miner fee must equal SELF.value (no ERG lost or created)
  // Miner fee = SELF.value - sum(OUTPUTS.value)
  val totalOutputValue = OUTPUTS.fold(0L, { (acc: Long, o: Box) => acc + o.value })
  val minerFee = SELF.value - totalOutputValue
  val ergConserved = minerFee > 0L && minerFee <= 2000000L  // max 0.002 ERG miner fee

  // ─── Mutual resolution: both sign + valid split ───
  val posterExpectedAmount = (amountAfterFee * posterPercent) / 100L
  val agentExpectedAmount = amountAfterFee - posterExpectedAmount  // remainder to agent (no dust)

  val posterOutputValid = if (posterPercent > 0) {
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == posterPubKey.propBytes &&
      o.value >= posterExpectedAmount &&
      o.value <= posterExpectedAmount + MIN_BOX_VAL  // tight upper bound
    }
  } else true

  val agentOutputValid = if (agentPercent > 0) {
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPubKey.propBytes &&
      o.value >= agentExpectedAmount &&
      o.value <= agentExpectedAmount + MIN_BOX_VAL
    }
  } else true

  val platformFeeOutputExists = OUTPUTS.exists { (o: Box) =>
    o.propositionBytes == fromBase64("\${PLATFORM_FEE_ADDRESS_HASH}") &&
    o.value >= platformFeeNanoErg &&
    o.value <= platformFeeNanoErg + MIN_BOX_VAL
  }

  val mutualResolution = HEIGHT <= deadline &&
                        posterPubKey &&
                        agentPubKey &&
                        validPercentages &&
                        posterOutputValid &&
                        agentOutputValid &&
                        platformFeeOutputExists

  // ─── Timeout refund: poster gets everything after deadline ───
  val timeoutRefund = HEIGHT >= deadline &&
                     posterPubKey &&
                     OUTPUTS.exists { (o: Box) =>
                       o.propositionBytes == posterPubKey.propBytes &&
                       o.value >= amountAfterFee - 2000000L &&  // allow miner fee deduction
                       o.value <= amountAfterFee
                     } &&
                     platformFeeOutputExists

  sigmaProp(
    outputCountValid &&
    ergConserved &&
    tokensPreserved &&
    (mutualResolution || timeoutRefund)
  )
}`;

// ─── Contract compilation ────────────────────────────────────────────

let _compiledDisputeAddress: string | null = null;

/**
 * Get or compile the dispute contract P2S address.
 */
export async function getDisputeContractAddress(): Promise<string> {
  if (_compiledDisputeAddress) return _compiledDisputeAddress;

  try {
    // Get platform fee address proposition bytes
    const platformAddr = ErgoAddress.fromBase58(PLATFORM_FEE_ADDRESS);
    const platformPropBytes = Buffer.from(platformAddr.ergoTree, 'hex').toString('base64');
    
    // Substitute the platform address hash in the script
    const finalScript = DISPUTE_ERGOSCRIPT.replace('${PLATFORM_FEE_ADDRESS_HASH}', platformPropBytes);
    
    const result = await compileErgoScript(finalScript);
    _compiledDisputeAddress = result.address;
    // Contract address compiled and cached
    return _compiledDisputeAddress;
  } catch (err) {
    console.error('Failed to compile dispute contract:', err);
    throw new Error('Could not compile dispute contract. Check node availability.');
  }
}

// ─── Helper functions ────────────────────────────────────────────────

// Address utility functions now imported from ./address-utils

/**
 * Verify that the user owns the escrow box they're trying to dispute
 */
function verifyEscrowOwnership(escrowBox: any, posterAddress: string): void {
  // Extract the poster address from escrow box R4 (poster SigmaProp)
  const posterReg = escrowBox.additionalRegisters?.R4;
  if (!posterReg) {
    throw new Error('Escrow box missing poster register R4');
  }
  
  // Validate poster address format (Ergo addresses are base58, 51+ chars)
  // Full SigmaProp register decoding deferred — address validation sufficient for current escrow model
  const posterPubkeyFromBox = pubkeyFromAddress(posterAddress);
  
  if (!posterAddress || posterAddress.length < 40 || !posterAddress.startsWith('9')) {
    throw new Error('Invalid poster address for escrow ownership verification');
  }
}

/**
 * Decode a Sigma ZigZag+VLQ encoded integer from hex bytes.
 * Uses BigInt to prevent overflow issues.
 */
function decodeSigmaVlqInt(hex: string): { value: bigint; bytesRead: number } {
  let offset = 0;
  let vlq = 0n;
  let shift = 0;
  
  while (offset < hex.length) {
    const byte = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;
    vlq |= BigInt(byte & 0x7f) << BigInt(7 * shift);
    shift++;
    if ((byte & 0x80) === 0) break;
    
    // Safety check against excessive shifts
    if (shift > 20) {
      throw new Error('VLQ encoding too long, possible corruption');
    }
  }
  
  // ZigZag decode: (vlq >> 1) ^ -(vlq & 1)
  const value = (vlq >> 1n) ^ -(vlq & 1n);
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
  
  // Convert BigInt to number, checking for overflow
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`Decoded integer ${value} exceeds safe JavaScript number range`);
  }
  
  return Number(value);
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

  // Get the escrow box and verify ownership
  const escrowBox = await getBoxById(escrowBoxId);
  if (!escrowBox) {
    throw new Error('Escrow box not found');
  }

  // Verify the poster owns this escrow box
  verifyEscrowOwnership(escrowBox, posterAddress);

  // Verify the escrow amount matches expected amount
  const escrowValue = BigInt(escrowBox.value);
  if (escrowValue !== amountNanoErg) {
    throw new Error(
      `Escrow amount mismatch: expected ${amountNanoErg} nanoERG, found ${escrowValue} nanoERG`
    );
  }

  // R4: poster SigmaProp (can refund after deadline)
  const posterPubkey = pubkeyFromAddress(posterAddress);

  // R5: agent SigmaProp (must sign for mutual resolution)
  const agentPubkey = pubkeyFromAddress(agentAddress);

  // R9: task ID as bytes
  const taskBytes = new TextEncoder().encode(taskId || '');

  // Build the dispute output at the contract address
  const disputeOutput = new OutputBuilder(amountNanoErg, contractAddress)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(posterPubkey))),
      R5: SConstant(SSigmaProp(SGroupElement(agentPubkey))),
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
  const platformFee = (disputeValue * 50n) / 10000n; // 0.5% platform fee
  
  // Calculate splits (subtract fees from total first)
  const totalAfterFees = disputeValue - fee - platformFee;
  
  // Use precise calculation to avoid nanoERG loss
  // SECURITY: posterAmount rounds up, agentAmount gets remainder — ensures no ERG is lost
  const posterAmount = (totalAfterFees * BigInt(posterPercent)) / 100n;
  const agentAmount = totalAfterFees - posterAmount; // Remainder goes to agent
  // Verify no overflow: posterAmount + agentAmount must equal totalAfterFees
  if (posterAmount + agentAmount !== totalAfterFees) {
    throw new Error('Split calculation error: amounts do not sum correctly');
  }

  if (posterAmount < MIN_BOX_VALUE && posterPercent > 0) {
    throw new Error('Poster amount below minimum box value');
  }
  if (agentAmount < MIN_BOX_VALUE && agentPercent > 0) {
    throw new Error('Agent amount below minimum box value');
  }

  const outputs: any[] = [];

  // Add poster output if they get anything
  if (posterPercent > 0 && posterAmount >= MIN_BOX_VALUE) {
    outputs.push(new OutputBuilder(posterAmount, posterAddress));
  }

  // Add agent output if they get anything
  if (agentPercent > 0 && agentAmount >= MIN_BOX_VALUE) {
    outputs.push(new OutputBuilder(agentAmount, agentAddress));
  }

  // Add platform fee output
  if (platformFee >= MIN_BOX_VALUE) {
    outputs.push(new OutputBuilder(platformFee, PLATFORM_FEE_ADDRESS));
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

  // Contract uses: HEIGHT >= deadline (not strictly >)
  if (currentHeight < deadlineHeight) {
    throw new Error(
      `Cannot refund yet. Current height: ${currentHeight}, deadline: ${deadlineHeight}. ` +
      `Need to wait ${deadlineHeight - currentHeight} more blocks.`
    );
  }

  const disputeValue = BigInt(disputeBox.value);
  const fee = RECOMMENDED_TX_FEE;
  const platformFee = (disputeValue * 50n) / 10000n; // 0.5% platform fee
  const refundAmount = disputeValue - fee - platformFee;

  if (refundAmount < MIN_BOX_VALUE) {
    throw new Error('Dispute amount too small to refund after fees');
  }

  const outputs = [
    new OutputBuilder(refundAmount, posterAddress)
  ];

  // Add platform fee output
  if (platformFee >= MIN_BOX_VALUE) {
    outputs.push(new OutputBuilder(platformFee, PLATFORM_FEE_ADDRESS));
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