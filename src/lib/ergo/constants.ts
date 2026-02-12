// Network configuration
export type NetworkType = 'mainnet' | 'testnet';

// Default to mainnet — real ERG, real agents
// Cast to NetworkType so ternaries compile regardless of current value
export const NETWORK = 'mainnet' as NetworkType;

// ─── ERGO eUTXO MODEL NOTES ──────────────────────────────────────────
//
// AgenticAiHome leverages Ergo's extended UTXO (eUTXO) model, which is more
// expressive than Bitcoin's UTXO model and more secure than account-based models.
//
// Key eUTXO features we use:
// • Registers (R4-R9) store arbitrary data in boxes
// • SigmaProps enable complex signature schemes
// • Tokens are first-class citizens, not contracts
// • Deterministic execution with no gas limit surprises
// • Data inputs enable read-only access to other boxes
//
// This allows us to implement features like soulbound tokens and complex
// escrow logic that would be difficult or expensive on other chains.

// Explorer URLs based on network
export const ERGO_EXPLORER_API = NETWORK === 'testnet'
  ? 'https://api-testnet.ergoplatform.com/api/v1'
  : 'https://api.ergoplatform.com/api/v1';

export const ERGO_EXPLORER_UI = NETWORK === 'testnet'
  ? 'https://testnet.ergoplatform.com'
  : 'https://explorer.ergoplatform.com';

export const ERGO_NODE_URL = NETWORK === 'testnet'
  ? 'https://api-testnet.ergoplatform.com'
  : 'https://api.ergoplatform.com';

export const NAUTILUS_CHROME_URL = "https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai";
export const MIN_BOX_VALUE = BigInt(1000000); // 0.001 ERG minimum box value
export const RECOMMENDED_TX_FEE = BigInt(1100000); // 0.0011 ERG recommended fee
export const PLATFORM_FEE_PERCENT = 1; // 1% protocol fee
export const PLATFORM_FEE_ADDRESS = NETWORK === 'testnet'
  ? '3WwKzFjZGrtKAUzJBxFUzFqbFbYAMhxjNcB2gb3CPV7GKcmpaBe2' // testnet placeholder
  : '9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK'; // Nate's treasury

export const NANOERG_FACTOR = BigInt(1000000000); // 10^9

// Wallet connection timeout
export const WALLET_CONNECT_TIMEOUT = 30000; // 30 seconds

// Balance refresh interval
export const BALANCE_REFRESH_INTERVAL = 30000; // 30 seconds

// Explorer API endpoints
export const EXPLORER_ENDPOINTS = {
  BLOCKS: "/blocks",
  TRANSACTIONS: "/transactions",
  BOXES: "/boxes",
  ADDRESSES: "/addresses",
  TOKENS: "/tokens",
} as const;

// Supported wallets
export const SUPPORTED_WALLETS = {
  NAUTILUS: "nautilus",
  SAFEW: "safew",
  ERGOPAY: "ergopay",
} as const;

// Escrow contract ErgoScript source (v3 — with 1% platform fee)
// 
// ** SINGLE SOURCE OF TRUTH ** 
// This is the ONLY version of the escrow contract. The v2 contract file 
// (contracts/task_escrow.es) has been removed to prevent confusion.
// This contract source directly matches the deployed mainnet contract.
//
// Register layout:
// R4: SigmaProp — client public key (signer for release/refund)
// R5: Coll[Byte] — agent propositionBytes (payment destination)
// R6: Int       — deadline block height
// R7: Coll[Byte] — protocol fee address propositionBytes
// R8: Coll[Byte] — task ID (metadata)
export const ESCROW_ERGOSCRIPT = `{
  val clientPk       = SELF.R4[SigmaProp].get
  val deadline       = SELF.R6[Int].get
  val feePercent     = 1L
  val feeDenom       = 100L
  val escrowValue    = SELF.value
  val protocolFee    = escrowValue * feePercent / feeDenom
  val txFee          = 1100000L
  val agentPayout    = escrowValue - protocolFee - txFee
  val agentPkBytes   = SELF.R5[Coll[Byte]].get
  val feePkBytes     = SELF.R7[Coll[Byte]].get

  // SECURITY FIX: Prevent integer underflow and ensure valid amounts
  val validAmounts = agentPayout >= 0L && 
                    protocolFee >= 0L && 
                    agentPayout <= escrowValue &&
                    protocolFee <= escrowValue &&
                    (agentPayout + protocolFee + txFee) <= escrowValue

  val clientApproval = {
    clientPk &&
    validAmounts &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPkBytes && o.value >= agentPayout
    } &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == feePkBytes && o.value >= protocolFee
    }
  }

  val timeoutRefund = {
    sigmaProp(HEIGHT > deadline) && clientPk
  }

  clientApproval || timeoutRefund
}`;

