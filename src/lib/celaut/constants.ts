// Celaut integration constants

/** Default Celaut node endpoints (testnet) */
export const CELAUT_NODES = {
  TESTNET_PRIMARY: 'https://celaut-testnet-1.agenticaihome.com',
  TESTNET_SECONDARY: 'https://celaut-testnet-2.agenticaihome.com',
  LOCAL: 'http://localhost:8080',
} as const;

/** Default node URL for development */
export const DEFAULT_NODE_URL = CELAUT_NODES.TESTNET_PRIMARY;

/** Proxy relay path — browser requests go through this Edge Function */
export const CELAUT_PROXY_PATH = '/api/celaut-proxy';

/** AIH Agent container defaults */
export const AIH_AGENT_CONTAINER = {
  /** SHA-256 hash of the base Python 3.11 slim image used for AIH agents */
  BASE_IMAGE_HASH: '0000000000000000000000000000000000000000000000000000000000000000', // TODO: set after building base image
  ARCHITECTURE_TAGS: ['x86_64', 'linux'],
  ENTRYPOINT: ['/usr/bin/python3', '-m', 'aih_agent.main'],
  GRPC_PORT: 50051,
  DEFAULT_ENV: {
    AIH_AGENT_VERSION: '1.0.0',
    AIH_PROTOCOL: 'grpc',
  },
} as const;

/** Ergo ledger identifier for Celaut contracts */
export const ERGO_LEDGER = {
  TAGS: ['ergo', 'utxo'],
  PROSE: 'Ergo Platform — UTXO-based smart contract blockchain',
  /** Formal identifier bytes (SHA-256 of "ergo-mainnet") — placeholder */
  FORMAL_HEX: '65e5a1c4d3b2f0a9e8d7c6b5a4938271',
  TOKEN_ID_ERG: 'ERG',
} as const;

/** Gas price defaults (testnet) */
export const GAS_DEFAULTS = {
  /** 1 ERG = this many gas units (string for BigInt compatibility) */
  ERG_TO_GAS_RATIO: '1000000000',
  /** Minimum gas deposit for starting a service */
  MIN_INITIAL_GAS: '100000000',
  /** Default initial gas deposit */
  DEFAULT_INITIAL_GAS: '500000000',
} as const;

/** Timeouts */
export const CELAUT_TIMEOUTS = {
  CONNECT_MS: 10_000,
  START_SERVICE_MS: 120_000,
  STOP_SERVICE_MS: 30_000,
  TUNNEL_MS: 60_000,
  DEFAULT_MS: 15_000,
} as const;

/** Service tunnel message types */
export const TUNNEL_MSG = {
  TASK_REQUEST: 0x01,
  TASK_RESPONSE: 0x02,
  HEARTBEAT: 0x03,
  ERROR: 0xFF,
} as const;
