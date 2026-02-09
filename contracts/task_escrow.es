{
  // AgenticAiHome Task Escrow Contract v2
  // Secures ERG payment until task completion or dispute resolution
  // 1% protocol fee on every successful completion
  // 
  // R4: Client public key (SigmaProp)
  // R5: Agent public key (SigmaProp)
  // R6: Task ID (Coll[Byte])
  // R7: Task deadline height (Long)
  // R8: Arbiters (Coll[SigmaProp]) - for dispute resolution
  // R9: Protocol fee address (Coll[Byte]) - platform treasury

  val clientPk = SELF.R4[SigmaProp].get
  val agentPk = SELF.R5[SigmaProp].get
  val taskId = SELF.R6[Coll[Byte]].get
  val deadline = SELF.R7[Long].get
  val arbiters = SELF.R8[Coll[SigmaProp]].get
  val protocolFeeAddress = SELF.R9[Coll[Byte]].get

  val minBoxValue = 1000000L  // 0.001 ERG minimum
  val txFee = 1100000L        // standard tx fee
  val feePercent = 1L         // 1% protocol fee
  val feeDenom = 100L

  val escrowValue = SELF.value
  val protocolFee = escrowValue * feePercent / feeDenom
  val agentPayout = escrowValue - protocolFee - txFee

  // Path 1: Client approves work → agent gets 99%, protocol gets 1%
  val clientApproval = {
    clientPk &&
    // Agent receives their payout
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPk.propBytes &&
      o.value >= agentPayout
    } &&
    // Protocol treasury receives the 1% fee
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == protocolFeeAddress &&
      o.value >= protocolFee
    }
  }

  // Path 2: Timeout — client reclaims full amount (no fee on refunds)
  val timeoutReclaim = {
    HEIGHT > deadline &&
    clientPk &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == clientPk.propBytes &&
      o.value >= escrowValue - txFee
    }
  }

  // Path 3: Mutual cancellation — both parties agree, full refund (no fee)
  val mutualCancel = {
    clientPk && agentPk &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == clientPk.propBytes &&
      o.value >= escrowValue - txFee
    }
  }

  // Path 4: Dispute resolution — arbiters decide, 1% fee still applies
  val disputeResolution = {
    arbiters.size >= 3 &&
    {
      val majorityThreshold = (arbiters.size / 2) + 1
      val validArbiterVotes = arbiters.filter(arbiter => arbiter.isProven)
      
      validArbiterVotes.size >= majorityThreshold &&
      // Winner (agent or client) gets payout minus fee
      OUTPUTS.exists { (o: Box) =>
        (o.propositionBytes == agentPk.propBytes || 
         o.propositionBytes == clientPk.propBytes) &&
        o.value >= agentPayout
      } &&
      // Protocol still gets its 1%
      OUTPUTS.exists { (o: Box) =>
        o.propositionBytes == protocolFeeAddress &&
        o.value >= protocolFee
      }
    }
  }

  // Safety: all outputs must meet minimum box value
  val outputValueCheck = {
    OUTPUTS.forall(_.value >= minBoxValue)
  }

  // Final spending condition
  sigmaProp((clientApproval || timeoutReclaim || mutualCancel || disputeResolution) && outputValueCheck)
}
