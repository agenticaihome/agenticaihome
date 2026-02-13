# Babel Fees (EIP-31) — Design Document

## Overview

Babel Fees enable AgenticAiHome users to pay Ergo transaction fees using EGO tokens instead of ERG. This eliminates the need for users to acquire ERG separately — they can earn EGO through the platform and use it for everything.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Wallet                         │
│  Has: EGO tokens (fungible)    Needs: pay TX fee        │
└─────────┬───────────────────────────────────────────────┘
          │ Spends babel fee box as TX input
          │ Adds EGO tokens to recreated box
          ▼
┌─────────────────────────────────────────────────────────┐
│              Babel Fee Box (EIP-31 Contract)             │
│  Contains: ERG (liquidity)                               │
│  R4: Bot's SigmaProp    R5: rate (nanoERG/EGO)          │
│  R6: parent box ID (for chaining)                        │
│                                                          │
│  User takes ERG (for fee) → Deposits EGO tokens          │
└─────────┬───────────────────────────────────────────────┘
          │ Bot monitors & manages
          ▼
┌─────────────────────────────────────────────────────────┐
│                   Babel Fee Bot                          │
│  • Creates/maintains babel fee boxes with ERG            │
│  • Withdraws accumulated EGO tokens                      │
│  • Swaps EGO→ERG on Spectrum DEX (solvency)             │
│  • Runs as separate process (systemd/PM2/Docker)         │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decision: Fungible EGO Token

**Current state:** EGO tokens are soulbound (non-transferable) reputation tokens bound to individual agents.

**For Babel fees:** We need a **fungible EGO utility token** that users can transfer to babel fee boxes. Two options:

1. **Mint a new fungible EGO token** — separate from soulbound reputation EGO. Users earn fungible EGO alongside reputation EGO for task completions.
2. **"Unwrap" mechanism** — allow agents to burn soulbound EGO to mint fungible EGO (one-way). This preserves reputation while enabling fee payments.

**Recommendation:** Option 1 (separate fungible token). Cleaner separation of concerns — reputation stays soulbound, utility token is freely tradeable.

## Files Created

| File | Purpose |
|------|---------|
| `contracts/babel_fee.es` | EIP-31 ErgoScript contract (reference) |
| `src/lib/ergo/babel-fees.ts` | Core babel fee functions |
| `src/lib/ergo/babel-fee-bot.ts` | Bot service for maintaining liquidity |
| `src/components/BabelFeeOption.tsx` | UI toggle component |

## Contract Details

The EIP-31 contract is standardized — each token gets a unique P2S address derived from the contract template with the token ID embedded. The contract template ErgoTree is from the EIP spec:

```
100604000e20{tokenId}0400040005000500d803d601e30004d602...
```

Replace `{tokenId}` with the 64-char hex token ID. All babel fee boxes for that token live at the same address, making discovery easy.

## Exchange Rate Strategy

The rate (R5 register) is set by the bot operator:
- **Conservative:** Set rate below market → bot profits but users pay more
- **Competitive:** Set rate at market → attracts users, thin margin
- **Dynamic:** Bot adjusts rate based on Spectrum DEX pool price

Recommended: Start conservative (e.g., 0.0005 ERG per EGO), adjust based on usage.

## Operational Checklist

- [ ] Mint fungible EGO utility token
- [ ] Update `EGO_FUNGIBLE_TOKEN_ID` in `babel-fees.ts`
- [ ] Fund bot wallet with 10+ ERG
- [ ] Set up bot as systemd/PM2 service
- [ ] Add monitoring/alerting for bot balance
- [ ] Integrate `BabelFeeOption` component into task payment flows
- [ ] Add Spectrum DEX swap logic to bot (optional, for auto-solvency)

## Limitations

1. **Bot dependency:** If the bot goes offline, no new babel boxes are created (existing ones still work until ERG depleted)
2. **Front-running:** Two users spending the same babel box — only one succeeds, other must retry
3. **Rate risk:** If EGO price crashes, bot accumulates worthless tokens
4. **Chaining complexity:** Multiple users can chain babel box spends in one block, but wallet must handle correctly
5. **Ergo node support:** EIP-31 is fully supported in Ergo node — no fork needed, boxes are standard UTXOs
