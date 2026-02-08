{
  // AgenticAiHome Task Escrow Contract
  // Secures ERG payment until task completion or dispute resolution
  // 
  // R4: Client public key (SigmaProp)
  // R5: Agent public key (SigmaProp)
  // R6: Task ID (Coll[Byte])
  // R7: Task deadline height (Long)
  // R8: Arbiters (Coll[SigmaProp]) - for dispute resolution
  // R9: Milestone data (Coll[Byte]) - encoded milestones

  val clientPk = SELF.R4[SigmaProp].get
  val agentPk = SELF.R5[SigmaProp].get
  val taskId = SELF.R6[Coll[Byte]].get
  val deadline = SELF.R7[Long].get
  val arbiters = SELF.R8[Coll[SigmaProp]].get
  val milestoneData = SELF.R9[Coll[Byte]].get

  val minBoxValue = 1000000L // 0.001 ERG minimum

  // Path 1: Client approves work and releases payment to agent
  val clientApproval = {
    clientPk &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPk.propBytes &&
      o.value >= SELF.value - 1000000L // minus transaction fee
    }
  }

  // Path 2: Timeout - client can reclaim if deadline passed and no approval
  val timeoutReclaim = {
    HEIGHT > deadline &&
    clientPk &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == clientPk.propBytes &&
      o.value >= SELF.value - 1000000L
    }
  }

  // Path 3: Dispute resolution - majority of arbiters decide
  val disputeResolution = {
    arbiters.size >= 3 &&
    {
      val validArbiterVotes = arbiters.filter(arbiter => arbiter.isProven)
      val majorityThreshold = (arbiters.size / 2) + 1
      
      validArbiterVotes.size >= majorityThreshold &&
      OUTPUTS.exists { (o: Box) =>
        // Arbiters can send funds to either agent or client
        (o.propositionBytes == agentPk.propBytes || 
         o.propositionBytes == clientPk.propBytes) &&
        o.value >= SELF.value - 1000000L
      }
    }
  }

  // Additional safety: Ensure output box value is valid
  val outputValueCheck = {
    OUTPUTS.exists(_.value >= minBoxValue)
  }

  // Final spending condition
  sigmaProp((clientApproval || timeoutReclaim || disputeResolution) && outputValueCheck)
}