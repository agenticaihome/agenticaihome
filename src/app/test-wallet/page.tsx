'use client';

import { useState, useEffect } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { compileErgoScript, clearCompilationCache } from '@/lib/ergo/compiler';
import { ESCROW_ERGOSCRIPT, NETWORK, ERGO_EXPLORER_API, ERGO_EXPLORER_UI } from '@/lib/ergo/constants';
import { createEscrowTx, EscrowParams, validateEscrowParams } from '@/lib/ergo/escrow';
import { getUtxos, isWalletAvailable, isNautilusAvailable, isSafewAvailable } from '@/lib/ergo/wallet';
import { getCurrentHeight } from '@/lib/ergo/explorer';

interface DiagResult {
  label: string;
  status: 'pending' | 'ok' | 'warn' | 'error';
  detail: string;
}

export default function TestWalletPage() {
  const { wallet, connecting, error, connect, disconnect, isAvailable } = useWallet();
  const { hasNautilus, hasSafew } = useWalletInstallation();
  const [results, setResults] = useState<DiagResult[]>([]);
  const [utxos, setUtxos] = useState<any[] | null>(null);
  const [compileResult, setCompileResult] = useState<string | null>(null);
  const [escrowBuildResult, setEscrowBuildResult] = useState<string | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  // Run diagnostics
  const runDiagnostics = async () => {
    setRunning(true);
    const diag: DiagResult[] = [];

    // 1. Window check
    diag.push({
      label: 'Browser Environment',
      status: typeof window !== 'undefined' ? 'ok' : 'error',
      detail: typeof window !== 'undefined' ? 'window available' : 'SSR detected',
    });

    // 2. ergoConnector
    diag.push({
      label: 'ergoConnector',
      status: isWalletAvailable() ? 'ok' : 'error',
      detail: isWalletAvailable() ? 'window.ergoConnector found' : 'No wallet extension detected',
    });

    // 3. Nautilus
    diag.push({
      label: 'Nautilus Wallet',
      status: isNautilusAvailable() ? 'ok' : 'warn',
      detail: isNautilusAvailable() ? 'Available' : 'Not installed',
    });

    // 4. SAFEW
    diag.push({
      label: 'SAFEW Wallet',
      status: isSafewAvailable() ? 'ok' : 'warn',
      detail: isSafewAvailable() ? 'Available' : 'Not installed',
    });

    // 5. Network
    diag.push({
      label: 'App Network',
      status: 'ok',
      detail: `${NETWORK} — API: ${ERGO_EXPLORER_API}`,
    });

    // 6. Explorer API
    try {
      const height = await getCurrentHeight();
      setBlockHeight(height);
      diag.push({ label: 'Explorer API', status: 'ok', detail: `Current height: ${height.toLocaleString()}` });
    } catch (e) {
      diag.push({ label: 'Explorer API', status: 'error', detail: `Failed: ${(e as Error).message}` });
    }

    // 7. Wallet connection
    diag.push({
      label: 'Wallet Connection',
      status: wallet.connected ? 'ok' : 'warn',
      detail: wallet.connected ? `Connected via ${wallet.walletName}` : 'Not connected',
    });

    // 8. Address & balance
    if (wallet.connected && wallet.address) {
      diag.push({ label: 'Primary Address', status: 'ok', detail: wallet.address });
      diag.push({ label: 'ERG Balance', status: 'ok', detail: `${wallet.balance.erg} ERG` });
      diag.push({ label: 'Tokens', status: 'ok', detail: `${wallet.balance.tokens.length} token(s)` });

      // 9. UTXOs
      try {
        const boxes = await getUtxos();
        setUtxos(boxes);
        diag.push({ label: 'UTXOs', status: 'ok', detail: `${boxes.length} box(es)` });
      } catch (e) {
        diag.push({ label: 'UTXOs', status: 'error', detail: (e as Error).message });
      }
    }

    setResults(diag);
    setRunning(false);
  };

  // Test compiler
  const testCompile = async () => {
    setCompileResult('Compiling...');
    try {
      clearCompilationCache();
      const result = await compileErgoScript(ESCROW_ERGOSCRIPT);
      setCompileResult(`✅ P2S Address: ${result.address}\nErgoTree: ${result.ergoTree || 'N/A'}`);
    } catch (e) {
      setCompileResult(`❌ ${(e as Error).message}`);
    }
  };

  // Test escrow build (doesn't submit)
  const testEscrowBuild = async () => {
    if (!wallet.connected || !wallet.address) {
      setEscrowBuildResult('❌ Connect wallet first');
      return;
    }
    setEscrowBuildResult('Building...');
    try {
      const boxes = await getUtxos();
      const height = blockHeight || await getCurrentHeight();
      const params: EscrowParams = {
        clientAddress: wallet.address,
        agentAddress: '9gxmJ4attdDx1NnZL7tWkN2U9iwZbPWWSEcfcPHbJXc7xsLq6QK', // dummy
        amountNanoErg: 10000000n, // 0.01 ERG
        deadlineHeight: height + 720, // ~24h
        taskId: 'test-task-diagnostic',
      };

      const validation = validateEscrowParams(params);
      if (!validation.valid) {
        setEscrowBuildResult(`❌ Validation: ${validation.errors.join(', ')}`);
        return;
      }

      const unsignedTx = await createEscrowTx(params, boxes, wallet.address);
      setEscrowBuildResult(`✅ Transaction built successfully\nInputs: ${unsignedTx.inputs?.length}\nOutputs: ${unsignedTx.outputs?.length}\n\n${JSON.stringify(unsignedTx, null, 2).slice(0, 500)}...`);
    } catch (e) {
      setEscrowBuildResult(`❌ ${(e as Error).message}`);
    }
  };

  const STATUS_COLORS = { ok: 'text-green-400', warn: 'text-amber-400', error: 'text-red-400', pending: 'text-gray-400' };
  const STATUS_ICONS = { ok: '✅', warn: '⚠️', error: '❌', pending: '⏳' };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">🔧 Wallet Diagnostics</h1>
      <p className="text-[var(--text-secondary)] mb-8">Developer tool for debugging Ergo wallet integration.</p>

      {/* Connection controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">Connection</h2>
        <div className="flex flex-wrap gap-2">
          {!wallet.connected ? (
            <>
              {hasNautilus && (
                <button onClick={() => connect('nautilus')} disabled={connecting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  Connect Nautilus
                </button>
              )}
              {hasSafew && (
                <button onClick={() => connect('safew')} disabled={connecting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  Connect SAFEW
                </button>
              )}
              {!hasNautilus && !hasSafew && (
                <span className="text-sm text-[var(--text-secondary)]">No wallets detected</span>
              )}
            </>
          ) : (
            <button onClick={disconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              Disconnect ({wallet.walletName})
            </button>
          )}
          <button onClick={runDiagnostics} disabled={running}
            className="px-4 py-2 bg-[var(--accent-cyan)] text-black rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {running ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* Diagnostic results */}
      {results.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">Diagnostic Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{STATUS_ICONS[r.status]}</span>
                <span className="font-medium text-[var(--text-primary)] w-40 flex-shrink-0">{r.label}</span>
                <span className={`${STATUS_COLORS[r.status]} font-mono text-xs break-all`}>{r.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UTXOs */}
      {utxos && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">UTXOs ({utxos.length})</h2>
          <div className="max-h-64 overflow-auto text-xs font-mono text-[var(--text-secondary)] bg-black/20 rounded-lg p-3">
            {utxos.map((u: any, i: number) => (
              <div key={i} className="mb-2 pb-2 border-b border-[var(--border)] last:border-0">
                <div>Box: {u.boxId?.slice(0, 16)}...</div>
                <div>Value: {u.value} nanoERG</div>
                {u.assets?.length > 0 && <div>Assets: {u.assets.length}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compiler test */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">ErgoScript Compiler</h2>
        <button onClick={testCompile}
          className="px-4 py-2 bg-[var(--accent-cyan)] text-black rounded-lg text-sm font-medium hover:opacity-90 mb-3">
          Test Compile Escrow Contract
        </button>
        {compileResult && (
          <pre className="text-xs font-mono text-[var(--text-secondary)] bg-black/20 rounded-lg p-3 whitespace-pre-wrap break-all">
            {compileResult}
          </pre>
        )}
      </div>

      {/* Escrow build test */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">Escrow Transaction Builder</h2>
        <p className="text-xs text-[var(--text-secondary)] mb-3">Builds a dummy 0.01 ERG escrow transaction (does NOT submit).</p>
        <button onClick={testEscrowBuild} disabled={!wallet.connected}
          className="px-4 py-2 bg-[var(--accent-cyan)] text-black rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-30 mb-3">
          Build Test Escrow Tx
        </button>
        {escrowBuildResult && (
          <pre className="text-xs font-mono text-[var(--text-secondary)] bg-black/20 rounded-lg p-3 whitespace-pre-wrap break-all max-h-64 overflow-auto">
            {escrowBuildResult}
          </pre>
        )}
      </div>

      {/* Network info */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">Network Info</h2>
        <div className="text-sm space-y-1 text-[var(--text-secondary)]">
          <div><strong>Network:</strong> {NETWORK}</div>
          <div><strong>Explorer API:</strong> <a href={ERGO_EXPLORER_API} target="_blank" className="text-[var(--accent-cyan)] hover:underline">{ERGO_EXPLORER_API}</a></div>
          <div><strong>Explorer UI:</strong> <a href={ERGO_EXPLORER_UI} target="_blank" className="text-[var(--accent-cyan)] hover:underline">{ERGO_EXPLORER_UI}</a></div>
          {blockHeight && <div><strong>Block Height:</strong> {blockHeight.toLocaleString()}</div>}
        </div>
      </div>
    </div>
  );
}
