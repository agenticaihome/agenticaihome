/**
 * Agent Packager — converts an AIH Agent into a Celaut Service spec.
 *
 * An AIH agent running on Celaut is a Python container that:
 * 1. Accepts task JSON via gRPC on port 50051
 * 2. Executes the agent logic
 * 3. Returns the deliverable via gRPC response
 * 4. Payment handled by Ergo smart contract (escrow → gas bridge)
 */

import type { Agent } from '@/lib/types';
import type {
  CelautService,
  CelautServiceAPI,
  CelautServiceSlot,
  CelautGasPrice,
  CelautContract,
  CelautConfiguration,
  CelautGasAmount,
} from './types';
import { AIH_AGENT_CONTAINER, ERGO_LEDGER, GAS_DEFAULTS } from './constants';

// ─── Standard AIH Agent gRPC API ────────────────────────────

/** Creates the standard gRPC API definition for AIH agents on Celaut */
export function createAgentAPI(paymentContracts: CelautGasPrice[] = []): CelautServiceAPI {
  const grpcSlot: CelautServiceSlot = {
    port: AIH_AGENT_CONTAINER.GRPC_PORT,
    protocolStack: [
      {
        tags: ['grpc', 'http2', 'protobuf'],
        prose: 'AIH Agent gRPC interface — accepts TaskRequest, returns TaskResponse',
      },
    ],
  };

  return {
    environmentVariables: {
      TASK_JSON: {
        tags: ['json', 'task-request'],
        prose: 'JSON-encoded task request payload',
      },
      AGENT_ID: {
        tags: ['string', 'identifier'],
        prose: 'AIH agent identifier',
      },
    },
    slots: [grpcSlot],
    paymentContracts: paymentContracts.length > 0 ? paymentContracts : [createDefaultErgoPayment()],
  };
}

// ─── Payment contract helpers ───────────────────────────────

/** Creates the default Ergo payment contract for AIH agents */
function createDefaultErgoPayment(): CelautGasPrice {
  return {
    contract: createErgoContract(),
    gasAmount: { n: GAS_DEFAULTS.ERG_TO_GAS_RATIO },
  };
}

/** Creates a Celaut Contract referencing the Ergo ledger */
export function createErgoContract(tokenId?: string): CelautContract {
  return {
    template: {
      tags: ['ergo', 'escrow', 'aih'],
      prose: 'AgenticAiHome escrow payment contract on Ergo',
    },
    // Script bytes would be the compiled ErgoScript escrow contract
    // TODO: set actual compiled contract bytes after escrow contract is finalized
    script: new Uint8Array(0),
    tokenId: tokenId ?? ERGO_LEDGER.TOKEN_ID_ERG,
    ledger: {
      tags: [...ERGO_LEDGER.TAGS],
      prose: ERGO_LEDGER.PROSE,
      formal: hexToBytes(ERGO_LEDGER.FORMAL_HEX),
    },
  };
}

// ─── Agent → Service packaging ──────────────────────────────

/**
 * Package an AIH Agent record into a Celaut Service spec.
 *
 * NOTE: The actual container filesystem (Docker image layers) is not
 * embedded here — in production, the filesystem bytes would reference
 * the pre-built AIH agent base image stored on the Celaut network.
 * The agent's custom code is injected via configuration environment variables.
 */
export function packageAgent(agent: Agent): CelautService {
  const api = createAgentAPI();

  return {
    prose: `AIH Agent: ${agent.name} — ${agent.description}`,
    container: {
      architecture: {
        tags: [...AIH_AGENT_CONTAINER.ARCHITECTURE_TAGS],
        prose: 'x86_64 Linux container',
      },
      // Filesystem is the serialized base image — referenced by hash in practice
      // The actual bytes would be fetched from the Celaut network via GetService
      filesystem: new Uint8Array(0), // Placeholder — resolved at deploy time
      entrypoint: [...AIH_AGENT_CONTAINER.ENTRYPOINT],
      resources: {
        atInit: {
          memLimit: 256 * 1024 * 1024,   // 256 MB
          cpuQuota: 50_000,               // 50ms per 100ms period
          cpuPeriod: 100_000,
          diskSpace: 512 * 1024 * 1024,   // 512 MB
        },
        atMost: {
          memLimit: 1024 * 1024 * 1024,   // 1 GB
          cpuQuota: 200_000,              // 200ms per 100ms period (2 cores)
          cpuPeriod: 100_000,
          diskSpace: 2 * 1024 * 1024 * 1024, // 2 GB
        },
        startTimeMs: 30_000,
      },
      config: {
        path: ['/etc/aih', 'agent.json'],
        format: {
          tags: ['json'],
          prose: 'Agent configuration and metadata',
        },
      },
      nodeProtocolStack: [
        {
          tags: ['celaut', 'gateway', 'grpc'],
          prose: 'Standard Celaut node gateway protocol',
        },
      ],
    },
    api,
    network: [], // Agents are isolated by default — no external network access
  };
}

/**
 * Create a Celaut Configuration for deploying an AIH agent.
 */
export function createAgentConfiguration(
  agent: Agent,
  taskJson: string,
  initialGas?: CelautGasAmount,
): CelautConfiguration {
  const encoder = new TextEncoder();

  return {
    environmentVariables: {
      AGENT_ID: encoder.encode(agent.id),
      AGENT_NAME: encoder.encode(agent.name),
      TASK_JSON: encoder.encode(taskJson),
      AIH_AGENT_VERSION: encoder.encode(AIH_AGENT_CONTAINER.DEFAULT_ENV.AIH_AGENT_VERSION),
    },
    specSlot: [AIH_AGENT_CONTAINER.GRPC_PORT],
    initialGasAmount: initialGas ?? { n: GAS_DEFAULTS.DEFAULT_INITIAL_GAS },
  };
}

// ─── Utilities ──────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
