import {
  TransactionBuilder,
  OutputBuilder,
  SConstant,
  SInt,
  SColl,
  SByte,
  ErgoAddress,
} from '@fleet-sdk/core';
import { getCurrentHeight, getBoxesByAddress, getBoxById } from './explorer';
import {
  MIN_BOX_VALUE,
  RECOMMENDED_TX_FEE,
  PLATFORM_FEE_PERCENT,
  txExplorerUrl,
} from './constants';

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

// ─── Transaction builders ────────────────────────────────────────────

/**
 * Create an escrow transaction: locks ERG at the client's own address
 * with registers encoding the escrow metadata.
 *
 * MVP approach: The escrow is a standard P2PK box at the client's address
 * with R4=clientAddr, R5=agentAddr, R6=deadline, R7=taskId.
 * This means only the client can spend it (release or refund).
 * A full contract-based escrow would use a P2S address.
 *
 * Returns an EIP-12 unsigned transaction ready for wallet signing.
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

  if (!walletUtxos.length) {
    throw new Error('No UTXOs available. Make sure your wallet has ERG.');
  }

  const currentHeight = await getCurrentHeight();

  // Encode addresses as byte arrays for register storage
  const clientBytes = new TextEncoder().encode(clientAddress);
  const agentBytes = new TextEncoder().encode(agentAddress);
  const taskBytes = new TextEncoder().encode(taskId || '');

  // Build the escrow output — locked at client's address with metadata in registers
  const escrowOutput = new OutputBuilder(amountNanoErg, clientAddress)
    .setAdditionalRegisters({
      R4: SConstant(SColl(SByte, clientBytes)),
      R5: SConstant(SColl(SByte, agentBytes)),
      R6: SConstant(SInt(deadlineHeight)),
      R7: SConstant(SColl(SByte, taskBytes)),
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
 * Release escrow: client sends the escrowed ERG to the agent.
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
  const agentAmount = escrowValue - fee;

  if (agentAmount < MIN_BOX_VALUE) {
    throw new Error('Escrow amount too small to release after fees');
  }

  const releaseOutput = new OutputBuilder(agentAmount, agentAddress);

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from([escrowBox, ...walletUtxos])
    .to([releaseOutput])
    .sendChangeTo(changeAddress)
    .payFee(fee)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

/**
 * Refund escrow: client reclaims funds (after deadline).
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

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from([escrowBox, ...walletUtxos])
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
      boxId: box.boxId,
      transactionId: box.transactionId,
      clientAddress: box.address,
      agentAddress: '',
      amount: BigInt(box.value),
      deadlineHeight: 0,
      status: box.settlementHeight ? 'released' : 'active',
      taskId: '',
      creationHeight: box.creationHeight,
    };
  } catch {
    return null;
  }
}

export async function getActiveEscrowsByAddress(address: string): Promise<EscrowBox[]> {
  try {
    const boxes = await getBoxesByAddress(address);
    return boxes
      .filter((box: any) => {
        const regs = box.additionalRegisters || {};
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
  return grossAmount - calculateEscrowFee(grossAmount);
}

export function estimateTransactionFee(): bigint {
  return RECOMMENDED_TX_FEE;
}
