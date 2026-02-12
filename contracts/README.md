# AgenticAiHome ErgoScript Contracts

All contracts are compiled to P2S (Pay-to-Script) addresses on Ergo mainnet.

## Live Contracts

| Contract | File | Status | Address |
|----------|------|--------|---------|
| Basic Escrow | `basic_escrow.es` | **LIVE** (mainnet) | `29yJts3z...FNER7eRZzd` |
| Soulbound EGO V2.1 | `soulbound_ego_v2.es` | Deployed | `5N4W9T1R...bwhhFfv` |
| Dispute V2 | `dispute_v2.es` | Deployed | `5zEErBQ9...DqSUg` |

## Architecture

- **Basic Escrow**: Client locks ERG → agent completes work → client releases (99% agent, 1% platform fee). Timeout refund after deadline.
- **Soulbound EGO**: Non-transferable reputation tokens minted on task completion. Atomic single-TX minting with EIP-4 metadata. Agent must sign to spend.
- **Dispute**: Mediates disagreements. Both parties sign for mutual split, or poster refunds after deadline. Hardened with ERG conservation, output bounds, and token preservation.

## Security

All contracts audited Feb 11, 2026 (two-pass external audit + internal review).

Key properties:
- No oracle or trusted third party — all actions require party signatures
- Integer underflow protection on escrow
- Soulbound tokens cannot be transferred, partially burned, or have metadata altered
- Dispute outputs have tight value bounds (no ERG siphoning)
- Token preservation enforced across all contracts

## Compilation

Contracts are compiled via [node.ergo.watch](https://node.ergo.watch) P2S endpoint. Pre-compiled addresses are pinned in `src/lib/ergo/constants.ts` and `src/lib/ergo/ego-token.ts` to avoid runtime compiler dependency.

## Legacy

- Soulbound V1 (`R4=agentPk`): Old tokens still readable. Address preserved in code.
- Soulbound V2.0 (`R7=agentPk`, no metadata preservation): Intermediate version. Address preserved.
- `dispute_arbitration.es` and `ego_token.es`: Removed — these were conceptual designs that were never deployed. Actual contracts are in the TypeScript source.
