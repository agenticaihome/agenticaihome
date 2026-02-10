/**
 * Transaction reduction using ergo-lib-wasm-browser.
 * Reduces an unsigned EIP-12 transaction to sigma-serialized bytes
 * suitable for ErgoPay / Terminus wallet signing.
 */

let ergoWasm: typeof import('ergo-lib-wasm-browser') | null = null;

/**
 * Lazy-load ergo-lib-wasm-browser (heavy WASM module)
 */
async function getErgoWasm() {
  if (!ergoWasm) {
    ergoWasm = await import('ergo-lib-wasm-browser');
  }
  return ergoWasm;
}

/**
 * Fetch the last 10 block headers from the Ergo network.
 * Required for creating ErgoStateContext for tx reduction.
 */
async function fetchLastBlockHeaders(): Promise<any[]> {
  // Try the node API first (returns headers directly)
  try {
    const res = await fetch('https://node.ergo.watch/blocks/lastHeaders/10');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fall through
  }

  // Fallback: use explorer API to get block IDs, then fetch headers
  try {
    const res = await fetch('https://api.ergoplatform.com/api/v1/blocks?limit=10&sortBy=height&sortDirection=desc');
    if (res.ok) {
      const data = await res.json();
      // Explorer returns block summaries, extract what we need for headers
      // The block items contain header info
      return data.items.map((block: any) => ({
        id: block.id,
        timestamp: block.timestamp,
        version: block.version || 2,
        adProofsRoot: block.adProofsRoot || '0' .repeat(64),
        stateRoot: block.stateRoot || '0'.repeat(66),
        transactionsRoot: block.transactionsRoot || '0'.repeat(64),
        nBits: block.nBits || block.difficulty || 0,
        extensionHash: block.extensionHash || '0'.repeat(64),
        powSolutions: block.powSolutions || { pk: '0'.repeat(66), w: '0'.repeat(66), n: '0'.repeat(16), d: '0' },
        height: block.height,
        difficulty: block.difficulty || '0',
        parentId: block.parentId || '0'.repeat(64),
        votes: block.votes || '000000',
      }));
    }
  } catch {
    // fall through
  }

  throw new Error('Failed to fetch block headers from Ergo network');
}

/**
 * Reduce an unsigned EIP-12 transaction to sigma-serialized bytes.
 * 
 * @param unsignedTx - EIP-12 format unsigned transaction object
 * @param inputBoxes - Full box objects (with all fields) for the inputs
 * @returns Base64 URL-safe encoded reduced transaction bytes
 */
export async function reduceTransaction(
  unsignedTx: any,
  inputBoxes: any[]
): Promise<string> {
  const wasm = await getErgoWasm();

  // Convert unsigned tx from EIP-12 JSON
  const tx = wasm.UnsignedTransaction.from_json(JSON.stringify(unsignedTx));

  // Convert input boxes
  const boxes = wasm.ErgoBoxes.from_boxes_json(inputBoxes);

  // Empty data inputs (we don't use data inputs)
  const dataInputBoxes = wasm.ErgoBoxes.from_boxes_json([]);

  // Get block headers for state context
  const headers = await fetchLastBlockHeaders();
  const blockHeaders = wasm.BlockHeaders.from_json(headers);
  const preHeader = wasm.PreHeader.from_block_header(blockHeaders.get(0));
  const parameters = wasm.Parameters.default_parameters();
  const stateContext = new wasm.ErgoStateContext(preHeader, blockHeaders, parameters);

  // Reduce the transaction
  const reduced = wasm.ReducedTransaction.from_unsigned_tx(
    tx,
    boxes,
    dataInputBoxes,
    stateContext
  );

  // Sigma-serialize to bytes
  const bytes = reduced.sigma_serialize_bytes();

  // Convert to Base64 URL-safe encoding
  return base64UrlEncode(bytes);
}

/**
 * Convert Uint8Array to Base64 URL-safe string
 */
function base64UrlEncode(bytes: Uint8Array): string {
  // Convert to regular base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  // Make URL-safe: replace + with -, / with _, remove trailing =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
