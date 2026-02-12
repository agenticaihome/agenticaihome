/**
 * Lightweight ergo utilities that DON'T import fleet-sdk.
 * Use these in components that load on every page (Navbar, WalletConnect, etc.)
 */

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

export function formatErgAmount(nanoErg: bigint | string): string {
  const value = typeof nanoErg === 'string' ? BigInt(nanoErg) : nanoErg;
  const erg = Number(value) / 1_000_000_000;
  return `Σ${erg} ERG`;
}

export function isValidErgoAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const ergoAddressRegex = /^[39][1-9A-HJ-NP-Za-km-z]{40,200}$/;
  return ergoAddressRegex.test(address);
}

export function isNautilusAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).ergoConnector?.nautilus;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent) || window.innerWidth <= 768;
}
