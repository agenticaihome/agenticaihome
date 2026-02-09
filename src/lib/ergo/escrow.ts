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
 * Extract the 33-byte compressed public key from a P2PK Ergo address.
 * P2PK ergoTree = "0008cd" + 33-byte-hex-pubkey
 */
function pubkeyFromAddress(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  const tree = ergoAddr.ergoTree; // hex string
  // P2PK trees start with 0008cd
  if (!tree.startsWith('0008cd')) {
    throw new Error(`Address ${address} is not a P2PK address`);
  }
  const pubkeyHex = tree.slice(6); // remove "0008cd" prefix
  return Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
}

/**
 * Get propositionBytes (ergoTree bytes) for an address.
 * This is what the contract compares OUTPUTS.propositionBytes against.
 */
function propositionBytesFromAddress(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  return Uint8Array.from(Buffer.from(ergoAddr.ergoTree, 'hex'));
}

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

  const escrowBox = await getBoxById(escrowBoxId);
  if (!escrowBox) {
    throw new Error('Escrow box not found on-chain');
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

  const escrowBox = await getBoxById(escrowBoxId);
  if (!escrowBox) {
    throw new Error('Escrow box not found on-chain');
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

export function validateEscrowParams(params: EscrowParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.clientAddress || params.clientAddress.length < 10) {
    errors.push('Invalid client address');
  }
  if (!params.agentAddress || params.agentAddress.length < 10) {
    errors.push('Invalid agent address');
  }
  if (params.clientAddress === params.agentAddress) {
    errors.push('Client and agent addresses cannot be the same');
  }
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
