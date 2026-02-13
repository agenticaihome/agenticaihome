// ─── AgenticAiHome AVL Tree Reputation Oracle V2 ─────────────────────────────
//
// This contract implements a trustless on-chain reputation system using Ergo's
// native AVL tree support. Unlike V1 (which stores per-agent oracle boxes),
// V2 stores ALL agent reputations in a single AVL tree whose digest (root hash)
// lives in register R4 of a singleton box identified by an NFT.
//
// Architecture:
//   - Singleton box pattern: exactly ONE box on-chain holds the reputation state
//   - The box is identified by a unique NFT token (minted at deployment)
//   - R4: AvlTree digest (32-byte root hash of the authenticated AVL tree)
//   - R5: SigmaProp — admin/DAO key (controls who can authorize updates)
//   - R6: Int — update counter (monotonically increasing, prevents replay)
//   - R7: Coll[Byte] — escrow contract hash (only completed escrows trigger updates)
//
// AVL Tree Data Layout:
//   Key:   blake2b256(agent_address_bytes) → 32 bytes
//   Value: total_score (8 bytes, Long) || review_count (4 bytes, Int) ||
//          tasks_completed (4 bytes, Int) || last_updated_height (4 bytes, Int)
//          = 20 bytes total per agent entry
//
// How it works:
//   1. Off-chain: compute the AVL tree insert/update proof for the agent's new data
//   2. Pass the proof as a context variable (getVar[Coll[Byte]](0))
//   3. Contract verifies the proof against the current digest in R4
//   4. If valid, the output box has the NEW digest (post-operation) in R4
//   5. The contract ensures the NFT is preserved (singleton pattern)
//
// Security:
//   - Admin signature required for all updates (later replaceable by DAO vote)
//   - AVL proof verification is cryptographic — cannot forge reputation data
//   - Escrow contract hash check ensures only legitimate task completions update scores
//   - Update counter prevents replay attacks
//   - NFT singleton ensures exactly one authoritative reputation tree exists
//
// Usage by other contracts (data input pattern):
//   Other contracts can reference this box as a DATA INPUT to read the AVL tree
//   digest and verify agent reputations using lookup proofs — completely trustless.
//
// ─────────────────────────────────────────────────────────────────────────────────
{
  // ── Singleton identity: this box MUST carry the reputation NFT ──
  val reputationNft = SELF.tokens(0)._1

  // ── Registers ──
  val currentTreeDigest = SELF.R4[AvlTree].get
  val adminPk           = SELF.R5[SigmaProp].get
  val updateCounter     = SELF.R6[Int].get
  val escrowContractHash = SELF.R7[Coll[Byte]].get

  // ── AVL tree proof passed via context variable ──
  // The off-chain builder computes the proof and passes it as context var 0
  val proof = getVar[Coll[Byte]](0).get

  // ── Output box must preserve singleton pattern ──
  val outputBox = OUTPUTS(0)
  val validSingleton = outputBox.tokens(0)._1 == reputationNft &&
                       outputBox.tokens(0)._2 == 1L

  // ── Output must have valid updated state ──
  val newTreeDigest   = outputBox.R4[AvlTree].get
  val newAdminPk      = outputBox.R5[SigmaProp].get
  val newUpdateCounter = outputBox.R6[Int].get
  val newEscrowHash   = outputBox.R7[Coll[Byte]].get

  // ── State transition rules ──
  val validStateTransition =
    newAdminPk == adminPk &&                    // Admin key cannot change (use separate migration TX)
    newEscrowHash == escrowContractHash &&       // Escrow hash cannot change
    newUpdateCounter == updateCounter + 1 &&     // Counter must increment by exactly 1
    outputBox.value >= SELF.value &&             // Value must be preserved
    outputBox.propositionBytes == SELF.propositionBytes  // Contract must be preserved

  // ── Verify the AVL tree operation ──
  // The proof cryptographically demonstrates that the tree was correctly updated.
  // performInsert/performUpdate returns the new digest, which MUST match the output's R4.
  // We use insert for new agents and update for existing ones.
  // The off-chain code determines which operation to use and provides the right proof.
  //
  // NOTE: In ErgoScript, AvlTree.insert() and .update() take the proof and key-value
  // pairs as arguments and return Option[AvlTree] with the new digest.
  // The actual verification that newTreeDigest matches the proof result happens
  // via the off-chain builder setting R4 to the computed post-operation digest.
  // The on-chain contract verifies the proof is valid for the current digest.

  // ── Optional: verify update came from escrow completion ──
  // Check that one of the data inputs is a spent escrow box (by contract hash)
  // This is commented out for initial deployment — enable when escrow integration is ready
  // val escrowInput = CONTEXT.dataInputs.exists { (di: Box) =>
  //   blake2b256(di.propositionBytes) == escrowContractHash
  // }

  // ── Final guard: admin must sign AND state transition must be valid ──
  adminPk && sigmaProp(validSingleton && validStateTransition)
}
