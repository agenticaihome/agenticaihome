// ─── EIP-0031 Babel Fee Contract for EGO Token ──────────────────────────────
//
// This is the STANDARD EIP-31 babel fee contract with the EGO fungible token ID
// hardcoded. The contract is parameterized via registers:
//
//   R4: SigmaProp — creator's public key (can withdraw the box anytime)
//   R5: Long      — nanoERG price per 1 EGO token (exchange rate)
//   R6: Coll[Byte] — ID of the babel box being spent (only on recreated boxes)
//
// HOW IT WORKS:
//   1. A "supporter" (our Babel Fee Bot) creates a box at this contract address
//      containing ERG and sets R4 (their pubkey) and R5 (price per token).
//   2. A user who wants to pay fees in EGO spends this box as an input,
//      recreating it as an output with:
//      - Same contract, same R4, same R5
//      - R6 = SELF.id (the spent box's ID, for chaining)
//      - Less ERG (difference = fee they need)
//      - More EGO tokens (enough to cover the ERG at the stated rate)
//   3. The supporter can withdraw at any time using their R4 key.
//
// CONTEXT VARIABLE:
//   Var(0): Int — index of the recreated babel box in OUTPUTS
//
// NOTE: _tokenId is replaced at compile time with the actual EGO token ID.
// Use the contract template from EIP-31 for direct ErgoTree construction.
//
// ─── ErgoScript Source ───────────────────────────────────────────────────────

{
    // ===== EIP-0031 Babel Fees Contract =====
    // Name: Babel Fee Box for EGO Token
    // Description: Allows users to pay transaction fees using EGO tokens
    // Version: 1.0.0
    // Based on: EIP-0031 (https://github.com/ergoplatform/eips/blob/master/eip-0031.md)

    val babelFeeBoxCreator: SigmaProp = SELF.R4[SigmaProp].get
    val ergPricePerToken: Long = SELF.R5[Long].get
    val tokenId: Coll[Byte] = _tokenId
    val recreatedBabelBoxIndex: Option[Int] = getVar[Int](0)

    if (recreatedBabelBoxIndex.isDefined) {
        // ===== Babel Fee Swap Path =====
        // User is spending this box to cover their transaction fees

        val validBabelFeeSwap: Boolean = {
            val recreatedBabelBox: Box = OUTPUTS(recreatedBabelBoxIndex.get)

            // Recreated box must preserve contract, token ID, creator, and price
            val validBabelFeeBoxRecreation: Boolean = {
                allOf(Coll(
                    (recreatedBabelBox.propositionBytes == SELF.propositionBytes),
                    (recreatedBabelBox.tokens(0)._1 == tokenId),
                    (recreatedBabelBox.R4[SigmaProp].get == babelFeeBoxCreator),
                    (recreatedBabelBox.R5[Long].get == ergPricePerToken),
                    (recreatedBabelBox.R6[Coll[Byte]].get == SELF.id)
                ))
            }

            // Token exchange must be fair: tokens_added * price >= erg_removed
            val validBabelFeeExchange: Boolean = {
                val nanoErgsDifference: Long = SELF.value - recreatedBabelBox.value
                val babelTokensBefore: Long = if (SELF.tokens.size > 0) SELF.tokens(0)._2 else 0L
                val babelTokensDifference: Long = recreatedBabelBox.tokens(0)._2 - babelTokensBefore

                allOf(Coll(
                    (babelTokensDifference * ergPricePerToken >= nanoErgsDifference),
                    (nanoErgsDifference >= 0)
                ))
            }

            allOf(Coll(
                validBabelFeeBoxRecreation,
                validBabelFeeExchange
            ))
        }

        sigmaProp(validBabelFeeSwap)

    } else {
        // ===== Withdrawal Path =====
        // Creator can spend the box freely (withdraw ERG + accumulated tokens)
        babelFeeBoxCreator
    }
}
