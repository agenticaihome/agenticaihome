# Dispute System Audit Findings

## CRITICAL BUGS FOUND

### 1. **Missing UI Component**
- `DisputePanel.tsx` doesn't exist
- Users have no way to interact with the dispute system
- IMPACT: Dispute functionality is unusable

### 2. **ErgoScript Contract Logic Bugs**

#### Bug A: Broken Agent Signature Check
```ergoscript
val agentSigned = OUTPUTS.exists { (o: Box) =>
  o.propositionBytes == agentPropBytes
} && sigmaProp(
  INPUTS.exists { (input: Box) =>
    input.propositionBytes == agentPropBytes
  }
)
```
**ISSUE**: This checks if there's an agent output AND an agent input, but doesn't verify the agent actually signed. An attacker could create agent inputs/outputs without the agent's signature.

**CORRECT**: Should check actual signature: `atLeast(1, Coll(agentSigmaProp))`

#### Bug B: Edge Case - Both Propose 0%
The contract validates `posterPercent + agentPercent == 100`, but doesn't handle edge cases:
- What if both propose 0%? (Sum = 0, not 100)
- Contract would reject this, but should it allow one party to get everything?

#### Bug C: Deadline Edge Case
```ergoscript
val timeoutRefund = HEIGHT > deadline && ...
```
**ISSUE**: Uses `>` instead of `>=`. If a transaction is built exactly at the deadline height, it fails to refund.

#### Bug D: Missing Platform Fee Handling
The dispute resolution doesn't account for platform fees that should be deducted from splits.

### 3. **Transaction Builder Bugs (Similar to escrow.ts)**

#### Bug E: VLQ Decoding Issue
```typescript
function decodeSigmaVlqInt(hex: string): { value: number; bytesRead: number } {
  // ... VLQ decoding logic
  const value = (vlq >>> 1) ^ -(vlq & 1);  // ZigZag decode
  return { value, bytesRead: offset / 2 };
}
```
**ISSUE**: Potential integer overflow for large values. Should use BigInt for safety.

#### Bug F: nanoERG Precision Loss
```typescript
const posterAmount = (totalAfterFee * BigInt(posterPercent)) / 100n;
const agentAmount = (totalAfterFee * BigInt(agentPercent)) / 100n;
```
**ISSUE**: Integer division can lose nanoERG due to truncation. Should round consistently.

#### Bug G: propositionBytes vs pubkeyBytes Confusion
```typescript
function pubkeyFromAddress(address: string): Uint8Array {
  const ergoAddr = ErgoAddress.fromBase58(address);
  const tree = ergoAddr.ergoTree;
  if (!tree.startsWith('0008cd')) {
    throw new Error(`Address ${address} is not a P2PK address`);
  }
  const pubkeyHex = tree.slice(6); // remove "0008cd" prefix
  return Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
}
```
**ISSUE**: The contract mixes propositionBytes and pubkeyBytes. This function returns raw pubkey but the contract expects propositionBytes.

### 4. **Security Issues**

#### Bug H: Missing Ownership Validation
```typescript
export async function createDisputeTx(
  escrowBoxId: string,
  params: DisputeParams,
  walletUtxos: any[],
  changeAddress: string
): Promise<any>
```
**ISSUE**: No verification that the caller owns the escrow box they're disputing. Anyone could open disputes on any escrow.

#### Bug I: Invalid Split Acceptance
```typescript
if (posterPercent + agentPercent !== 100 || posterPercent < 0 || agentPercent < 0) {
  throw new Error('Invalid percentage split: must sum to 100 and be non-negative');
}
```
**ISSUE**: Allows 101% splits through race conditions. Should validate in smart contract too.

#### Bug J: Missing Amount Validation
The `createDisputeTx` doesn't verify the escrow box actually contains the claimed `amountNanoErg`.

### 5. **Database/Lifecycle Issues**

#### Bug K: RLS Policy Mismatch
```sql
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    poster_address = auth.uid()::text OR 
    agent_address = auth.uid()::text
  )
)
```
**ISSUE**: Assumes `auth.uid()` returns an Ergo address, but it's typically a UUID. This breaks authentication.

#### Bug L: Missing Task Status Validation
The `createDispute()` function doesn't verify the task is in 'review' status before allowing disputes.

### 6. **Build Issues**
- Build passes ✅ (no TypeScript errors)
- Chart warnings are cosmetic, not blocking

## FIXES NEEDED

### Priority 1 (Critical)
1. Create DisputePanel.tsx UI component
2. Fix agent signature verification in ErgoScript
3. Add ownership validation in createDisputeTx
4. Fix RLS policy to use proper address mapping

### Priority 2 (High)
1. Fix VLQ decoding integer overflow
2. Add task status validation
3. Handle nanoERG precision loss
4. Fix deadline edge case (>= vs >)

### Priority 3 (Medium)
1. Add platform fee handling
2. Improve error messages
3. Add more comprehensive tests