/**
 * Celaut TypeScript types — mirrors celaut.proto message definitions.
 * @see https://github.com/celaut-project/nodo/blob/master/protos/celaut.proto
 */

// ─── Primitives ──────────────────────────────────────────────

export interface CelautDataFormat {
  tags: string[];
  prose: string;
  /** Binary formal representation */
  formal?: Uint8Array;
}

export interface CelautContract {
  template?: CelautDataFormat; // ScriptTemplate
  script?: Uint8Array;
  tokenId?: string;
  ledger?: CelautDataFormat;
}

export interface CelautGasAmount {
  /** Numeric string for arbitrary-precision gas amounts */
  n: string;
}

export interface CelautGasPrice {
  contract: CelautContract;
  gasAmount: CelautGasAmount;
}

// ─── Metadata & Hashing ─────────────────────────────────────

export interface CelautHash {
  /** Hash algorithm identifier (e.g. SHA-256) */
  type: Uint8Array;
  /** Hash value */
  value: Uint8Array;
}

export interface CelautHashTag {
  hash: CelautHash[];
  tag: string[];
  attrHashtag: Array<{
    key: number;
    value: CelautHashTag[];
  }>;
}

export interface CelautMetadata {
  hashtag?: CelautHashTag;
  format?: CelautDataFormat;
  reputationProofs: CelautContract[];
}

// ─── System Resources ───────────────────────────────────────

export interface CelautSysresources {
  blkioWeight?: number;
  cpuPeriod?: number;
  cpuQuota?: number;
  memLimit?: number;
  diskSpace?: number;
}

// ─── Service Spec (BOX + API + NET) ─────────────────────────

export interface CelautServiceProtocol {
  tags: string[];
  prose: string;
  formal?: Uint8Array;
}

export interface CelautServiceSlot {
  port: number;
  protocolStack: CelautServiceProtocol[];
}

export interface CelautServiceAPI {
  environmentVariables: Record<string, CelautDataFormat>;
  slots: CelautServiceSlot[];
  paymentContracts: CelautGasPrice[];
}

export interface CelautFilesystemItem {
  name: string;
  file?: Uint8Array;
  link?: { src: string; dst: string };
  filesystem?: CelautFilesystem;
}

export interface CelautFilesystem {
  branch: CelautFilesystemItem[];
}

export interface CelautContainerConfig {
  path: string[];
  format: CelautDataFormat;
}

export interface CelautContainerResources {
  atInit: CelautSysresources;
  atMost: CelautSysresources;
  startTimeMs?: number;
}

export interface CelautContainer {
  architecture: CelautDataFormat;
  /** Serialized filesystem bytes */
  filesystem: Uint8Array;
  entrypoint: string[];
  resources?: CelautContainerResources;
  config: CelautContainerConfig;
  nodeProtocolStack: CelautServiceProtocol[];
}

export interface CelautNetwork {
  tags: string[];
  prose: string;
  formal?: Uint8Array;
  clientProtocolStack: CelautServiceProtocol[];
}

export interface CelautService {
  prose: string;
  container: CelautContainer;
  api: CelautServiceAPI;
  network: CelautNetwork[];
}

// ─── Instance ───────────────────────────────────────────────

export interface CelautUri {
  ip: string;
  port: number;
}

export interface CelautUriSlot {
  internalPort: number;
  uri: CelautUri[];
}

export interface CelautInstance {
  api: CelautServiceAPI;
  uriSlot: CelautUriSlot[];
}

// ─── Configuration ──────────────────────────────────────────

export interface CelautConfiguration {
  environmentVariables: Record<string, Uint8Array>;
  specSlot: number[];
  initialGasAmount?: CelautGasAmount;
}

export interface CelautNetworkResolution {
  tags: string[];
  peerInstances: CelautInstance[];
}

export interface CelautConfigurationFile {
  gateway: CelautInstance;
  config: CelautConfiguration;
  networkResolution: CelautNetworkResolution[];
  initialSysresources: CelautSysresources;
}

// ─── Gateway Messages ───────────────────────────────────────

export interface CelautTokenMessage {
  token: string;
  slot?: string;
}

export interface CelautEstimatedCost {
  cost: CelautGasAmount;
  initMaintenanceCost: CelautGasAmount;
  maxMaintenanceCost: CelautGasAmount;
  maintenanceSecondsLoop: number;
  variance: number;
}

export interface CelautRefund {
  amount: CelautGasAmount;
}

export interface CelautPayment {
  depositToken: string;
  contract: CelautContract;
  gasAmount: CelautGasAmount;
}

export interface CelautMetrics {
  gasAmount: CelautGasAmount;
}

export interface CelautServiceInstance {
  token: string;
  instance: CelautInstance;
}

export interface CelautPeer {
  reputationProofs: CelautContract[];
  instance: CelautInstance;
}

export interface CelautClient {
  clientId: string;
}

export interface CelautModifyGasDepositInput {
  gasDifference: CelautGasAmount;
  serviceToken: string;
}

export interface CelautModifyGasDepositOutput {
  success: boolean;
  message: string;
}

export interface CelautModifyServiceSystemResourcesInput {
  minSysreq: CelautSysresources;
  maxSysreq: CelautSysresources;
}

export interface CelautModifyServiceSystemResourcesOutput {
  sysreq: CelautSysresources;
  gas: CelautGasAmount;
}

export interface CelautSignRequest {
  publicKey: string;
  toSign: string;
}

export interface CelautSignResponse {
  signed: string;
}

// ─── Gateway RPC Methods ────────────────────────────────────

export enum GatewayMethod {
  StartService = 'StartService',
  StopService = 'StopService',
  ModifyGasDeposit = 'ModifyGasDeposit',
  GetPeerInfo = 'GetPeerInfo',
  IntroducePeer = 'IntroducePeer',
  GenerateClient = 'GenerateClient',
  GenerateDepositToken = 'GenerateDepositToken',
  Payable = 'Payable',
  SignPublicKey = 'SignPublicKey',
  ModifyServiceSystemResources = 'ModifyServiceSystemResources',
  Pack = 'Pack',
  GetServiceEstimatedCost = 'GetServiceEstimatedCost',
  GetService = 'GetService',
  GetMetrics = 'GetMetrics',
  ServiceTunnel = 'ServiceTunnel',
}

// ─── AIH-specific extensions ────────────────────────────────

/** Execution mode for tasks */
export type ExecutionMode = 'standard' | 'celaut';

/** Status of a Celaut node connection */
export type CelautNodeStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

/** Running service tracker for the UI */
export interface CelautRunningService {
  token: string;
  taskId: string;
  agentId: string;
  nodeUrl: string;
  startedAt: string;
  gasUsed: CelautGasAmount;
  gasDeposited: CelautGasAmount;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
}
