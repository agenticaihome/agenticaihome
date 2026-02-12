// AgenticAiHome Basic Escrow Contract (LIVE ON MAINNET)
// Address: 29yJts3zALmvcVeYTVqzyXqzrwviZRDTGCCNzX7aLTKxYzP7TXoX6LNvR2w7nRhBWsk86dP3fMHnLvUn5TqwQVvf2ffFPrHZ1bN7hzuGgy6VS4XAmXgpZv3rGu7AA7BeQE47ASQSwLWA9UJzDh
// First mainnet TX: e9f4dab8f64655027c8f1757b5f1235132283f1eae306ee5b4976f8f91361026
//
// Register layout:
//   R4: SigmaProp — client public key (releases payment or refunds after deadline)
//   R5: Coll[Byte] — agent proposition bytes (receives payment)
//   R6: Int        — deadline block height
//   R7: Coll[Byte] — platform fee address proposition bytes
//
// Security: Integer underflow protection, client-only release, deadline enforcement
// Fee: 1% platform fee on release
// Audit: Feb 11, 2026 — SOLID, no critical issues. >=  pattern is low-risk (client-signed only)
{
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
}