// LIVE CONTRACT ADDRESS: Task Escrow Contract (includes integer underflow protection)
// This is the DEPLOYED mainnet contract address with real ERG transactions.
//
// AUDIT NOTE (Feb 11, 2026): Contract uses `o.value >= agentPayout` (not strict equality).
// Risk is LOW because: (1) only client can trigger release (clientPk required),
// (2) TX builder uses exact amounts, (3) no third party can craft a release TX.
// The `>=` pattern only allows overpayment to agent, never underpayment.
// Future escrow contract versions should use tight bounds (>= AND <=) like dispute V2.
// This contract is IMMUTABLE on-chain — cannot be changed without new deployment.
export const ESCROW_CONTRACT_ADDRESS = '29yJts3zALmvcVeYTVqzyXqzrwviZRDTGCCNzX7aLTKxYzP7TXoX6LNvR2w7nRhBWsk86dP3fMHnLvUn5TqwQVvf2ffFPrHZ1bN7hzuGgy6VS4XAmXgpZv3rGu7AA7BeQE47ASQSwLWA9UJzDh';

// SOULBOUND EGO TOKEN CONTRACT - Live on mainnet
// Non-transferable reputation tokens bound to agent addresses
export const SOULBOUND_EGO_CONTRACT_ADDRESS = '49AoNXDVGUF3Y1XVFRjUa22LFJjV2pwQiLCd3usdRaAFvZGNXVCMMqaCL8pEBpqFLko8Bmh222hNh7w722E8bMJRuWT3QG2LCxGjRnv6AKrLAY2ZEA1BrngJynGAT79Z';

// ─── UPCOMING CONTRACT ADDRESSES (In development) ──────────────────────────

// Reputation Oracle Contract - stores agent reputation data on-chain for dApPs to read
// Register layout: R4=treasury pubkey, R5=agent pubkey, R6=ego score, R7=tasks completed, R8=dispute rate, R9=last updated
export const REPUTATION_ORACLE_CONTRACT_ADDRESS = '5f52ZtCEcmed7WoxtVEsN4yH1rCUBZ7epD82drP5xXAeufHaK6ZNpWY6L6fbdDgdmSSNUQGk5njhHBR6bw59FV7toH3umeA3gFHJH6YZrHdTs2a4WpfRFzsUKN7M8wRADVop';

// Multi-Sig Escrow Contract - 2-of-3 escrow: client + agent + mediator signatures
// Register layout: R4=client pubkey, R5=agent pubkey, R6=mediator pubkey, R7=deadline, R8=agent address, R9=fee address
export const MULTISIG_ESCROW_CONTRACT_ADDRESS = '777XzGB9VzAtjbbr5DpEasgzN7HXVit8MqQjeJDvX4jdQGBjJj1dXrjPhrhxuPJnPq8nyM6zPksDtL8nNgK71wK1nsWiYCgb5kHW7AjRsYXWdfStXTNeQR6CeKvCV5zx736xNkYZsCLq5cLpisznZ6zKYCibvzEEJcnN8K82c9tai8Fkf';

// Milestone-Based Escrow Contract - tasks with multiple payment stages
// Register layout: R4=client pubkey, R5=agent address, R6=deadlines, R7=percentages, R8=current milestone, R9=fee address
export const MILESTONE_ESCROW_CONTRACT_ADDRESS = '5UXuLjRVH4rvrWic6CHmPY4gCGFuxesKTkwwkNb9ssonUZ4ewKWzeGKhLNTnM5Z6Q7TwVaPKmVhL2YqZSKtFJhhgHjptAjwy3q5M4QGgN9nvTrM8B767hJ1cDXTJWqBYPNGF9buwXosWCwbez7KnRb6om921qvtWSim6duxKpg2v6xvZ7b63EgTqwXXYVGHHnessAdZPLeVZ8N2tnoRPahf94s9uzmKjcgsekKMPFmugKBPBUtN6bnWzD8bQzzpLQo1cCsajvWdATQ1HG4io4dbftj4hQxkWUoHZfrpsm9DQ9tVnK5hSD49bcb8gnoS6JqFWYdCMsicoXAvmtMtMaDgj9WrUmCoQKtZyo4a4w6X7JtCkXNp';

// Testnet faucet URL
export const TESTNET_FAUCET_URL = 'https://testnet.ergofaucet.org/';

// Transaction explorer link helper
export function txExplorerUrl(txId: string): string {
  return `${ERGO_EXPLORER_UI}/en/transactions/${txId}`;
}

export function addressExplorerUrl(address: string): string {
  return `${ERGO_EXPLORER_UI}/en/addresses/${address}`;
}

export function blockExplorerUrl(height: number): string {
  return `${ERGO_EXPLORER_UI}/en/blocks/${height}`;
}
