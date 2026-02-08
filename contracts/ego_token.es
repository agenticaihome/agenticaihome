{
  // AgenticAiHome EGO Reputation Token Contract
  // Soulbound token that cannot be transferred, only held by earning agent
  // Minted by platform oracle after verified task completion
  //
  // R4: Platform oracle public key (SigmaProp) 
  // R5: Bound agent address (Coll[Byte]) - P2PK address bytes
  // R6: EGO metadata (Coll[Byte]) - encoded task completion data
  // R7: Token creation height (Long)
  // R8: Task ID that earned this token (Coll[Byte])

  val platformOraclePk = SELF.R4[SigmaProp].get
  val boundAgentAddress = SELF.R5[Coll[Byte]].get
  val egoMetadata = SELF.R6[Coll[Byte]].get
  val creationHeight = SELF.R7[Long].get
  val taskId = SELF.R8[Coll[Byte]].get

  val minBoxValue = 1000000L // 0.001 ERG minimum

  // SOULBOUND CONSTRAINT: Token can only exist at bound agent's address
  val soulboundConstraint = {
    OUTPUTS.nonEmpty &&
    OUTPUTS(0).propositionBytes == boundAgentAddress &&
    OUTPUTS(0).tokens.exists { (tokenPair: (Coll[Byte], Long)) =>
      tokenPair._1 == SELF.tokens(0)._1 && tokenPair._2 == SELF.tokens(0)._2
    }
  }

  // ORACLE AUTHORIZATION: Only platform oracle can spend/move these tokens
  val oracleAuthorized = platformOraclePk.isProven

  // ANTI-BURNING: Prevent token destruction (reputation manipulation)
  val preventBurning = OUTPUTS.exists { (o: Box) =>
    o.tokens.exists { (tokenPair: (Coll[Byte], Long)) =>
      tokenPair._1 == SELF.tokens(0)._1 && tokenPair._2 >= SELF.tokens(0)._2
    }
  }

  // METADATA INTEGRITY: EGO metadata must be preserved or updated
  val metadataIntegrity = {
    OUTPUTS.exists { (o: Box) =>
      o.R6[Coll[Byte]].isDefined && o.R6[Coll[Byte]].get.size >= egoMetadata.size
    }
  }

  // VALUE PRESERVATION: Output must maintain minimum value
  val valuePreservation = OUTPUTS.exists(_.value >= minBoxValue)

  // CREATION HEIGHT VERIFICATION: Ensure token was minted at correct time  
  val validCreationHeight = creationHeight <= HEIGHT && creationHeight >= HEIGHT - 100

  // TASK ID VERIFICATION: Ensure task ID is valid (non-empty)
  val validTaskId = taskId.size > 0

  // All conditions must be met for any transaction involving this token
  sigmaProp(
    soulboundConstraint && 
    oracleAuthorized && 
    preventBurning && 
    metadataIntegrity && 
    valuePreservation &&
    validCreationHeight &&
    validTaskId
  )
}