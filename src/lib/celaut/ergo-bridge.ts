/**
 * Ergo Bridge — connects AIH escrow payments with Celaut gas payments.
 *
 * The key insight: both AIH and Celaut use Ergo, so we can create a single
 * Ergo transaction that atomically releases escrow AND deposits gas to the
 * Celaut node. No separate bridging step needed.
 */

import type {
  CelautContract,
  CelautGasAmount,
  CelautGasPrice,
} from './types';
import { ERGO_LEDGER, GAS_DEFAULTS } from './constants';
import { createErgoContract } from './agent-packager';

// ─── Contract Creation ──────────────────────────────────────

/**
 * Create a Celaut payment contract for the Ergo ledger.
 * This contract defines how AIH escrow funds convert to Celaut gas.
 */
export function createCelautPaymentContract(): CelautContract {
  return createErgoContract(ERGO_LEDGER.TOKEN_ID_ERG);
}

// ─── Gas Conversion ─────────────────────────────────────────

/**
 * Convert an ERG escrow amount to Celaut gas units.
 *
 * @param escrowAmountNanoErg - Escrow amount in nanoERG
 * @param gasPrice - Current gas price from the Celaut node
 * @returns Gas amount the escrow buys
 */
export function bridgeEscrowToGas(
  escrowAmountNanoErg: number,
  gasPrice: CelautGasPrice,
): CelautGasAmount {
  const pricePerGas = BigInt(gasPrice.gasAmount.n);
  if (pricePerGas === 0n) {
    return { n: '0' };
  }

  // escrow (nanoERG) * gas_ratio / price
  const escrow = BigInt(escrowAmountNanoErg);
  const ratio = BigInt(GAS_DEFAULTS.ERG_TO_GAS_RATIO);
  const gasUnits = (escrow * ratio) / pricePerGas;

  return { n: gasUnits.toString() };
}

/**
 * Convert Celaut gas amount back to nanoERG estimate.
 */
export function gasToNanoErg(gas: CelautGasAmount, gasPrice: CelautGasPrice): number {
  const gasUnits = BigInt(gas.n);
  const pricePerGas = BigInt(gasPrice.gasAmount.n);
  const ratio = BigInt(GAS_DEFAULTS.ERG_TO_GAS_RATIO);

  if (ratio === 0n) return 0;
  return Number((gasUnits * pricePerGas) / ratio);
}

/**
 * Format gas amount as human-readable ERG string.
 */
export function formatGasAsErg(gas: CelautGasAmount, gasPrice: CelautGasPrice): string {
  const nanoErg = gasToNanoErg(gas, gasPrice);
  const erg = nanoErg / 1_000_000_000;
  return `${erg.toFixed(4)} ERG`;
}

// ─── Unified Payment Transaction ────────────────────────────

/**
 * Parameters for constructing a unified Ergo TX that releases escrow
 * and pays the Celaut node in a single atomic transaction.
 *
 * NOTE: Actual TX construction requires the Ergo SDK (fleet/sigma-rust).
 * This function returns the parameters needed; the wallet context handles signing.
 */
export interface UnifiedPaymentParams {
  taskId: string;
  celautToken: string;
  agentAddress: string;
  /** Escrow box ID on Ergo */
  escrowBoxId: string;
  /** Amount to pay the Celaut node (nanoERG) */
  celautPaymentNanoErg: number;
  /** Amount to pay the agent (nanoERG) */
  agentPaymentNanoErg: number;
  /** Celaut node's deposit address */
  celautDepositAddress: string;
  /** Platform fee (nanoERG) */
  platformFeeNanoErg: number;
}

/**
 * Create parameters for a unified escrow release + Celaut payment TX.
 *
 * The TX has these outputs:
 * 1. Agent payment (agent's Ergo address)
 * 2. Celaut node gas deposit (node's deposit address)
 * 3. Platform fee (AIH treasury)
 * 4. Change back to task creator
 */
export function createUnifiedPaymentTx(
  taskId: string,
  celautToken: string,
  agentAddress: string,
  options: {
    escrowBoxId: string;
    totalEscrowNanoErg: number;
    celautGasPrice: CelautGasPrice;
    celautDepositAddress: string;
    platformFeePercent?: number; // default 2.5%
  },
): UnifiedPaymentParams {
  const feePercent = options.platformFeePercent ?? 2.5;
  const totalEscrow = options.totalEscrowNanoErg;

  const platformFee = Math.floor(totalEscrow * (feePercent / 100));
  // Split remaining between agent and Celaut node (70/30 default)
  const remaining = totalEscrow - platformFee;
  const celautPayment = Math.floor(remaining * 0.3);
  const agentPayment = remaining - celautPayment;

  return {
    taskId,
    celautToken,
    agentAddress,
    escrowBoxId: options.escrowBoxId,
    celautPaymentNanoErg: celautPayment,
    agentPaymentNanoErg: agentPayment,
    celautDepositAddress: options.celautDepositAddress,
    platformFeeNanoErg: platformFee,
  };
}
