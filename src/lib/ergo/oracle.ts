/**
 * Oracle Pool integration for ERG/USD price data.
 *
 * Reads the on-chain ERG/USD oracle pool box (identified by its singleton NFT)
 * and provides utilities for:
 *   - Fetching the current oracle pool box
 *   - Extracting the ERG/USD price from register R4
 *   - Building data inputs for Fleet SDK transactions
 *
 * Oracle Pool V2 stores the rate in R4 as SLong: nanoERG per 1 USD.
 * For example, R4 = 2_775_000_000 means 1 USD ≈ 2.775 ERG → ERG ≈ $0.36.
 *
 * Data inputs are read-only references that allow contracts to verify
 * on-chain oracle prices without spending the oracle box.
 */

import { ERGO_EXPLORER_API, NANOERG_FACTOR } from './constants';
import type { Box } from './explorer';

// ─── Constants ───────────────────────────────────────────────────────

/**
 * ERG/USD Oracle Pool V2 singleton NFT token ID (mainnet).
 * This NFT uniquely identifies the live oracle pool box.
 * Source: SigmaUSD contracts / EIP-0015.
 */
export const ORACLE_POOL_NFT_ID =
  '011d3364de07e5a26f0c4eef0852cddb387039a921b7154ef3cab22c6eda887f';

/** Cache duration for oracle data (2 minutes — roughly one Ergo block). */
const ORACLE_CACHE_TTL_MS = 2 * 60 * 1000;

/** Request timeout for explorer calls. */
const REQUEST_TIMEOUT_MS = 10_000;

// ─── Types ───────────────────────────────────────────────────────────

export interface OraclePoolBox {
  boxId: string;
  /** Raw R4 SLong value: nanoERG per 1 USD. */
  rateRaw: bigint;
  /** ERG/USD price (e.g. 0.36 means 1 ERG = $0.36). */
  ergUsdPrice: number;
  /** Block height at which this box was settled. */
  settlementHeight: number;
  /** Epoch counter from R5. */
  epoch: number;
  /** Full box data for building data inputs. */
  raw: Box;
}

export interface OracleDataInput {
  boxId: string;
}

// ─── Cache ───────────────────────────────────────────────────────────

let _cache: { data: OraclePoolBox; fetchedAt: number } | null = null;

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Decode a Sigma VLQ (Variable-Length Quantity) encoded unsigned integer
 * from a hex string starting at `offset` hex chars.
 */
function decodeVlq(hex: string, startOffset: number): { value: bigint; endOffset: number } {
  let offset = startOffset;
  let result = 0n;
  let shift = 0n;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (offset + 2 > hex.length) {
      throw new Error('Unexpected end of VLQ data');
    }
    const byte = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    if ((byte & 0x80) === 0) break;
  }
  return { value: result, endOffset: offset };
}

/**
 * Decode an SLong constant from its serialized hex representation.
 * Format: 05 (type tag) + ZigZag-VLQ encoded value.
 */
function decodeSLong(serializedHex: string): bigint {
  const cleanHex = serializedHex.replace(/\s/g, '').toLowerCase();
  const typeTag = cleanHex.slice(0, 2);
  if (typeTag !== '05') {
    throw new Error(`Expected SLong type tag 05, got ${typeTag}`);
  }
  const { value: vlq } = decodeVlq(cleanHex, 2);
  // ZigZag decode: (vlq >>> 1) ^ -(vlq & 1)
  return (vlq >> 1n) ^ -(vlq & 1n);
}

/**
 * Decode an SInt constant from its serialized hex representation.
 * Format: 04 (type tag) + ZigZag-VLQ encoded value.
 */
function decodeSInt(serializedHex: string): number {
  const cleanHex = serializedHex.replace(/\s/g, '').toLowerCase();
  const typeTag = cleanHex.slice(0, 2);
  if (typeTag !== '04') {
    throw new Error(`Expected SInt type tag 04, got ${typeTag}`);
  }
  const { value: vlq } = decodeVlq(cleanHex, 2);
  const zigzag = (vlq >> 1n) ^ -(vlq & 1n);
  return Number(zigzag);
}

/**
 * Fetch JSON from explorer with timeout and basic error handling.
 */
