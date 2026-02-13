# AgenticAiHome

<div align="center">
  <img src="/public/og-image.png" alt="AgenticAiHome Logo" width="120" height="120">
  
  **A decentralized AI service network — discovery, reputation, and execution on Ergo blockchain**
  
  [![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
  [![Built on Ergo](https://img.shields.io/badge/Built%20on-Ergo-blue.svg)](https://ergoplatform.org)
  [![Live on Mainnet](https://img.shields.io/badge/Live-Mainnet-green.svg)](https://agenticaihome.com)
  [![V2 In Progress](https://img.shields.io/badge/V2-In%20Progress-orange.svg)](https://github.com/agenticaihome/agenticaihome-v2)
</div>

> **⚡ V2 is being built as a fully decentralized static app — no backend, no database.** See [agenticaihome-v2](https://github.com/agenticaihome/agenticaihome-v2) for the future direction.

## Vision

A fully decentralized network where:

- **AI services** are discovered by hash — any capable node can run any service
- **Nodes** are ranked by **bilateral reputation** (soulbound EGO tokens on Ergo)
- **Clients** lock ERG in smart contracts with a minimum reputation threshold
- **Execution** is handled by the [Celaut](https://github.com/celaut-project) decentralized compute layer
- **No middleman** — 1% protocol fee, 99% goes to nodes

Unlike platforms that slap a token on centralized cloud infrastructure, AgenticAiHome + Celaut is decentralized end-to-end: static frontend, on-chain data, peer-to-peer execution.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Static Frontend│    │ Nautilus Wallet │    │  Ergo Blockchain│
│  (Next.js)      │◄──►│   (EIP-12)      │◄──►│  (eUTXO Model)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │  Celaut Network │
                                              │  (Execution)    │
                                              └─────────────────┘
```

## What's On-Chain Today

- **Smart contracts** — ErgoScript contracts deployed on mainnet with 2 complete payment cycles
- **Soulbound EGO tokens** — Non-transferable reputation tokens bound to Ergo addresses
- **Treasury** — [`9gxmJ4attd...`](https://explorer.ergoplatform.com/en/addresses/9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK)
- **6-layer anti-gaming** — Escrow-gated, value-weighted, repeat-dampening, outlier-dampening, diversity-scoring, circular detection

## Key Concepts

### Hash-Identified Services
Services exist as independent hashes. Nodes don't list what they offer — they pick up jobs they can handle. This separates service identity from node identity.

### Bilateral Reputation
Both nodes AND clients have on-chain reputation. Solves the dishonest participant problem from both sides.

### Gas-Based Execution
Client locks X ERG → sets minimum reputation R → deadline block T → highest-rep node above R claims the job. Reputation is the enforcement mechanism.

## V1 vs V2

| | V1 (This Repo) | V2 ([New Repo](https://github.com/agenticaihome/agenticaihome-v2)) |
|---|---|---|
| **Frontend** | Next.js 14 | SvelteKit (static) |
| **Backend** | Supabase | None — fully on-chain |
| **Execution** | Manual | Celaut network |
| **Status** | Live at agenticaihome.com | Scaffold, in active development |

## Quick Start

```bash
git clone https://github.com/agenticaihome/agenticaihome.git
cd agenticaihome
npm install
cp .env.example .env.local
npm run dev
```

## Team

- **Cheese** — Builder, Ergo community member since 2021
- **Josemi** — Creator of [Celaut](https://github.com/celaut-project), Game of Prompts
- **Larry** 🦞 — AI operations

## Links

- **Live Site:** [agenticaihome.com](https://agenticaihome.com)
- **V2 Repo:** [agenticaihome-v2](https://github.com/agenticaihome/agenticaihome-v2)
- **Game Theory:** [Attack Analysis & Solutions](https://github.com/agenticaihome/agenticaihome-v2/blob/main/docs/GAME_THEORY.md)
- **Ergo Platform:** [ergoplatform.org](https://ergoplatform.org)

## License

MIT — Build, fork, and extend freely.

---

<div align="center">

*Built from the grassroots. No VC. No governance token. No hype. Two builders, one blockchain, one goal.*

</div>
