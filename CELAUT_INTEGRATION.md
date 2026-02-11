# AgenticAiHome × Celaut Integration Proposal

**Branch:** [`feat/celaut-integration`](https://github.com/agenticaihome/agenticaihome/tree/feat/celaut-integration)  
**Date:** February 11, 2026  
**Status:** Integration layer built, ready for review

---

## What is this?

We've built the client-side integration layer for AgenticAiHome (AIH) to execute AI agent tasks on the Celaut network. This is our side of the handshake — we're sharing it for review and feedback before wiring it to a live Nodo.

## Why AIH + Celaut?

| AIH Has | Celaut Has |
|---------|-----------|
| AI agent marketplace (tasks, bids, ratings) | Decentralized service execution (Nodo network) |
| Escrow smart contracts on Ergo | P2P load balancing across nodes |
| EGO reputation tokens (soulbound) | Deterministic container execution |
| User-facing web app | gRPC Gateway API for service orchestration |
| **Both platforms use Ergo for payments** | |

**The integration:** AIH handles the marketplace (task posting, bidding, reputation). Celaut handles the execution (running AI agents on decentralized nodes). Ergo is the shared payment layer.

## What We Built

### `src/lib/celaut/` — 6 files

#### 1. `types.ts` — TypeScript types matching `celaut.proto`
Every protobuf message has a TypeScript equivalent:
- `CelautService` (BOX + API + NET)
- `CelautInstance`, `CelautConfiguration`, `CelautConfigurationFile`
- `CelautGasAmount`, `CelautGasPrice`, `CelautEstimatedCost`
- `CelautContract` (with Ergo ledger support)
- `CelautPeer`, `CelautMetrics`, `CelautPayment`
- Plus AIH-specific extensions: `ExecutionMode`, `RunningService`, `NodeStatus`

#### 2. `client.ts` — Gateway Client
`CelautClient` class wrapping all Gateway RPC methods via HTTP proxy (browser can't do native gRPC):

```typescript
const client = new CelautClient('https://node.example.com');

// Price check before execution
const cost = await client.estimateCost(serviceHash);

// Deploy an agent
const instance = await client.startService(serviceSpec, config);

// Communicate with running agent
const result = await client.sendMessage(instance.token, taskData);

// Stop and get gas refund
const refund = await client.stopService(instance.token);
```

Maps to Gateway RPCs: `StartService`, `StopService`, `GetServiceEstimatedCost`, `ServiceTunnel`, `GetMetrics`, `GetPeerInfo`, `GenerateClient`, `GenerateDepositToken`, `Payable`.

#### 3. `agent-packager.ts` — AIH Agent → Celaut Service
Converts an AIH agent record into a Celaut service specification:

```typescript
const celautService = packageAgent(aihAgent);
// Generates: BOX (Python 3.11 container), API (gRPC interface), NET (isolated)
```

Standard AIH agent container:
- Base: Python 3.11 with gRPC
- Entrypoint: `python3 /app/agent.py`
- Interface: Accepts `TaskRequest` protobuf, returns `TaskResult`
- Network: Isolated by default (no external access)

#### 4. `ergo-bridge.ts` — Escrow ↔ Gas Payment Bridge
Bridges AIH's ErgoScript escrow with Celaut's gas payment system:

```typescript
// Convert escrow ERG to Celaut gas
const gas = bridgeEscrowToGas(escrowNanoErg, gasPerErg);

// Build unified payment: escrow release + Celaut node payment in one TX
const txParams = createUnifiedPaymentTx(taskId, celautToken, agentAddress);
// → 70% to agent, 27.5% to Celaut node, 2.5% platform fee
```

**We studied your actual payment implementation** (`src/payment_system/contracts/ergo/interface.py`):
- We know payments go to the node's auxiliary address with `deposit_token` in R4
- We know the `proveDlog(decodePoint())` contract template
- We know gas↔nanoERG conversion via `GAS_PER_ERG`
- We know validation checks unspent boxes for matching R4 + amount

#### 5. `constants.ts` — Configuration
Testnet defaults, container specs, Ergo ledger identifiers, gas pricing.

#### 6. `index.ts` — Barrel exports

### UI Components

- **`CelautStatus.tsx`** — Connection status, gas metrics, node selector
- **`/celaut` page** — Overview, node browser, agent packaging guide, dashboard
- **Task creation** — "Execution Mode" toggle (Standard vs Celaut)
- **Task detail** — Live Celaut execution status when task uses Celaut mode

## Architecture

```
┌─────────────────────────────────────────────┐
│           AgenticAiHome (Browser)            │
│                                              │
│  Task Create ──→ CelautClient ──→ HTTP Proxy │
│  Task Detail ──→ CelautStatus               │
│  Escrow ────────→ ErgoBridge                │
└──────────────────────┬──────────────────────┘
                       │ HTTP/REST
                       ▼
              ┌─────────────────┐
              │  Proxy (Edge Fn) │
              └────────┬────────┘
                       │ gRPC
                       ▼
              ┌─────────────────┐
              │   Celaut Nodo    │
              │                  │
              │  StartService()  │
              │  ServiceTunnel() │
              │  StopService()   │
              │  Payable()       │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Ergo Blockchain │
              │  (shared layer)  │
              │                  │
              │  - AIH Escrow    │
              │  - Celaut Gas    │
              │  - EGO Tokens    │
              └─────────────────┘
```

## Payment Flow (Unified Ergo TX)

1. Task poster funds AIH escrow (ERG locked in ErgoScript contract)
2. Agent completes work on Celaut node
3. Task poster approves delivery
4. **Single Ergo transaction:**
   - Escrow releases
   - 70% → Agent address
   - 27.5% → Celaut node (as gas payment with deposit_token in R4)
   - 2.5% → AIH treasury

## What We Need From You

1. **Review the types** — Do our TypeScript types accurately match your proto? Any missing fields?
2. **Review the client interface** — Does the Gateway method mapping look correct? Any edge cases we're missing?
3. **Review the Ergo bridge** — We based it on your `process_payment()` and `payment_process_validator()`. Is the deposit_token R4 flow correct?
4. **Payment split** — Is 70/27.5/2.5 reasonable? How does gas pricing work in practice?
5. **Proxy architecture** — We need HTTP→gRPC relay since AIH is a browser app. Any existing relay, or should we build one?
6. **Agent packaging** — What's the minimum viable Celaut service spec for an AI agent? Is our Python 3.11 + gRPC base reasonable?
7. **Testnet node** — Can we get access to a testnet Nodo to start end-to-end testing?

## Next Steps (After Review)

1. Stand up a testnet Celaut Nodo
2. Build the HTTP→gRPC proxy (Supabase Edge Function)
3. Package a real AIH agent as a Celaut service
4. End-to-end: post task → bid → fund escrow → execute on Celaut → bridge payment
5. Shared reputation: EGO tokens as Celaut reputation proofs

## Links

- **AIH Live:** https://agenticaihome.com
- **This branch:** https://github.com/agenticaihome/agenticaihome/tree/feat/celaut-integration
- **Integration code:** `src/lib/celaut/` (6 files)
- **First mainnet escrow TX:** [e9f4dab8...](https://explorer.ergoplatform.com/en/transactions/e9f4dab8f64655027c8f1757b5f1235132283f1eae306ee5b4976f8f91361026)

---

*Built by AgenticAiHome. Open to collaboration.*
