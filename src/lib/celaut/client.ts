/**
 * CelautClient — HTTP proxy wrapper for the Celaut Gateway gRPC API.
 *
 * Since AIH is a statically-exported Next.js app, we can't use native gRPC.
 * All calls go through an HTTP relay (Edge Function or external proxy) that
 * translates JSON ↔ protobuf streams to the Celaut node's gRPC gateway.
 */

import {
  CelautService,
  CelautConfiguration,
  CelautInstance,
  CelautEstimatedCost,
  CelautGasAmount,
  CelautPeer,
  CelautMetrics,
  CelautPayment,
  CelautNodeStatus,
  GatewayMethod,
} from './types';
import { CELAUT_PROXY_PATH, CELAUT_TIMEOUTS, DEFAULT_NODE_URL } from './constants';

export interface CelautClientOptions {
  /** Override the proxy relay URL (default: /api/celaut-proxy) */
  proxyUrl?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Auth token for the proxy */
  authToken?: string;
}

export class CelautClient {
  private nodeUrl: string;
  private proxyUrl: string;
  private timeoutMs: number;
  private authToken?: string;
  private _status: CelautNodeStatus = 'disconnected';

  constructor(nodeUrl: string = DEFAULT_NODE_URL, options: CelautClientOptions = {}) {
    this.nodeUrl = nodeUrl;
    this.proxyUrl = options.proxyUrl ?? CELAUT_PROXY_PATH;
    this.timeoutMs = options.timeoutMs ?? CELAUT_TIMEOUTS.DEFAULT_MS;
    this.authToken = options.authToken;
  }

  get status(): CelautNodeStatus {
    return this._status;
  }

  // ─── Private helpers ────────────────────────────────────────

  private async rpc<T>(method: GatewayMethod, payload: unknown = {}, timeoutMs?: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

    try {
      const res = await fetch(this.proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          nodeUrl: this.nodeUrl,
          method,
          payload,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new CelautError(`RPC ${method} failed: ${res.status} — ${text}`, method, res.status);
      }

      const data = await res.json();
      this._status = 'connected';
      return data as T;
    } catch (err) {
      if (err instanceof CelautError) throw err;
      if ((err as Error).name === 'AbortError') {
        this._status = 'error';
        throw new CelautError(`RPC ${method} timed out after ${timeoutMs ?? this.timeoutMs}ms`, method);
      }
      this._status = 'error';
      throw new CelautError(`RPC ${method} failed: ${(err as Error).message}`, method);
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Public API ─────────────────────────────────────────────

  /** Check if the node is reachable */
  async ping(): Promise<boolean> {
    try {
      this._status = 'connecting';
      await this.rpc<CelautPeer>(GatewayMethod.GetPeerInfo, {}, CELAUT_TIMEOUTS.CONNECT_MS);
      this._status = 'connected';
      return true;
    } catch {
      this._status = 'error';
      return false;
    }
  }

  /** Get estimated cost for running a service (by hash or full spec) */
  async estimateCost(serviceHash: string): Promise<CelautEstimatedCost> {
    return this.rpc<CelautEstimatedCost>(
      GatewayMethod.GetServiceEstimatedCost,
      { hash: serviceHash },
      CELAUT_TIMEOUTS.DEFAULT_MS,
    );
  }

  /** Deploy a service on the Celaut node */
  async startService(spec: CelautService, config: CelautConfiguration): Promise<CelautInstance> {
    return this.rpc<CelautInstance>(
      GatewayMethod.StartService,
      { service: spec, configuration: config },
      CELAUT_TIMEOUTS.START_SERVICE_MS,
    );
  }

  /** Stop a running service and get gas refund */
  async stopService(token: string): Promise<CelautGasAmount> {
    const result = await this.rpc<{ amount: CelautGasAmount }>(
      GatewayMethod.StopService,
      { token },
      CELAUT_TIMEOUTS.STOP_SERVICE_MS,
    );
    return result.amount;
  }

  /** Send a message to a running service via the tunnel */
  async sendMessage(token: string, data: Uint8Array): Promise<Uint8Array> {
    const b64 = btoa(String.fromCharCode(...data));
    const result = await this.rpc<{ data: string }>(
      GatewayMethod.ServiceTunnel,
      { token, data: b64 },
      CELAUT_TIMEOUTS.TUNNEL_MS,
    );
    // Decode base64 response
    const binary = atob(result.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /** Get gas usage metrics for a running service */
  async getMetrics(token: string): Promise<CelautGasAmount> {
    const result = await this.rpc<CelautMetrics>(GatewayMethod.GetMetrics, { token });
    return result.gasAmount;
  }

  /** Get the node's peer info (identity + reputation) */
  async getPeerInfo(): Promise<CelautPeer> {
    return this.rpc<CelautPeer>(GatewayMethod.GetPeerInfo);
  }

  /** Generate a new client identity on the node */
  async generateClient(): Promise<string> {
    const result = await this.rpc<{ clientId: string }>(GatewayMethod.GenerateClient);
    return result.clientId;
  }

  /** Make a payment (gas deposit) to the node */
  async makePayment(payment: CelautPayment): Promise<void> {
    await this.rpc<Record<string, never>>(GatewayMethod.Payable, payment);
  }

  /** Change the connected node URL */
  setNodeUrl(url: string): void {
    this.nodeUrl = url;
    this._status = 'disconnected';
  }
}

// ─── Error class ──────────────────────────────────────────────

export class CelautError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'CelautError';
  }
}
