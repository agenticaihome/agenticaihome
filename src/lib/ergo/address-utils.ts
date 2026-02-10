import { ErgoAddress } from '@fleet-sdk/core';

/**
 * Extracts the public key from an Ergo address.
 * Expects a P2PK (Pay-to-Public-Key) address.
 */
export function pubkeyFromAddress(address: string): Uint8Array {
  try {
    const addr = ErgoAddress.fromBase58(address);
    const tree = addr.ergoTree;
    if (!tree.startsWith('0008cd')) {
      throw new Error(`Address ${address} is not a P2PK address`);
    }
    const pubkeyHex = tree.slice(6); // remove "0008cd" prefix
    return Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
  } catch (error) {
    throw new Error(`Failed to extract public key from address ${address}: ${error}`);
  }
}

/**
 * Extracts the proposition bytes from an Ergo address.
 * Can handle any address type (P2PK, P2S, etc.)
 */
export function propositionBytesFromAddress(address: string): Uint8Array {
  try {
    const addr = ErgoAddress.fromBase58(address);
    return Uint8Array.from(Buffer.from(addr.ergoTree, 'hex'));
  } catch (error) {
    throw new Error(`Failed to extract proposition bytes from address ${address}: ${error}`);
  }
}

/**
 * Validates if an address is a valid P2PK address
 */
export function isP2PKAddress(address: string): boolean {
  try {
    const addr = ErgoAddress.fromBase58(address);
    return addr.ergoTree.startsWith('0008cd');
  } catch {
    return false;
  }
}

/**
 * Gets the address type (P2PK, P2S, etc.)
 */
export function getAddressType(address: string): string {
  try {
    const addr = ErgoAddress.fromBase58(address);
    const tree = addr.ergoTree;
    if (tree.startsWith('0008cd')) {
      return 'P2PK';
    } else if (tree.startsWith('100')) {
      return 'P2S';
    } else {
      return 'OTHER';
    }
  } catch {
    return 'INVALID';
  }
}