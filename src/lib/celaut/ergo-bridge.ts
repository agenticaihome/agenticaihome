/**
 * Ergo Bridge — connects AIH escrow payments with Celaut gas payments.
 *
 * ## How Celaut Ergo Payments Actually Work (from celaut-nodo source)
 *
 * 1. Contract template = `proveDlog(decodePoint())` — simple P2PK ErgoScript
 * 2. CONTRACT_HASH = sha3_256 of the serialized protobuf ScriptTemplate
 * 3. Payment flow:
 *    a. Client calls `GenerateClient()` → gets a client_id
 *    b. Client calls `GenerateDepositToken(client_id)` → gets a deposit_token
 *    c. Client sends ERG to the node's AUXILIAR address with deposit_token in R4
 *    d. Client calls `Payable(Payment)` with the deposit_token + contract + gas_amount
 *    e. Node validates: finds unspent box at its aux address with matching R4 + amount
 *    f. Node credits the client's gas balance
 *
 * 4. Wallet chain: CLIENT_WALLET → AUXILIAR_WALLET → MAIN_WALLET → COLD_WALLET
 *    (node periodically sweeps aux → main → cold)
 *
 * 5. Gas conversion: amount_nanoERG = gas_amount * (1 / GAS_PER_ERG)
 *    i.e., GAS_PER_ERG gas units = 1 ERG = 1_000_000_000 nanoERG
 *
 * 6. Contract identification:
 *    - CelautContract.template.formal = "proveDlog(decodePoint())" as UTF-8 bytes
 *    - CelautContract.script = node's auxiliar receiving address as UTF-8 bytes
 *    - CelautContract.ledger.tags = ["ergo"]
 *    - CelautContract.token_id = "ERG"
 *
 * 7. Payable validation (gateway.py):
 *    validate_payment_process(amount, ledger, contract=template.formal, script, token)
 *    → checks deposit_token exists & is pending
 *    → calls payment_process_validator(amount, token, ledger, script)
 *    → scans unspent boxes at `script` address for box with R4 == token && value == gas_to_nanoerg(amount)
 */

import type {
  CelautContract,
  CelautGasAmount,
  CelautGasPrice,
  CelautPayment,
} from './types';

// ─── Celaut Ergo Constants (from celaut-nodo source) ────────

/** The ErgoScript template used by Celaut nodes — simple P2PK */
export const CELAUT_ERGO_SCRIPT_TEMPLATE = 'proveDlog(decodePoint())';

/** Ergo ledger tag used in Contract.Ledger.tags */
export const ERGO_LEDGER_TAG = 'ergo';

/** Token ID for native ERG */
export const ERG_TOKEN_ID = 'ERG';

/** Default fee for Ergo transactions in nanoERG */
export const ERGO_TX_FEE = 1_000_000; // 0.001 ERG

// ─── Contract Creation ──────────────────────────────────────

/**
 * Create a Celaut-compatible Ergo payment contract.
 *
 * This mirrors how celaut-nodo builds its contract in `ergo/interface.py::init()`:
 * ```python
 * Contract(
 *   ledger=ergo_ledger,           # Ledger(tags=["ergo"], prose=..., formal=...)
 *   token_id="ERG",
 *   script=sender_addr.encode("utf-8"),  # node's auxiliar address
 *   template=ScriptTemplate(prose="", formal=CONTRACT.encode("utf-8"))
 * )
 * ```
 *
 * @param nodeAuxAddress - The Celaut node's auxiliar receiving address (Ergo P2PK address).
 *   This comes from the node's payment contract list (via GetPeerInfo or service API).
 */
export function createCelautErgoContract(nodeAuxAddress: string): CelautContract {
  const encoder = new TextEncoder();
  return {
    template: {
      tags: [],
      prose: '',
      formal: encoder.encode(CELAUT_ERGO_SCRIPT_TEMPLATE),
    },
    script: encoder.encode(nodeAuxAddress),
    tokenId: ERG_TOKEN_ID,
    ledger: {
      tags: [ERGO_LEDGER_TAG],
      prose: 'Ergo Platform',
    },
  };
}