async function explorerFetch<T>(endpoint: string): Promise<T> {
  const url = `${ERGO_EXPLORER_API}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AgenticAiHome/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`Explorer API ${response.status}: ${response.statusText}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract the serialized hex value from an explorer register field.
 * Explorer may return either a plain hex string or an object with `serializedValue`.
 */
function registerHex(register: unknown): string {
  if (typeof register === 'string') return register;
  if (register && typeof register === 'object' && 'serializedValue' in register) {
    return (register as { serializedValue: string }).serializedValue;
  }
  throw new Error('Unable to read register value');
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch the current ERG/USD oracle pool box from the Ergo explorer.
 *
 * Returns cached data if fresh (< 2 min old). The box is identified by
 * its singleton NFT token ID.
 *
 * @throws if the oracle box cannot be found or parsed.
 */
export async function getOraclePoolBox(): Promise<OraclePoolBox> {
  // Return cache if fresh
  if (_cache && Date.now() - _cache.fetchedAt < ORACLE_CACHE_TTL_MS) {
    return _cache.data;
  }

  const response = await explorerFetch<{ items: Box[]; total: number }>(
    `/boxes/unspent/byTokenId/${ORACLE_POOL_NFT_ID}?limit=1`
  );

  if (!response.items || response.items.length === 0) {
    throw new Error('Oracle pool box not found on-chain. The oracle may be updating.');
  }

  const box = response.items[0];
  const regs = (box as any).additionalRegisters;

  if (!regs?.R4) {
    throw new Error('Oracle pool box missing R4 register (price data)');
  }

  // R4: SLong — nanoERG per 1 USD
  const r4Hex = registerHex(regs.R4);
  if (!/^[0-9a-fA-F]+$/.test(r4Hex)) {
    throw new Error('Invalid hex in oracle R4 register');
  }
  const rateRaw = decodeSLong(r4Hex);

  if (rateRaw <= 0n) {
    throw new Error(`Invalid oracle rate: ${rateRaw}`);
  }

  // Convert: rateRaw = nanoERG per 1 USD
  // ERG/USD price = 1e9 / rateRaw  (i.e., how many USD per 1 ERG)
  const ergUsdPrice = Number(NANOERG_FACTOR) / Number(rateRaw);

  // R5: SInt — epoch counter (optional, for informational use)
  let epoch = 0;
  if (regs.R5) {
    try {
      const r5Hex = registerHex(regs.R5);
      // R5 can be SInt (04) or sometimes encoded differently
      if (r5Hex.startsWith('04')) {
        epoch = decodeSInt(r5Hex);
      }
    } catch {
      // Non-critical — epoch is informational only
    }
  }

  const result: OraclePoolBox = {
    boxId: box.boxId,
    rateRaw,
    ergUsdPrice,
    settlementHeight: (box as any).settlementHeight ?? (box as any).creationHeight ?? 0,
    epoch,
    raw: box,
  };

  _cache = { data: result, fetchedAt: Date.now() };
  return result;
}

/**
 * Get the current ERG/USD price from the on-chain oracle pool.
 *
 * @returns Price as a number (e.g. 0.36 means 1 ERG = $0.36).
 */
export async function getErgUsdPrice(): Promise<number> {
  const oracleBox = await getOraclePoolBox();
  return oracleBox.ergUsdPrice;
}

/**
 * Build a data input reference from the oracle pool box.
 *
 * Data inputs are read-only box references included in transactions.
 * They allow ErgoScript contracts to read oracle data without spending
 * the oracle box. Use the returned object in Fleet SDK's
 * `TransactionBuilder.withDataFrom()`.
 *
 * @returns The oracle box in a format suitable for Fleet SDK data inputs.
 */
export async function buildDataInputFromOracle(): Promise<{
  dataInput: OracleDataInput;
  oracleBox: OraclePoolBox;
  /** Full box object for Fleet SDK `withDataFrom()`. */
  boxForDataInput: Box;
}> {
  const oracleBox = await getOraclePoolBox();

  // Convert explorer register format to plain hex for Fleet SDK
  const rawBox = oracleBox.raw as any;
  const convertedRegisters = Object.fromEntries(
    Object.entries(rawBox.additionalRegisters || {}).map(
      ([key, val]: [string, unknown]) => [key, registerHex(val)]
    )
  );

  const boxForDataInput: Box = {
    ...rawBox,
    additionalRegisters: convertedRegisters,
  };

  return {
    dataInput: { boxId: oracleBox.boxId },
    oracleBox,
    boxForDataInput,
  };
}

/**
 * Invalidate the oracle cache. Useful after a known oracle update.
 */
export function clearOracleCache(): void {
  _cache = null;
}
