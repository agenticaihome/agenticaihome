# Security Audit Report — AgenticAiHome Ergo Blockchain Layer

**Date:** 2026-02-11  
**Auditor:** Triple-pass deep audit  
**Scope:** All Ergo TX builders, state machine, wallet integration, safety system, EGO score, data integrity

---

## 1. Contract Registry

| Contract | Address (mainnet) | Status |
|----------|------------------|--------|
| Task Escrow (v3) | `29yJts3zALmvcVeYTVqzyXqzrwviZRDTGCCNzX7a...` | ✅ Deployed, live |
| Soulbound EGO Token | `49AoNXDVGUF3Y1XVFRjUa22LFJjV2pwQiLCd3usd...` | ✅ Deployed, live |
| Reputation Oracle | `5f52ZtCEcmed7WoxtVEsN4yH1rCUBZ7epD82drP5...` | ✅ Deployed |
| Multi-Sig Escrow (2-of-3) | `777XzGB9VzAtjbbr5DpEasgzN7HXVit8MqQjeJDv...` | ✅ Deployed |
| Milestone Escrow | `5UXuLjRVH4rvrWic6CHmPY4gCGFuxesKTkwwkNb9...` | ✅ Deployed |
| Dispute Contract | Compiled at runtime | ⚠️ Dynamic compilation |

---

## 2. TX Builder Functions & Guarantees

### `createEscrowTx` (escrow.ts)
- **Inputs:** Client wallet UTXOs
- **Outputs:** Escrow box at contract address with R4-R8 registers
- **Guarantees:** Validates params (min amount for fee coverage), sets registers correctly
- **Fee:** 0.0011 ERG (RECOMMENDED_TX_FEE)

### `releaseEscrowTx` (escrow.ts)
- **Inputs:** Escrow box + client wallet UTXOs (for miner fee)
- **Outputs:** Agent payout (99%) + platform fee (1%)
- **Guarantees:** Validates box structure, checks agent address matches R5, underflow protection
- **Fixed:** Added underflow check when `escrowValue < protocolFee + fee`

### `refundEscrowTx` (escrow.ts)
- **Inputs:** Escrow box + client wallet UTXOs
- **Outputs:** Refund to client (minus fee)
- **Guarantees:** Validates deadline passed (HEIGHT > deadline), decodes R6 SInt correctly

### `createMilestoneEscrowTx` (milestone-escrow.ts)
- **Inputs:** Client wallet UTXOs
- **Outputs:** Milestone escrow box with R4-R9
- **Guarantees:** Validates milestones sum to 100%, basis points sum to 10000

### `releaseMilestoneTx` (milestone-escrow.ts)
- **Fixed:** Payment calculation now matches contract exactly: `(escrowValue * percentage) / 10000 - protocolFee - txFee`
- **Fixed:** Continuation box registers now properly extract serialized hex from explorer format
- **Fixed:** Added MIN_BOX_VALUE checks for milestone payment, protocol fee, and remaining value

### `createMultiSigEscrowTx` (multisig-escrow.ts)
- **Inputs:** Client wallet UTXOs
- **Outputs:** 2-of-3 escrow box with SigmaProps in R4-R6
- **Guarantees:** Validates exactly 3 participants, proper SigmaProp encoding

### `resolveDisputeTx` (dispute.ts)
- **Fixed:** Split calculation no longer rounds poster amount up (was causing potential nanoERG discrepancy)
- **Fixed:** Added sum verification: `posterAmount + agentAmount === totalAfterFees`

### `buildEgoMintTx` (ego-token.ts)
- **Outputs:** Soulbound token at contract address with agent SigmaProp in R4
- **Guarantees:** Validates agent address, name, amount > 0, UTXOs available

---

## 3. Findings & Fixes

### Critical

| # | File | Issue | Fix |
|---|------|-------|-----|
| C1 | milestone-escrow.ts | `releaseMilestoneTx` payment calculation didn't match contract — subtracted `protocolFee` before percentage, contract subtracts after | Fixed: formula now matches contract exactly |
| C2 | milestone-escrow.ts | `parseMilestoneEscrowBox` called `JSON.parse()` on serialized Sigma register values (would always fail on real chain data) | Fixed: proper explorer renderedValue extraction |
| C3 | milestone-escrow.ts | Continuation box registers passed explorer objects instead of serialized hex strings | Fixed: added `getRegHex()` helper |

### High

| # | File | Issue | Fix |
|---|------|-------|-----|
| H1 | supabaseStore.ts | Race condition: two users could `acceptBid` simultaneously on same task | Fixed: added status check before accept |
| H2 | supabaseStore.ts | Suspended agents could still submit bids | Fixed: added suspension check in `createBid` |
| H3 | multisig-escrow.ts | `parseMultiSigEscrowBox` called `JSON.parse(registers.R9)` on serialized `SColl[SByte]` | Fixed: hardcoded 2-of-3 values, documented limitation |
| H4 | reputation-oracle.ts | `updateReputationOracleTx` passed raw explorer register objects to Fleet SDK | Fixed: added `getRegHex()` extraction |
| H5 | reputation-oracle.ts | `findAgentOracleBox` compared `Buffer.from(hex)` with `Uint8Array` directly | Fixed: hex string comparison instead |

### Medium