/**
 * Compute the sha3-256 hash of the serialized ScriptTemplate.
 * This is how celaut-nodo identifies payment contracts internally.
 *
 * NOTE: Requires a protobuf serializer + js-sha3 library.
 * In production, the node publishes its CONTRACT_HASH; we match against it.
 */
export async function computeContractHash(_templateFormalUtf8: string): Promise<string> {
  // sha3-256 of the protobuf-serialized ScriptTemplate(prose="", formal=template.encode("utf-8"))
  // Web Crypto doesn't support SHA3 — needs js-sha3 library
  throw new Error('computeContractHash requires js-sha3 library — not yet integrated');
}

// ─── Gas ↔ nanoERG Conversion ───────────────────────────────

/**
 * Convert gas amount to nanoERG.
 *
 * From celaut-nodo: `gas_to_nanoerg(amount) = int(round(amount * (1/GAS_PER_ERG)))`
 * Where GAS_PER_ERG is the node's configured rate (e.g. 1_000_000).
 *
 * @param gasAmount - Gas units (integer as string)
 * @param gasPerErg - The node's GAS_PER_ERG config value (gas units per 1 ERG)
 * @returns nanoERG amount (integer)
 */
export function gasToNanoErg(gasAmount: CelautGasAmount, gasPerErg: number): number {
  const gas = BigInt(gasAmount.n);
  const nanoErgPerErg = 1_000_000_000n;
  // nanoERG = gas * nanoERG_per_ERG / GAS_PER_ERG
  const nanoErg = (gas * nanoErgPerErg) / BigInt(gasPerErg);
  return Number(nanoErg);
}

/**
 * Convert nanoERG to gas amount.
 *
 * Inverse of gasToNanoErg: gas = nanoERG * GAS_PER_ERG / 1_000_000_000
 */
export function nanoErgToGas(nanoErg: number, gasPerErg: number): CelautGasAmount {
  const gas = (BigInt(nanoErg) * BigInt(gasPerErg)) / 1_000_000_000n;
  return { n: gas.toString() };
}

/**
 * Extract the GAS_PER_ERG rate from a node's payment contract (GasPrice).
 *
 * The node advertises its Ergo payment contract in the Service API's
 * `payment_contracts` list. The `gas_amount` in GasPrice represents
 * how many gas units correspond to the contract's base unit.
 */
export function extractGasPerErg(gasPrice: CelautGasPrice): number {
  return parseInt(gasPrice.gasAmount.n, 10);
}

/**
 * Format a gas amount as human-readable ERG.
 */
export function formatGasAsErg(gas: CelautGasAmount, gasPerErg: number): string {
  const nanoErg = gasToNanoErg(gas, gasPerErg);
  const erg = nanoErg / 1_000_000_000;
  if (erg < 0.0001) return `${nanoErg} nanoERG`;
  return `${erg.toFixed(4)} ERG`;
}

// ─── Payment Flow ───────────────────────────────────────────

/**
 * Parameters for making a Celaut Ergo payment.
 *
 * The full payment flow (client-side):
 * 1. Call `CelautClient.generateClient()` → clientId
 * 2. Call proxy for `GenerateDepositToken(clientId)` → depositToken
 * 3. Build Ergo TX: send nanoERG to `nodeAuxAddress` with `depositToken` in R4
 * 4. Submit TX to Ergo network, wait for confirmation
 * 5. Call `CelautClient.makePayment({ depositToken, contract, gasAmount })`
 * 6. Node validates the on-chain box and credits gas to client
 */
export interface CelautErgoPaymentParams {
  /** The deposit token from GenerateDepositToken */
  depositToken: string;
  /** The node's auxiliar receiving address */
  nodeAuxAddress: string;
  /** Gas amount to deposit */
  gasAmount: CelautGasAmount;
  /** The node's GAS_PER_ERG rate */
  gasPerErg: number;
}

/**
 * Build the CelautPayment message to send via `Payable` RPC
 * after the on-chain ERG transfer is confirmed.
 */
export function buildPayableMessage(params: CelautErgoPaymentParams): CelautPayment {
  return {
    depositToken: params.depositToken,
    contract: createCelautErgoContract(params.nodeAuxAddress),
    gasAmount: params.gasAmount,
  };
}

