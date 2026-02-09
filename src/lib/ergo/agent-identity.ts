import {
  TransactionBuilder,
  OutputBuilder,
} from '@fleet-sdk/core';
import { getCurrentHeight, getAddressBalance, getTokenInfo } from './explorer';
import { MIN_BOX_VALUE, RECOMMENDED_TX_FEE, ERGO_EXPLORER_API, ERGO_EXPLORER_UI } from './constants';

// ─── Constants ───────────────────────────────────────────────────────

const AGENT_TOKEN_PREFIX = 'AIH-AGENT-';

// ─── Types ───────────────────────────────────────────────────────────

export interface AgentIdentityToken {
  tokenId: string;
  name: string;
  description: string;
}

export interface AgentIdentityMintParams {
  agentName: string;
  agentAddress: string;
  skills: string[];
  description: string;
  utxos: any[];
  currentHeight: number;
}

// ─── Token Minting ──────────────────────────────────────────────────

/**
 * Build a mint transaction for an Agent Identity NFT.
 * Creates a unique token (amount: 1) that proves on-chain agent identity.
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
  const tokenDescription = `AgenticAiHome Verified Agent Identity. Registered by ${agentAddress}. Skills: ${skillsList}.`;

  const tokenOutput = new OutputBuilder(MIN_BOX_VALUE, agentAddress)
    .mintToken({
      amount: '1',
      name: tokenName,
      decimals: 0,
      description: tokenDescription,
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
 * Returns the first AIH-AGENT- token found, or null.
 */
export async function getAgentIdentityToken(address: string): Promise<AgentIdentityToken | null> {
  try {
    const balance = await getAddressBalance(address);
    const tokens = balance.confirmed.tokens || [];

    for (const token of tokens) {
      const name = token.name || '';
      if (name.startsWith(AGENT_TOKEN_PREFIX)) {
        let description = '';
        try {
          const info = await getTokenInfo(token.tokenId);
          description = info?.description || '';
        } catch {
          // ignore
        }
        return { tokenId: token.tokenId, name, description };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch agent identity token:', error);
    return null;
  }
}

/**
 * Search for all agent identity tokens via Explorer API.
 * Note: Ergo Explorer doesn't have a token search by prefix,
 * so this uses a search endpoint with best-effort matching.
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
        ownerAddress: '', // Explorer token search doesn't return current holder
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
