// AgenticAiHome — Sealed Bid (Commit Phase) Contract
// 
// COMMIT-REVEAL BIDDING PROTOCOL
// ==============================
// This contract implements the COMMIT phase of a commit-reveal sealed-bid auction.
// Bidders lock ERG along with a hash commitment of their bid amount, preventing
// other bidders from seeing (and undercutting) bids before the bidding period ends.
//
// Protocol flow:
// 1. COMMIT: Bidder creates this box with hash(bidAmount ++ salt) in R4
// 2. REVEAL: After commitDeadline, bidder spends this box to reveal bid via bid_reveal.es
// 3. REFUND: If bidder doesn't reveal before refundDeadline, they can reclaim funds
//
// Register layout:
//   R4: Coll[Byte] — commitment hash: blake2b256(longToByteArray(bidAmount) ++ salt)
//   R5: SigmaProp  — bidder's public key
//   R6: Int         — commit deadline height (no more commits after this)
//   R7: Int         — refund deadline height (unrevealed bids reclaimable after this)
//   R8: Coll[Byte]  — task ID (links bid to a specific task)
//   R9: SigmaProp   — task owner's public key (carried through to reveal output)
//
// Security properties:
// - Bid amount is hidden until reveal phase (hash commitment)
// - Salt prevents rainbow table / brute-force attacks on bid amounts
// - Height-based deadlines enforce phase transitions on-chain
// - Only the bidder can reveal or refund (bidder pubkey required)
// - Task owner pubkey stored in R9 — passed to bid_reveal box for secure winner selection
//
{
  val commitHash     = SELF.R4[Coll[Byte]].get
  val bidderPk       = SELF.R5[SigmaProp].get
  val commitDeadline = SELF.R6[Int].get
  val refundDeadline = SELF.R7[Int].get
  val taskOwnerPk    = SELF.R9[SigmaProp].get

  // ── REVEAL PATH ──
  // After the commit deadline, the bidder can reveal their bid.
  // The spending transaction must contain an output whose R4 (bid amount as Long)
  // and R5 (salt bytes) hash to match the original commitment.
  // R9 of the reveal output must carry the task owner pubkey from this box.
  val reveal = {
    sigmaProp(HEIGHT > commitDeadline) && bidderPk &&
    sigmaProp(HEIGHT <= refundDeadline) &&
    sigmaProp(
      blake2b256(
        longToByteArray(OUTPUTS(0).R4[Long].get) ++ OUTPUTS(0).R5[Coll[Byte]].get
      ) == commitHash
    ) &&
    // SECURITY: Ensure task owner pubkey is carried to reveal output
    sigmaProp(OUTPUTS(0).R9[SigmaProp].get == taskOwnerPk)
  }

  // ── REFUND PATH ──
  // If the bidder fails to reveal before the refund deadline,
  // they can reclaim their locked funds. This prevents permanent loss.
  val refund = {
    sigmaProp(HEIGHT > refundDeadline) && bidderPk
  }

  reveal || refund
}