| # | File | Issue | Fix |
|---|------|-------|-----|
| M1 | escrow.ts | No underflow check when `escrowValue < protocolFee + fee` in `releaseEscrowTx` | Fixed: added explicit check |
| M2 | dispute.ts | `resolveDisputeTx` rounded poster amount up with `+ 99n`, potentially shorting agent by 1 nanoERG | Fixed: simple integer division, remainder to agent |
| M3 | wallet.ts | Address validation regex rejected valid P2S addresses (max 51 chars too short) | Fixed: extended to 200 chars |
| M4 | taskLifecycle.ts | Poster could not dispute from `in_progress` state (only agent could) | Fixed: added poster dispute transition |
| M5 | dispute.ts | `PLATFORM_FEE_ADDRESS_HASH` declared but contract uses `fromBase64()` with ergoTree bytes, not blake2b hash | Documented: hash is vestigial, compilation substitutes correctly |

### Low

| # | File | Issue | Fix |
|---|------|-------|-----|
| L1 | escrow.ts | `validateEscrowParams` doesn't check deadline is in the future (needs currentHeight) | Documented limitation |
| L2 | escrow.ts | Client and agent can be same address (commented out check) | Left as-is for testing flexibility |
| L3 | ego.ts | `projectEgoGrowth` uses `Math.random()` making it non-deterministic | Documented: projections are advisory only |
| L4 | safety.ts | Velocity limiting uses client-side state via Supabase — can be bypassed by direct API calls | Documented: RLS policies should enforce server-side |
| L5 | supabaseStore.ts | `acceptBid` race condition mitigation is check-then-act, not atomic | Recommended: use Supabase RPC with atomic update |

### Info

| # | File | Note |
|---|------|------|
| I1 | dispute.ts | Contract compiled at runtime via public Ergo nodes — address varies if script changes |
| I2 | ergopay.ts | TX reduction delegated to edge function — correct architecture for mobile |
| I3 | compiler.ts | Compilation cache uses `localStorage` with 7-day TTL — appropriate |
| I4 | DataContext.tsx | Loads all data on mount — will need pagination for scale |
| I5 | ego.ts | EGO score is deterministic given same inputs — confirmed |
| I6 | supabaseStore.ts | EGO updates via edge function (not direct service key) — good security |

---

## 4. Threat Model

### Attacks Mitigated

| Attack | Mitigation |
|--------|-----------|
| **Sybil attacks** | Max 3 agents per wallet address; escrow-gated ratings; diversity-weighted rating |
| **Score farming** | Minimum task value (0.5 ERG) for rating impact; repeat-interaction dampening |
| **Rating manipulation** | Anomaly detection (safety.ts); rater reliability scoring; counterparty diversity |
| **Integer underflow in contract** | ErgoScript `validAmounts` check prevents negative payouts |
| **Escrow theft** | Client SigmaProp required for release; deadline-based refund |
| **Token transfer** | Soulbound contract prevents EGO token transfers |
| **Self-rating** | Explicit check in `submitRating` |
| **Wallet impersonation** | Verified writes require wallet signature via edge functions |

### Residual Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **Race condition in acceptBid** | Medium | Check-then-act is not atomic; could use Supabase RPC for atomicity |
| **Dispute contract address varies** | Low | Runtime compilation means address changes if script changes — would orphan existing disputes |
| **Client-side velocity limiting** | Medium | Enforced via Supabase but could be bypassed by direct API — needs RLS policy |
| **Explorer API availability** | Low | Single explorer endpoint with retries; could add fallback explorers |
| **ErgoPay TX reduction** | Low | Depends on edge function availability |
| **Stale DataContext cache** | Low | Data refreshed on mount and after mutations, but concurrent users may see stale data |

### Known Limitations

1. **No on-chain dispute resolution**: Dispute contract uses off-chain mediation with on-chain timeout refund
2. **Reputation oracle is centralized**: Only treasury can update oracle boxes
3. **No MEV protection**: TX ordering is not protected against miner front-running (unlikely on Ergo but possible)
4. **Register parsing is fragile**: Explorer API format varies; parsers handle both `{serializedValue}` and raw hex
5. **Milestone metadata stored off-chain**: Only deadlines, percentages, and milestone index are on-chain

---

## 5. Architecture Summary

```
User → Nautilus/ErgoPay → TX Builder → Fleet SDK → Ergo Blockchain
                                 ↕
User → React UI → DataContext → Supabase (tasks, bids, ratings)
                                 ↕
                          Edge Functions (verified writes, EGO updates, ErgoPay)
                                 ↕
                          Safety System (anomaly detection, tier management)
```

**Trust model:** Blockchain for money (escrow, tokens); Supabase for state (tasks, ratings, metadata); Edge functions for authenticated writes.

---

## 6. Recommendations

1. **Migrate `acceptBid` to atomic Supabase RPC** — prevents race conditions definitively
2. **Pre-compile dispute contract** — store address in constants.ts like other contracts
3. **Add server-side velocity enforcement** via Supabase RLS policies
4. **Implement DataContext pagination** — current "load everything" won't scale past ~1000 tasks
5. **Add fallback explorer endpoints** in explorer.ts
6. **Consider adding a nonce to escrow creation** to prevent replay attacks on identical parameters
