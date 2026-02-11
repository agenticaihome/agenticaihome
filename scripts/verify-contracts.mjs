#!/usr/bin/env node
/**
 * Contract Address Verification Script
 * Compiles each ErgoScript source and verifies the resulting P2S address
 * matches the hardcoded address in constants.ts.
 *
 * Usage: node scripts/verify-contracts.mjs
 */

const ERGO_NODES = [
  'https://node.ergo.watch',
  'https://node.sigmaspace.io',
  'https://ergo-node-mainnet.anetabtc.io',
];

// Import constants by reading the file and extracting values
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const constantsPath = resolve(__dirname, '../src/lib/ergo/constants.ts');
const constantsSrc = readFileSync(constantsPath, 'utf-8');

// Extract ErgoScript sources and addresses from constants.ts
function extractConst(name) {
  // Match both single-line strings and template literals
  const singleLine = new RegExp(`export const ${name}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`);
  const m = constantsSrc.match(singleLine);
  if (m) return m[1];

  // Template literal (multi-line)
  const tmplRe = new RegExp(`export const ${name}\\s*=\\s*\`([\\s\\S]*?)\``);
  const tm = constantsSrc.match(tmplRe);
  return tm ? tm[1] : null;
}

const CONTRACTS = [
  {
    name: 'ESCROW',
    scriptConst: 'ESCROW_ERGOSCRIPT',
    addressConst: 'ESCROW_CONTRACT_ADDRESS',
  },
  // Add more contracts here as their ErgoScript sources are added to constants.ts
];

async function compileP2S(source, nodeUrl) {
  const res = await fetch(`${nodeUrl}/script/p2sAddress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.address;
}

async function compileWithRetry(source) {
  let lastErr;
  for (const node of ERGO_NODES) {
    try {
      return await compileP2S(source, node);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

let failures = 0;

for (const contract of CONTRACTS) {
  const script = extractConst(contract.scriptConst);
  const expectedAddress = extractConst(contract.addressConst);

  if (!script) {
    console.error(`❌ ${contract.name}: ErgoScript source (${contract.scriptConst}) not found in constants.ts`);
    failures++;
    continue;
  }
  if (!expectedAddress) {
    console.error(`❌ ${contract.name}: Address (${contract.addressConst}) not found in constants.ts`);
    failures++;
    continue;
  }

  try {
    const compiledAddress = await compileWithRetry(script);
    if (compiledAddress === expectedAddress) {
      console.log(`✅ ${contract.name}: Address matches (${compiledAddress.slice(0, 20)}...)`);
    } else {
      console.error(`❌ ${contract.name}: ADDRESS MISMATCH!`);
      console.error(`   Expected:  ${expectedAddress}`);
      console.error(`   Compiled:  ${compiledAddress}`);
      failures++;
    }
  } catch (e) {
    console.error(`❌ ${contract.name}: Compilation failed — ${e.message}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} contract(s) failed verification.`);
  process.exit(1);
} else {
  console.log(`\nAll ${CONTRACTS.length} contract(s) verified successfully.`);
}
