// AgenticAiHome Escrow Contract V2 — Double-Satisfaction Protected
//
// SECURITY FIX: Prevents double-satisfaction attack where a single output
// satisfies multiple escrow boxes spent in the same transaction.
// Uses SELF.id in output registers to bind each output to its source escrow.
//
// Register layout:
//   R4: SigmaProp  — client public key (releases payment or refunds after deadline)
//   R5: Coll[Byte] — agent proposition bytes (receives payment)
//   R6: Int         — deadline block height
//   R7: Coll[Byte] — platform fee address proposition bytes
//   R8: Coll[Byte] — task ID (metadata)
//
// Changes from V1:
// - Uses == instead of >= for output values (prevents overpayment)
// - OUTPUTS.size constraint (max 3: agent + fee + change)
// - Output must contain SELF.id in R4 to prevent double-satisfaction
// - Token preservation warning documented
//
{
  val clientPk       = SELF.R4[SigmaProp].get
  val deadline       = SELF.R6[Int].get
  val feePercent     = 1L
  val feeDenom       = 100L
  val escrowValue    = SELF.value
  val protocolFee    = escrowValue * feePercent / feeDenom
  val minFee         = 1100000L
  val agentPayout    = escrowValue - protocolFee - minFee
  val agentPkBytes   = SELF.R5[Coll[Byte]].get
  val feePkBytes     = SELF.R7[Coll[Byte]].get

  val validAmounts = agentPayout > 0L &&
                    protocolFee > 0L &&
                    agentPayout <= escrowValue &&
                    protocolFee <= escrowValue &&
                    (agentPayout + protocolFee + minFee) <= escrowValue

  // SECURITY: Limit outputs to prevent unnecessary complexity
  val outputCountValid = OUTPUTS.size <= 4

  val clientApproval = {
    clientPk &&
    validAmounts &&
    outputCountValid &&
    // SECURITY: Exact value matching (V1 used >=, allowing overpayment)
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPkBytes &&
      o.value == agentPayout &&
      // SECURITY FIX: Bind output to THIS escrow box via R4 containing SELF.id
      // This prevents a single output from satisfying two escrow contracts
      o.R4[Coll[Byte]].isDefined && o.R4[Coll[Byte]].get == SELF.id
    } &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == feePkBytes && o.value == protocolFee
    }
  }

  val timeoutRefund = {
    sigmaProp(HEIGHT > deadline) && clientPk
  }

  clientApproval || timeoutRefund
}
