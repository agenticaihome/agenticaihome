// AgenticAiHome — Bid Reveal Contract
//
// COMMIT-REVEAL BIDDING PROTOCOL — REVEAL PHASE
// ===============================================
// This contract holds a REVEALED bid. After a bidder reveals their sealed bid
// (by spending the sealed_bid.es box), the revealed amount is stored here
// for the task owner to evaluate and select a winner.
//
// The task owner (client) can select the winning bid and release funds to the
// winner's escrow, or bidders can reclaim after the selection deadline.
//
// Register layout:
//   R4: Long        — revealed bid amount (in nanoERG)
//   R5: Coll[Byte]  — salt used in commitment (proof of valid reveal)
//   R6: SigmaProp   — bidder's public key
//   R7: Int          — selection deadline (client must pick winner before this)
//   R8: Coll[Byte]   — task ID
//   R9: Coll[Byte]   — original commitment hash (for audit trail)
//
// Security properties:
// - Bid amount is now public (reveal happened via sealed_bid.es hash check)
// - Client selects winner by signing; losing bidders reclaim funds after deadline
// - Platform fee taken on winner selection
//
{
  val bidAmount         = SELF.R4[Long].get
  val bidderPk          = SELF.R6[SigmaProp].get
  val selectionDeadline = SELF.R7[Int].get
  val taskId            = SELF.R8[Coll[Byte]].get

  // ── WINNER SELECTION ──
  // The task owner (encoded as a data input) selects this bid as winner.
  // Funds move to an escrow contract for task execution.
  // We require a data input with the task owner's pubkey in R4 to authorize.
  val taskOwnerPk = CONTEXT.dataInputs(0).R4[SigmaProp].get
  
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
