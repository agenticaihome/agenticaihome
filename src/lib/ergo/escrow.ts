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
  PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_ADDRESS,
  ESCROW_ERGOSCRIPT,
  ESCROW_CONTRACT_ADDRESS,
  txExplorerUrl,
} from './constants';
import { compileErgoScript } from './compiler';
import { pubkeyFromAddress, propositionBytesFromAddress } from './address-utils';

// ─── Types ───────────────────────────────────────────────────────────

export interface EscrowParams {
  clientAddress: string;
  agentAddress: string;
  amountNanoErg: bigint;
  deadlineHeight: number;
  taskId?: string;
}

export interface EscrowBox {
  boxId: string;
  transactionId: string;
  clientAddress: string;
  agentAddress: string;
  amount: bigint;
  deadlineHeight: number;
  status: 'active' | 'released' | 'refunded' | 'unknown';
  taskId?: string;
  creationHeight: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Decode a Sigma ZigZag+VLQ encoded integer from hex bytes.
 * Used to read SInt register values from serialized box data.
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
 * Format: 05 + ZigZag+VLQ encoded value
 */
function decodeSInt(serializedHex: string): number {
  const prefix = serializedHex.slice(0, 2);
  // 04 = SInt, 05 = SLong in Sigma serialization — both use ZigZag+VLQ
  if (prefix !== '04' && prefix !== '05') {
    throw new Error(`Expected SInt/SLong type prefix 04 or 05, got ${prefix}`);
  }
  const { value } = decodeSigmaVlqInt(serializedHex.slice(2));
  return value;
}

/**
 * Extract the 33-byte compressed public key from a P2PK Ergo address.
 * P2PK ergoTree = "0008cd" + 33-byte-hex-pubkey
 */

/**
 * Get propositionBytes (ergoTree bytes) for an address.
 * This is what the contract compares OUTPUTS.propositionBytes against.
 */

// ─── Contract compilation ────────────────────────────────────────────

let _compiledAddress: string | null = null;

/**
 * Get or compile the escrow contract P2S address.
 * Uses pre-compiled address as primary, falls back to live compilation.
 */
export async function getEscrowContractAddress(): Promise<string> {
  // Use pre-compiled address if available
  if (ESCROW_CONTRACT_ADDRESS) {
    return ESCROW_CONTRACT_ADDRESS;
  }

  if (_compiledAddress) return _compiledAddress;

  try {
    const result = await compileErgoScript(ESCROW_ERGOSCRIPT);
    _compiledAddress = result.address;
    return _compiledAddress;
  } catch (err) {
    console.error('Failed to compile escrow contract:', err);
    throw new Error('Could not compile escrow contract. Check node availability.');
  }
}

// ─── Transaction builders ────────────────────────────────────────────

/**
 * Create an escrow transaction: locks ERG at the P2S contract address.
 *
 * Register layout (must match ESCROW_ERGOSCRIPT):
 *   R4: SigmaProp — client public key
 *   R5: Coll[Byte] — agent propositionBytes (ergoTree)
 *   R6: Int        — deadline block height
 *   R7: Coll[Byte] — platform fee address propositionBytes
 *   R8: Coll[Byte] — task ID (UTF-8)
 *
 * Returns an EIP-12 unsigned transaction ready for Nautilus signing.
 */
export async function createEscrowTx(
  params: EscrowParams,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const { clientAddress, agentAddress, amountNanoErg, deadlineHeight, taskId } = params;

  const validation = validateEscrowParams(params);
  if (!validation.valid) {
    throw new Error(`Invalid escrow params: ${validation.errors.join(', ')}`);
  }

  if (!Array.isArray(walletUtxos) || !walletUtxos.length) {
    throw new Error('No UTXOs available. Make sure your wallet has ERG.');
  }

  const currentHeight = await getCurrentHeight();
  const contractAddress = await getEscrowContractAddress();

  // R4: client SigmaProp (the signer who can release/refund)
  const clientPubkey = pubkeyFromAddress(clientAddress);

  // R5: agent propositionBytes (where funds go on release)
  const agentPropBytes = propositionBytesFromAddress(agentAddress);

  // R7: platform fee address propositionBytes
  const feePropBytes = propositionBytesFromAddress(PLATFORM_FEE_ADDRESS);

  // R8: task ID as bytes
  const taskBytes = new TextEncoder().encode(taskId || '');

  // Build the escrow output at the contract address
  const escrowOutput = new OutputBuilder(amountNanoErg, contractAddress)
    .setAdditionalRegisters({
      R4: SConstant(SSigmaProp(SGroupElement(clientPubkey))),
      R5: SConstant(SColl(SByte, agentPropBytes)),
      R6: SConstant(SInt(deadlineHeight)),
      R7: SConstant(SColl(SByte, feePropBytes)),
      R8: SConstant(SColl(SByte, taskBytes)),
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
 * Release escrow: client approves → agent gets 99%, platform gets 1%.
 *
 * The contract requires:
 *   - Client signature (R4 SigmaProp)
 *   - Output to agent (R5 propositionBytes) with value >= agentPayout
 *   - Output to fee address (R7 propositionBytes) with value >= protocolFee
 */
export async function releaseEscrowTx(
  escrowBoxId: string,
  agentAddress: string,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();

  const rawBox = await getBoxById(escrowBoxId);
  if (!rawBox) {
    throw new Error('Escrow box not found on-chain');
  }

  // Convert explorer box format to Fleet SDK format
  // Explorer returns additionalRegisters as objects {serializedValue, sigmaType, renderedValue}
  // Fleet SDK expects them as plain serialized hex strings
  const convertedRegisters = Object.fromEntries(
    Object.entries((rawBox as any).additionalRegisters || {}).map(([key, val]: [string, any]) => {
      if (typeof val === 'object' && val?.serializedValue) {
        // Validate the hex format
        if (!/^[0-9a-fA-F]*$/.test(val.serializedValue)) {
          throw new Error(`Invalid hex format in register ${key}: ${val.serializedValue}`);
        }
        return [key, val.serializedValue];
      }
      // Validate direct hex values too
      if (typeof val === 'string' && !/^[0-9a-fA-F]*$/.test(val)) {
        throw new Error(`Invalid hex format in register ${key}: ${val}`);
      }
      return [key, val];
    })
  );

  const escrowBox: any = {
    ...rawBox,
    additionalRegisters: convertedRegisters,
  };

  // Validate escrow box structure and data
  const validation = validateEscrowBox(escrowBox, agentAddress);
  if (!validation.valid) {
    throw new Error(`Invalid escrow box: ${validation.errors.join(', ')}`);
  }

  const escrowValue = BigInt(escrowBox.value);
  const fee = RECOMMENDED_TX_FEE;
  const protocolFee = escrowValue / 100n; // 1%
  const agentAmount = escrowValue - protocolFee - fee;

  if (agentAmount < MIN_BOX_VALUE) {
    throw new Error('Escrow amount too small to release after fees');
  }
  if (protocolFee < MIN_BOX_VALUE) {
    throw new Error('Escrow amount too small for protocol fee minimum box value');
  }

  // Agent payout output
  const agentOutput = new OutputBuilder(agentAmount, agentAddress);

  // Protocol fee output
  const feeOutput = new OutputBuilder(protocolFee, PLATFORM_FEE_ADDRESS);

  // Inputs: escrow box first, then wallet UTXOs for miner fee
  const inputs: any[] = [escrowBox, ...(Array.isArray(walletUtxos) ? walletUtxos : [])];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([agentOutput, feeOutput])
    .sendChangeTo(changeAddress)
    .payFee(fee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Refund escrow: client reclaims after deadline (no platform fee).
 *
 * The contract requires:
 *   - HEIGHT > deadline (R6)
 *   - Client signature (R4 SigmaProp)
 *   - Output to client with value >= escrowValue - txFee
 */
export async function refundEscrowTx(
  escrowBoxId: string,
  clientAddress: string,
  walletUtxos: any[],
  changeAddress: string
): Promise<any> {
  const currentHeight = await getCurrentHeight();

  const rawBox = await getBoxById(escrowBoxId);
  if (!rawBox) {
    throw new Error('Escrow box not found on-chain');
  }

  // Convert explorer box format to Fleet SDK format with validation
  const convertedRegisters = Object.fromEntries(
    Object.entries((rawBox as any).additionalRegisters || {}).map(([key, val]: [string, any]) => {
      if (typeof val === 'object' && val?.serializedValue) {
        // Validate the hex format
        if (!/^[0-9a-fA-F]*$/.test(val.serializedValue)) {
          throw new Error(`Invalid hex format in register ${key}: ${val.serializedValue}`);
        }
        return [key, val.serializedValue];
      }
      // Validate direct hex values too
      if (typeof val === 'string' && !/^[0-9a-fA-F]*$/.test(val)) {
        throw new Error(`Invalid hex format in register ${key}: ${val}`);
      }
      return [key, val];
    })
  );

  const escrowBox: any = {
    ...rawBox,
    additionalRegisters: convertedRegisters,
  };

  // Validate escrow box structure and data  
  const validation = validateEscrowBox(escrowBox);
  if (!validation.valid) {
    throw new Error(`Invalid escrow box: ${validation.errors.join(', ')}`);
  }

  // Extract deadline from escrow box R6 register and validate height
  const deadlineReg = escrowBox.additionalRegisters?.R6;
  if (!deadlineReg) {
    throw new Error('Missing deadline register R6 in escrow box');
  }
  
  // R6 contains an SInt value — Sigma uses ZigZag + VLQ encoding
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

  const escrowValue = BigInt(escrowBox.value);
  const fee = RECOMMENDED_TX_FEE;
  const refundAmount = escrowValue - fee;

  if (refundAmount < MIN_BOX_VALUE) {
    throw new Error('Escrow amount too small to refund after fees');
  }

  const refundOutput = new OutputBuilder(refundAmount, clientAddress);

  const inputs: any[] = [escrowBox, ...(Array.isArray(walletUtxos) ? walletUtxos : [])];

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([refundOutput])
    .sendChangeTo(changeAddress)
    .payFee(fee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

// ─── Escrow box parsing ──────────────────────────────────────────────

export function parseEscrowBox(box: any): EscrowBox | null {
  try {
    return {
      boxId: box.boxId as string,
      transactionId: box.transactionId as string,
      clientAddress: box.address as string,
      agentAddress: '',
      amount: BigInt((box.value as string) || '0'),
      deadlineHeight: 0,
      status: (box as Record<string, unknown>).settlementHeight ? 'released' : 'active',
      taskId: '',
      creationHeight: (box.creationHeight as number) || 0,
    };
  } catch {
    return null;
  }
}

export async function getActiveEscrowsByAddress(address: string): Promise<EscrowBox[]> {
  try {
    const contractAddress = await getEscrowContractAddress();
    const boxes = await getBoxesByAddress(contractAddress);
    return boxes
      .filter((box: any) => {
        const regs = (box.additionalRegisters || {}) as Record<string, unknown>;
        return regs.R4 && regs.R5 && regs.R6;
      })
      .map((box: any) => parseEscrowBox(box))
      .filter((b: EscrowBox | null): b is EscrowBox => b !== null);
  } catch {
    return [];
  }
}

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate an escrow box before attempting release/refund operations.
 * Checks box structure, required registers, and data integrity.
 */
export function validateEscrowBox(
  escrowBox: any,
  expectedAgentAddress?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!escrowBox) {
    errors.push('Escrow box is null or undefined');
    return { valid: false, errors };
  }

  // Check basic box properties
  if (!escrowBox.boxId) {
    errors.push('Missing box ID');
  }
  if (!escrowBox.value || BigInt(escrowBox.value) < MIN_BOX_VALUE) {
    errors.push('Box has insufficient value');
  }

  // Check required registers exist
  const regs = escrowBox.additionalRegisters || {};
  if (!regs.R4) errors.push('Missing client public key (R4)');
  if (!regs.R5) errors.push('Missing agent proposition bytes (R5)');
  if (!regs.R6) errors.push('Missing deadline (R6)');
  if (!regs.R7) errors.push('Missing fee address (R7)');
  if (!regs.R8) errors.push('Missing task ID (R8)');

  // Validate register hex format
  const registerKeys = ['R4', 'R5', 'R6', 'R7', 'R8'];
  for (const key of registerKeys) {
    const regValue = regs[key];
    if (regValue && typeof regValue === 'string') {
      if (!/^[0-9a-fA-F]*$/.test(regValue)) {
        errors.push(`Invalid hex format in register ${key}: ${regValue}`);
      }
    }
  }

  // If agent address provided, validate it matches R5
  if (expectedAgentAddress && regs.R5) {
    try {
      const expectedAgentBytes = propositionBytesFromAddress(expectedAgentAddress);
      // R5 is SColl[SByte] serialized: 0e + VLQ-encoded length + raw bytes
      // Strip the SColl header to get the raw proposition bytes
      let r5Hex = regs.R5;
      if (r5Hex.startsWith('0e')) {
        // Read VLQ length after '0e' prefix
        let offset = 2; // skip '0e'
        let len = 0;
        let shift = 0;
        while (offset < r5Hex.length) {
          const byte = parseInt(r5Hex.slice(offset, offset + 2), 16);
          offset += 2;
          len |= (byte & 0x7f) << (7 * shift);
          shift++;
          if ((byte & 0x80) === 0) break;
        }
        r5Hex = r5Hex.slice(offset);
      }
      const r5Bytes = Buffer.from(r5Hex, 'hex');
      
      if (!Buffer.from(expectedAgentBytes).equals(r5Bytes)) {
        errors.push('Agent address does not match R5 register');
      }
    } catch (err) {
      errors.push(`Failed to validate agent address: ${(err as Error).message}`);
    }
  }

  // Validate deadline format (SInt: ZigZag + VLQ encoded)
  if (regs.R6) {
    try {
      const deadlineHeight = decodeSInt(regs.R6);
      if (deadlineHeight <= 0 || !Number.isInteger(deadlineHeight)) {
        errors.push('Invalid deadline height in R6');
      }
    } catch (err) {
      errors.push(`Failed to parse deadline from R6: ${(err as Error).message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateEscrowParams(params: EscrowParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.clientAddress || params.clientAddress.length < 10) {
    errors.push('Invalid client address');
  }
  if (!params.agentAddress || params.agentAddress.length < 10) {
    errors.push('Invalid agent address');
  }
  // Note: same-address allowed for testing. In production, consider re-enabling.
  // if (params.clientAddress === params.agentAddress) {
  //   errors.push('Client and agent addresses cannot be the same');
  // }
  if (params.amountNanoErg < MIN_BOX_VALUE) {
    errors.push(`Amount must be at least ${MIN_BOX_VALUE} nanoERG (0.001 ERG)`);
  }
  // Minimum for release: need agentPayout >= MIN_BOX_VALUE and protocolFee >= MIN_BOX_VALUE
  // protocolFee = amount/100, so amount >= 100 * MIN_BOX_VALUE = 0.1 ERG
  const minForFee = MIN_BOX_VALUE * 100n;
  if (params.amountNanoErg < minForFee) {
    errors.push(`Amount must be at least ${Number(minForFee) / 1e9} ERG to cover protocol fee minimum`);
  }
  if (params.deadlineHeight <= 0) {
    errors.push('Deadline must be a positive block height');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Utilities ───────────────────────────────────────────────────────

export function calculateEscrowFee(amount: bigint): bigint {
  return (amount * BigInt(PLATFORM_FEE_PERCENT)) / 100n;
}

export function calculateNetAmount(grossAmount: bigint): bigint {
  return grossAmount - calculateEscrowFee(grossAmount) - RECOMMENDED_TX_FEE;
}

export function estimateTransactionFee(): bigint {
  return RECOMMENDED_TX_FEE;
}

export { txExplorerUrl };
