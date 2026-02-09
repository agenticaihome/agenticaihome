/**
 * ErgoScript P2S Address Compiler
 * Compiles ErgoScript source code to P2S addresses via public Ergo node API.
 * Caches results in localStorage for performance.
 */

const ERGO_NODES = [
  'https://ergo-node-mainnet.anetabtc.io',
  'https://node.sigmaspace.io',
];

const CACHE_KEY = 'aih_p2s_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  address: string;
  ergoTree: string;
  compiledAt: number;
  sourceHash: string;
}

interface CompileResult {
  address: string;
  ergoTree?: string;
}

function hashSource(source: string): string {
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

function getCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(key: string, entry: CacheEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getCache();
    cache[key] = entry;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable
  }
}

function getCachedResult(source: string): CompileResult | null {
  const key = hashSource(source);
  const cache = getCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.compiledAt > CACHE_TTL_MS) return null;
  return { address: entry.address, ergoTree: entry.ergoTree };
}

/**
 * Compile ErgoScript source to a P2S address using a public Ergo node.
 */
export async function compileErgoScript(source: string): Promise<CompileResult> {
  // Check cache first
  const cached = getCachedResult(source);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (const nodeUrl of ERGO_NODES) {
    try {
      const result = await compileViaNode(nodeUrl, source);
      // Cache the result
      setCache(hashSource(source), {
        address: result.address,
        ergoTree: result.ergoTree || '',
        compiledAt: Date.now(),
        sourceHash: hashSource(source),
      });
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Compilation failed on ${nodeUrl}:`, lastError.message);
    }
  }

  throw new Error(`Failed to compile ErgoScript on all nodes: ${lastError?.message}`);
}

async function compileViaNode(nodeUrl: string, source: string): Promise<CompileResult> {
  // Get P2S address
  const addressRes = await fetch(`${nodeUrl}/script/p2sAddress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });

  if (!addressRes.ok) {
    const errorText = await addressRes.text().catch(() => 'Unknown error');
    throw new Error(`Node returned ${addressRes.status}: ${errorText}`);
  }

  const addressData = await addressRes.json();
  if (!addressData.address) {
    throw new Error('No address in response');
  }

  // Also get ErgoTree hex
  let ergoTree: string | undefined;
  try {
    const treeRes = await fetch(`${nodeUrl}/script/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      ergoTree = treeData.tree;
    }
  } catch {
    // ErgoTree compilation is optional
  }

  return { address: addressData.address, ergoTree };
}

/**
 * Compile the escrow contract with specific parameters baked in.
 * Since our contract reads from registers, we compile it as-is.
 */
export async function compileEscrowContract(): Promise<CompileResult> {
  const { ESCROW_ERGOSCRIPT } = await import('./constants');
  return compileErgoScript(ESCROW_ERGOSCRIPT);
}

/**
 * Clear the compilation cache.
 */
export function clearCompilationCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
  }
}
