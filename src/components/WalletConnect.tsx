'use client';

import { useState } from 'react';

export default function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [address] = useState('9f4QF8AD1nQ3nJahQVkM...7Hk2');

  if (connected) {
    return (
      <button onClick={() => setConnected(false)}
        className="px-4 py-2 rounded-lg bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-sm font-medium hover:bg-[var(--accent-green)]/20 transition-all flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] animate-pulse" />
        <span className="font-mono text-xs">{address}</span>
      </button>
    );
  }

  return (
    <button onClick={() => setConnected(true)}
      className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all">
      Connect Wallet
    </button>
  );
}
