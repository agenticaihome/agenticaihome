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

/**
 * Ergo ledger identifier for Celaut contracts.
 * From celaut-nodo: reputation_system/envs.py → ergo_ledger
 * Tags = ["ergo"], token_id = "ERG"
 */
export const ERGO_LEDGER = {
  /** Ledger tag — matches celaut-nodo's LEDGER = "ergo" */
  TAGS: ['ergo'],
  PROSE: 'Ergo Platform',
  TOKEN_ID_ERG: 'ERG',
  /** The ErgoScript template used by Celaut nodes — simple P2PK */
  CONTRACT_TEMPLATE: 'proveDlog(decodePoint())',
} as const;

/**
 * Gas price defaults (testnet).
 *
 * In celaut-nodo, GAS_PER_ERG is a node config value (e.g. 1_000_000).
 * Conversion: nanoERG = gas * (1/GAS_PER_ERG) * 1e9
 * So 1_000_000 gas = 1 ERG when GAS_PER_ERG = 1_000_000.
 */
export const GAS_DEFAULTS = {
  /** Default GAS_PER_ERG rate (gas units per 1 ERG). Node-specific; this is a fallback. */
  GAS_PER_ERG: 1_000_000,
  /** Minimum gas deposit for starting a service */
  MIN_INITIAL_GAS: '100000',
  /** Default initial gas deposit (0.5 ERG worth at default rate) */
  DEFAULT_INITIAL_GAS: '500000',
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
