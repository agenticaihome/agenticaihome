// AgenticAiHome Soulbound EGO Token Contract V2.1 (Hardened)
// Address: 5N4W9T1RrFxzSMTxVPoygg4xY5gNbcdKrz8x5fCLeV7iSjXnAo4cwud5oe4rEShqMfmmsRsFt8AFbj9BbkfRUcU6kDrgqzMU2keydQso4vLc6BmWpTgjikSBQSurTAqwJv1q2Q6cwoh1P5wLq8ZRPA8jKgur1sQyVy4Kt9CFCC2kq9crbdcVCoexbbyZ2MSW3D9iDm1VWdf4Hygg9ettxdXUGeQqBhcz8zgVnyFScwMLvbwhhFfv
//
// Register layout:
//   R4: Coll[Byte] — EIP-4 token name (UTF-8 bytes)
//   R5: Coll[Byte] — EIP-4 token description (UTF-8 bytes)
//   R6: Coll[Byte] — EIP-4 token decimals (UTF-8 bytes, "0")
//   R7: SigmaProp  — agent public key (owner, must sign to spend)
//
// Invariants enforced:
//   - Token goes to exactly 1 output box
//   - Output must be at same contract address (soulbound)
//   - Agent pubkey (R7) must be preserved
//   - Token amount exactly preserved (no partial burn)
//   - EIP-4 metadata (R4/R5/R6) must be preserved (immutable)
//   - Output must maintain minimum ERG value
//   - Agent must sign the transaction
//
// Audit: Feb 11, 2026 — addresses all findings from external two-pass audit
{
  val agentPk = SELF.R7[SigmaProp].get
  val egoTokenId = SELF.tokens(0)._1
  val egoTokenAmt = SELF.tokens(0)._2
  val minBoxVal = 1000000L

  val tokenOutputs = OUTPUTS.filter { (box: Box) =>
    box.tokens.exists { (t: (Coll[Byte], Long)) => t._1 == egoTokenId }
  }

  val singleOutput = tokenOutputs.size == 1
  val out = tokenOutputs(0)

  val soulbound = out.propositionBytes == SELF.propositionBytes &&
    out.R7[SigmaProp].get == agentPk

  val tokenPreserved = out.tokens.exists { (t: (Coll[Byte], Long)) =>
    t._1 == egoTokenId && t._2 == egoTokenAmt
  }

  val metadataPreserved =
    out.R4[Coll[Byte]].get == SELF.R4[Coll[Byte]].get &&
    out.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get &&
    out.R6[Coll[Byte]].get == SELF.R6[Coll[Byte]].get

  val valueOk = out.value >= minBoxVal

  agentPk && sigmaProp(
    singleOutput &&
    soulbound &&
    tokenPreserved &&
    metadataPreserved &&
    valueOk
  )
}