/**
 * Calculate the nanoERG amount to send on-chain for a gas deposit.
 * Includes the Ergo TX fee in the total needed from the wallet.
 */
export function calculatePaymentAmounts(params: CelautErgoPaymentParams): {
  /** Exact nanoERG to put in the output box (what the node validates) */
  boxValue: number;
  /** Total nanoERG needed from wallet (boxValue + fee) */
  totalNeeded: number;
} {
  const boxValue = gasToNanoErg(params.gasAmount, params.gasPerErg);
  return {
    boxValue,
    totalNeeded: boxValue + ERGO_TX_FEE,
  };
}

// ─── Ergo TX Building (Fleet SDK) ──────────────────────────

/**
 * TX parameters for Fleet SDK / Nautilus wallet.
 *
 * This is the client-side equivalent of celaut-nodo's `process_payment()`:
 * ```python
 * out_box = ctx.newTxBuilder().outBoxBuilder()
 *   .value(amount)
 *   .registers([ErgoValue.of(deposit_token.getBytes("utf-8"))])
 *   .contract(Address.create(script.decode('utf-8')).toErgoContract())
 *   .build()
 * ```
 */
export interface CelautErgoTxParams {
  /** Recipient: the node's auxiliar address */
  recipientAddress: string;
  /** Value in nanoERG for the output box */
  valueNanoErg: number;
  /** Deposit token string to store in R4 (UTF-8 encoded) */
  depositToken: string;
}

/**
 * Prepare the TX parameters for a Celaut gas deposit.
 *
 * Usage with Fleet SDK:
 * ```ts
 * const params = prepareCelautDepositTx(paymentParams);
 * new TransactionBuilder(currentHeight)
 *   .from(inputBoxes)
 *   .to(new OutputBuilder(params.valueNanoErg, params.recipientAddress)
 *     .setAdditionalRegisters({
 *       R4: SConstant(SColl(SByte, new TextEncoder().encode(params.depositToken)))
 *     }))
 *   .sendChangeTo(senderAddress)
 *   .payMinFee()
 *   .build()
 * ```
 */
export function prepareCelautDepositTx(params: CelautErgoPaymentParams): CelautErgoTxParams {
  const { boxValue } = calculatePaymentAmounts(params);
  return {
    recipientAddress: params.nodeAuxAddress,
    valueNanoErg: boxValue,
    depositToken: params.depositToken,
  };
}

// ─── AIH Escrow → Celaut Bridge ────────────────────────────

/**
 * Bridge AIH task escrow to a Celaut gas deposit.
 *
 * In the unified flow:
 * 1. Task creator funds AIH escrow (ERG locked in escrow contract)
 * 2. When task is assigned with Celaut execution:
 *    a. Portion of escrow is allocated for Celaut gas
 *    b. Escrow contract releases gas portion to node's aux address (with R4 deposit_token)
 *    c. Remaining escrow stays locked for agent payment on completion
 * 3. On task completion:
 *    a. Agent payment released from remaining escrow
 *    b. Unused gas refunded via `StopService` → refund credited back
 *
 * @param totalEscrowNanoErg - Total escrow amount in nanoERG
 * @param gasPerErg - Node's GAS_PER_ERG rate
 * @param gasAllocationPercent - What % of escrow to allocate for Celaut gas (default 30%)
 */
export function bridgeEscrowToGas(
  totalEscrowNanoErg: number,
  gasPerErg: number,
  gasAllocationPercent: number = 30,
): {
  gasAmount: CelautGasAmount;
  gasNanoErg: number;
  agentNanoErg: number;
  platformFeeNanoErg: number;
} {
  const PLATFORM_FEE_PERCENT = 2.5;

  const platformFee = Math.floor(totalEscrowNanoErg * (PLATFORM_FEE_PERCENT / 100));
  const afterFee = totalEscrowNanoErg - platformFee;
  const gasNanoErg = Math.floor(afterFee * (gasAllocationPercent / 100));
  const agentNanoErg = afterFee - gasNanoErg;

  const gasAmount = nanoErgToGas(gasNanoErg, gasPerErg);

  return {
    gasAmount,
    gasNanoErg,
    agentNanoErg,
    platformFeeNanoErg: platformFee,
  };
}
