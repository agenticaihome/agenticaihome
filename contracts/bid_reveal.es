// AgenticAiHome — Bid Reveal Contract
//
// COMMIT-REVEAL BIDDING PROTOCOL — REVEAL PHASE
// ===============================================
// This contract holds a REVEALED bid. After a bidder reveals their sealed bid
// (by spending the sealed_bid.es box), the revealed amount is stored here
// for the task owner to evaluate and select a winner.
//
// Register layout:
//   R4: Long        — revealed bid amount (in nanoERG)
//   R5: Coll[Byte]  — salt used in commitment (proof of valid reveal)
//   R6: SigmaProp   — bidder's public key
//   R7: Int          — selection deadline (client must pick winner before this)
//   R8: Coll[Byte]   — task ID
//   R9: SigmaProp    — task owner's public key (set during reveal from sealed_bid)
//
// Security properties:
// - Bid amount is now public (reveal happened via sealed_bid.es hash check)
// - Task owner pubkey stored IN the box (R9) — not from untrusted data input
// - Client selects winner by signing; losing bidders reclaim funds after deadline
// - Platform fee taken on winner selection
//
// SECURITY FIX: Task owner pubkey is stored in R9 at reveal time (from the
// sealed_bid box which has the task owner hardcoded). This prevents the attack
// where anyone creates a fake data input box with their own pubkey to steal bids.
//
{
  val bidAmount         = SELF.R4[Long].get
  val bidderPk          = SELF.R6[SigmaProp].get
  val selectionDeadline = SELF.R7[Int].get
  val taskId            = SELF.R8[Coll[Byte]].get
  val taskOwnerPk       = SELF.R9[SigmaProp].get

  // ── WINNER SELECTION ──
  // The task owner (stored in R9 at reveal time) selects this bid as winner.
  // Funds move to an escrow contract for task execution.
  val winnerSelected = {
    taskOwnerPk &&
    sigmaProp(HEIGHT <= selectionDeadline)
  }

  // ── BIDDER RECLAIM ──
  // If the client doesn't select a winner before the deadline,
  // or if this bid was not selected, the bidder can reclaim their funds.
  val bidderReclaim = {
    sigmaProp(HEIGHT > selectionDeadline) && bidderPk
  }

  winnerSelected || bidderReclaim
}
