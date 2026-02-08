{
  // AgenticAiHome Dispute Arbitration Contract
  // Manages dispute resolution with staked arbiters and majority voting
  // Triggered when client or agent contests task completion
  //
  // R4: Original escrow box ID (Coll[Byte])
  // R5: Client public key (SigmaProp)
  // R6: Agent public key (SigmaProp) 
  // R7: Selected arbiters (Coll[SigmaProp]) - exactly 3
  // R8: Dispute deadline height (Long) - arbiters must vote within timeframe
  // R9: Evidence hash (Coll[Byte]) - IPFS hash of dispute evidence
  // R10: Appeal count (Long) - number of appeals so far (max 2)

  val originalEscrowId = SELF.R4[Coll[Byte]].get
  val clientPk = SELF.R5[SigmaProp].get
  val agentPk = SELF.R6[SigmaProp].get
  val arbiters = SELF.R7[Coll[SigmaProp]].get
  val disputeDeadline = SELF.R8[Long].get
  val evidenceHash = SELF.R9[Coll[Byte]].get
  val appealCount = SELF.R10[Long].get

  val minBoxValue = 1000000L
  val arbiterStakeRequired = 5000000L // 0.005 ERG stake per arbiter

  // Verify we have exactly 3 arbiters
  val correctArbiterCount = arbiters.size == 3

  // Path 1: Arbiters vote and majority decides outcome
  val arbiterVoting = {
    val validVotes = arbiters.filter(arbiter => arbiter.isProven)
    val majorityRequired = 2 // 2 out of 3 arbiters
    
    validVotes.size >= majorityRequired &&
    HEIGHT <= disputeDeadline &&
    {
      // Ensure funds go to either client or agent based on majority decision
      val fundRecipient = OUTPUTS.exists { (o: Box) =>
        (o.propositionBytes == clientPk.propBytes || 
         o.propositionBytes == agentPk.propBytes) &&
        o.value >= SELF.value - (3 * 1000000L) // minus fees for arbiters
      }
      
      // Pay arbiter fees to winning voters
      val arbiterFeesDistributed = validVotes.forall { arbiter =>
        OUTPUTS.exists { (o: Box) =>
          o.propositionBytes == arbiter.propBytes &&
          o.value >= 1000000L // Base fee per arbiter
        }
      }
      
      fundRecipient && arbiterFeesDistributed
    }
  }

  // Path 2: Timeout - if arbiters don't vote, client gets refund
  val arbiterTimeout = {
    HEIGHT > disputeDeadline &&
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == clientPk.propBytes &&
      o.value >= SELF.value - 1000000L
    }
  }

  // Path 3: Appeal mechanism - either party can appeal with stake (max 2 appeals)
  val appealProcess = {
    (clientPk || agentPk) &&
    appealCount < 2L && // Maximum 2 appeals allowed
    INPUTS.exists { (i: Box) =>
      i.value >= arbiterStakeRequired && // Appeal stake required
      (i.propositionBytes == clientPk.propBytes || 
       i.propositionBytes == agentPk.propBytes)
    } &&
    OUTPUTS.exists { (o: Box) =>
      // Create new dispute with different arbiters and incremented appeal count
      o.R7[Coll[SigmaProp]].isDefined &&
      o.R7[Coll[SigmaProp]].get != arbiters && // Must be different arbiters
      o.R10[Long].isDefined &&
      o.R10[Long].get == appealCount + 1L // Increment appeal count
    }
  }

  // Evidence integrity check
  val validEvidence = evidenceHash.size == 32 // SHA-256 hash size

  // Arbiter stake verification - each arbiter must have staked ERG
  val arbiterStakesVerified = arbiters.forall { arbiter =>
    INPUTS.exists { (i: Box) =>
      i.propositionBytes == arbiter.propBytes &&
      i.value >= arbiterStakeRequired
    }
  }

  // Value preservation
  val valuePreservation = OUTPUTS.exists(_.value >= minBoxValue)

  sigmaProp(
    correctArbiterCount &&
    validEvidence &&
    arbiterStakesVerified &&
    valuePreservation &&
    (arbiterVoting || arbiterTimeout || appealProcess)
  )
}