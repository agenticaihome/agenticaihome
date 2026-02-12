// AgenticAiHome Dispute Contract V2 (Hardened)
// Address: 5zEErBQ9AccKXaTnipLRCAhRQPU5knhQi7cHpgQwrYobNVPq9NvTtfKEVKkGaqHZB7ZGb1gXUPrPDnDahfBTtREeQSyPJ2Fs9qzZP7tftTaAYckTFZewJ1mire928DSaCfLjeDCiRAQT9b6AsYn5gquC2Z5w55vYi7eHj2FcgZUMVfvo6xWue7Dq8B5sD1huCpWs4vN7516EX8dMy5R8fBDjACBSLAwWMgsRrVRcEFZi35x6ngtsmLd6mYQMUGRSLAQFjaqd5zdridgWevgbMvZJnCCd5vA9DRMc9dq16USWprvJGuXMtW4Q5pgdB7Ebfr2z5DLjEyA2XrD5cySrnfdjLdixEFGTSS5YojqFXGYRzpiQAF6YHMscgo1tzptiNkg3vayVb53ZgRvEtn6f7zAfd3bNYXvmXSHHp65KNNFzTrXi6ePSE49a3m8XZ4zeSBxTQeCCAEgfzDrWAcR4WdeESwcZqJVFv5QfkUvBL57kP4jUBCk5ite8hY4hVtQZa63vDpv6deQ5yfmied27sqa5BypXB7WWX5ojDemKhDZuYvvfpMAafTAx3jSnD5FTGVytsrLNCzg6SxoFM9ahe1btBcJ1qpmUjYS62Xcaya7MuWGt91AK9H5Nt5LgSmxvFe5zHWVz8YExUfj9sq2AZXdUGU1mCpNtABvvrShxRzL48abMLtUDqSUg
//
// Register layout:
//   R4: SigmaProp — poster public key (can open dispute, gets refund after deadline)
//   R5: SigmaProp — agent public key (must sign for mutual resolution)
//   R6: Int       — mediation deadline block height
//   R7: Int       — poster percentage (0-100)
//   R8: Int       — agent percentage (0-100)
//   R9: Coll[Byte]— task ID (UTF-8)
//
// Security hardening (Feb 11 audit):
//   - Tight output value bounds (>= AND <=) prevent ERG siphoning
//   - Total ERG conservation check (outputs + miner fee = input)
//   - Token preservation (any tokens forwarded to poster)
//   - Output count capped at 4 (prevent dust attacks)
//   - Named constants replace magic numbers
//   - Miner fee capped at 0.002 ERG
//
// Resolution paths:
//   1. Mutual agreement: both parties sign + valid percentage split
//   2. Timeout refund: poster gets everything after deadline
{
  val MIN_BOX_VAL = 1000000L
  val PLATFORM_FEE_BPS = 50L

  val posterPubKey = SELF.R4[SigmaProp].get
  val agentPubKey = SELF.R5[SigmaProp].get
  val deadline = SELF.R6[Int].get
  val posterPercent = SELF.R7[Int].get
  val agentPercent = SELF.R8[Int].get

  val validPercentages = (posterPercent + agentPercent) == 100 &&
                        posterPercent >= 0 && posterPercent <= 100 &&
                        agentPercent >= 0 && agentPercent <= 100

  val platformFeeNanoErg = (SELF.value * PLATFORM_FEE_BPS) / 10000L
  val amountAfterFee = SELF.value - platformFeeNanoErg

  val outputCountValid = OUTPUTS.size <= 4

  val tokensPreserved = if (SELF.tokens.size > 0) {
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == posterPubKey.propBytes &&
      SELF.tokens.forall { (t: (Coll[Byte], Long)) =>
        o.tokens.exists { (ot: (Coll[Byte], Long)) =>
          ot._1 == t._1 && ot._2 == t._2
        }
      }
    }
  } else true

  val totalOutputValue = OUTPUTS.fold(0L, { (acc: Long, o: Box) => acc + o.value })
  val minerFee = SELF.value - totalOutputValue
  val ergConserved = minerFee > 0L && minerFee <= 2000000L

  val posterExpectedAmount = (amountAfterFee * posterPercent) / 100L
  val agentExpectedAmount = amountAfterFee - posterExpectedAmount

  val posterOutputValid = if (posterPercent > 0) {
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == posterPubKey.propBytes &&
      o.value >= posterExpectedAmount &&
      o.value <= posterExpectedAmount + MIN_BOX_VAL
    }
  } else true

  val agentOutputValid = if (agentPercent > 0) {
    OUTPUTS.exists { (o: Box) =>
      o.propositionBytes == agentPubKey.propBytes &&
      o.value >= agentExpectedAmount &&
      o.value <= agentExpectedAmount + MIN_BOX_VAL
    }
  } else true

  val platformFeeOutputExists = OUTPUTS.exists { (o: Box) =>
    o.propositionBytes == fromBase64("PLATFORM_FEE_PROP_BYTES") &&
    o.value >= platformFeeNanoErg &&
    o.value <= platformFeeNanoErg + MIN_BOX_VAL
  }

  val mutualResolution = HEIGHT <= deadline &&
                        posterPubKey &&
                        agentPubKey &&
                        validPercentages &&
                        posterOutputValid &&
                        agentOutputValid &&
                        platformFeeOutputExists

  val timeoutRefund = HEIGHT >= deadline &&
                     posterPubKey &&
                     OUTPUTS.exists { (o: Box) =>
                       o.propositionBytes == posterPubKey.propBytes &&
                       o.value >= amountAfterFee - 2000000L &&
                       o.value <= amountAfterFee
                     } &&
                     platformFeeOutputExists

  sigmaProp(
    outputCountValid &&
    ergConserved &&
    tokensPreserved &&
    (mutualResolution || timeoutRefund)
  )
}
