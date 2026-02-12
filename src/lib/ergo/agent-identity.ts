import {
  TransactionBuilder,
  OutputBuilder,
  ErgoAddress,
  SConstant,
  SSigmaProp,
  SGroupElement,
  SByte,
  SColl,
} from '@fleet-sdk/core';
import { getCurrentHeight, getAddressBalance, getTokenInfo } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, ERGO_EXPLORER_API, ERGO_EXPLORER_UI } from './constants';
import { SOULBOUND_CONTRACT_ADDRESS, SOULBOUND_CONTRACT_ADDRESS_V1 } from './ego-token';
import { pubkeyFromAddress } from './address-utils';

// ─── Constants ───────────────────────────────────────────────────────

const AGENT_TOKEN_PREFIX = 'AIH-AGENT-';

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentIdentityToken {
  tokenId: string;
  name: string;
  description: string;
  soulbound: boolean;
}

export interface AgentIdentityMintParams {
  agentName: string;
  agentAddress: string;
  skills: string[];
  description: string;
  utxos: any[];
  currentHeight: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

// pubkeyFromAddress now imported from ./address-utils

// ─── Token Minting (Soulbound) ──────────────────────────────────────

/**
 * Build a SOULBOUND Agent Identity NFT mint transaction.
 *
 * Creates a unique token (amount: 1) locked in the soulbound contract.
 * The agent's SigmaProp is stored in R4 — the NFT can never be
 * transferred to a different address.
 *
 * Uses the same soulbound contract as EGO tokens:
 * - Agent must sign (R4 SigmaProp)
 * - Token must stay in same contract
 * - Token must stay with same agent
 */
export async function buildAgentIdentityMintTx(params: AgentIdentityMintParams): Promise<any> {
  const { agentName, agentAddress, skills, description, utxos, currentHeight } = params;

  if (!agentAddress || agentAddress.length < 10) {
    throw new Error('Invalid agent address');
  }
  if (!agentName || agentName.trim().length === 0) {
    throw new Error('Agent name is required');
  }
  if (!Array.isArray(utxos) || utxos.length === 0) {
    throw new Error('No UTXOs available for minting. Wallet needs ERG.');
  }

  const tokenName = `${AGENT_TOKEN_PREFIX}${agentName.trim()}`;
  const skillsList = skills.length > 0 ? skills.join(', ') : 'General';
  const tokenDescription = `AgenticAiHome Verified Agent Identity. Soulbound to ${agentAddress.slice(0, 8)}...${agentAddress.slice(-4)}. Skills: ${skillsList}.`;

  const agentPubkey = pubkeyFromAddress(agentAddress);

  // V2: Mint to soulbound contract with EIP-4 metadata in R4-R6, agent key in R7
  const nameBytes = new TextEncoder().encode(tokenName);
  const descBytes = new TextEncoder().encode(tokenDescription);
  const decimalsBytes = new TextEncoder().encode('0');

  const tokenOutput = new OutputBuilder(MIN_BOX_VALUE, SOULBOUND_CONTRACT_ADDRESS)
    .mintToken({
      amount: '1',
      name: tokenName,
      decimals: 0,
      description: tokenDescription,
    })
    .setAdditionalRegisters({
      R4: SConstant(SColl(SByte, nameBytes)),          // EIP-4: token name
      R5: SConstant(SColl(SByte, descBytes)),           // EIP-4: description
      R6: SConstant(SColl(SByte, decimalsBytes)),       // EIP-4: decimals
      R7: SConstant(SSigmaProp(SGroupElement(agentPubkey))),  // Soulbound: agent owner
    });

  const unsignedTx = new TransactionBuilder(currentHeight)
    .from(utxos)
    .to([tokenOutput])
    .sendChangeTo(agentAddress)
    .payFee(RECOMMENDED_TX_FEE)
    .build()
    .toEIP12Object();

  return unsignedTx;
}

// ─── Token Query Functions ───────────────────────────────────────────

/**
 * Check if an address has an agent identity token.
 * Checks both: direct address (legacy) and soulbound contract boxes.
 */
export async function getAgentIdentityToken(address: string): Promise<AgentIdentityToken | null> {
  try {
    // Check direct address (legacy mints)
    const balance = await getAddressBalance(address);
    const tokens = balance.confirmed.tokens || [];

    for (const token of tokens) {
      const name = token.name || '';
      if (name.startsWith(AGENT_TOKEN_PREFIX)) {
        let description = '';
        try {
          const info = await getTokenInfo(token.tokenId);
          description = info?.description || '';
        } catch { /* ignore */ }
        return { tokenId: token.tokenId, name, description, soulbound: false };
      }
    }

    // Check soulbound contract boxes
    const contractToken = await getContractIdentityToken(address);
    if (contractToken) return contractToken;

    return null;
  } catch (error) {
    console.error('Failed to fetch agent identity token:', error);
    return null;
  }
}

/**
 * Check soulbound contract for identity NFTs belonging to this agent.
 */
async function getContractIdentityToken(agentAddress: string): Promise<AgentIdentityToken | null> {
  try {
    const agentErgoTree = ErgoAddress.fromBase58(agentAddress).ergoTree;
    const pubkeyHex = agentErgoTree.startsWith('0008cd') ? agentErgoTree.slice(6) : '';
    if (!pubkeyHex) return null;

    // Check both V1 (R4=pubkey) and V2 (R7=pubkey) contract addresses
    const [v1Response, v2Response] = await Promise.all([
      fetch(`${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS_V1}?limit=100`).catch(() => null),
      fetch(`${ERGO_EXPLORER_API}/boxes/unspent/byAddress/${SOULBOUND_CONTRACT_ADDRESS}?limit=100`).catch(() => null),
    ]);

    const v1Data = v1Response?.ok ? await v1Response.json() : { items: [] };
    const v2Data = v2Response?.ok ? await v2Response.json() : { items: [] };

    const checkBoxes = (boxes: any[], registerKey: string) => {
      for (const box of (boxes || [])) {
        const reg = box.additionalRegisters?.[registerKey];
        if (!reg) continue;
        if (!reg.renderedValue?.includes(pubkeyHex) && !reg.serializedValue?.includes(pubkeyHex)) continue;
        for (const asset of (box.assets || [])) {
          if (asset.name?.startsWith(AGENT_TOKEN_PREFIX)) {
            return {
              tokenId: asset.tokenId,
              name: asset.name,
              description: `Soulbound Agent Identity NFT (contract-locked)`,
              soulbound: true,
            };
          }
        }
      }
      return null;
    };

    // Check V2 first (preferred), then V1
    const v2Result = checkBoxes(v2Data.items || v2Data || [], 'R7');
    if (v2Result) return v2Result;
    return checkBoxes(v1Data.items || v1Data || [], 'R4');
  } catch {
    return null;
  }
}

/**
 * Search for all agent identity tokens via Explorer API.
 */
export async function searchAgentIdentityTokens(): Promise<Array<{
  tokenId: string;
  name: string;
  description: string;
  ownerAddress: string;
}>> {
  try {
    const response = await fetch(`${ERGO_EXPLORER_API}/tokens/search?query=AIH-AGENT-&limit=50`);
    if (!response.ok) return [];
    const data = await response.json();
    const items = data.items || data || [];

    return items
      .filter((t: any) => t.name?.startsWith(AGENT_TOKEN_PREFIX))
      .map((t: any) => ({
        tokenId: t.id,
        name: t.name,
        description: t.description || '',
        ownerAddress: '',
      }));
  } catch {
    return [];
  }
}

// ─── Utilities ───────────────────────────────────────────────────────

export function agentIdentityExplorerUrl(tokenId: string): string {
  return `${ERGO_EXPLORER_UI}/en/token/${tokenId}`;
}

export { AGENT_TOKEN_PREFIX };
