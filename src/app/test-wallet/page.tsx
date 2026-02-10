'use client';

import { useState, useEffect } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { compileErgoScript, clearCompilationCache } from '@/lib/ergo/compiler';
import { 
  ESCROW_ERGOSCRIPT, 
  NETWORK, 
  ERGO_EXPLORER_API, 
  ERGO_EXPLORER_UI,
  ESCROW_CONTRACT_ADDRESS,
  PLATFORM_FEE_ADDRESS,
  REPUTATION_ORACLE_CONTRACT_ADDRESS,
  MULTISIG_ESCROW_CONTRACT_ADDRESS,
  MILESTONE_ESCROW_CONTRACT_ADDRESS
} from '@/lib/ergo/constants';
import { createEscrowTx, EscrowParams, validateEscrowParams } from '@/lib/ergo/escrow';
import { getUtxos, isWalletAvailable, isNautilusAvailable, isSafewAvailable } from '@/lib/ergo/wallet';
import { getCurrentHeight, getBoxesByAddress } from '@/lib/ergo/explorer';
import { supabase } from '@/lib/supabase';
import { 
  getAgents, 
  getTasks, 
  getBids, 
  getTransactions, 
  getCompletions,
  getReputationEvents,
  getWalletProfiles
} from '@/lib/supabaseStore';

interface DiagResult {
  label: string;
  status: 'pending' | 'ok' | 'warn' | 'error';
  detail: string;
}

interface SystemHealth {
  walletConnection: DiagResult[];
  supabaseHealth: DiagResult[];
  explorerHealth: DiagResult[];
  contractVerification: DiagResult[];
}

interface TableCounts {
  agents: number;
  tasks: number;
  bids: number;
  transactions: number;
  completions: number;
  reputation_events: number;
  wallet_profiles: number;
}

export default function TestWalletPage() {
  const { wallet, connecting, error, connect, disconnect, isAvailable } = useWallet();
  const { hasNautilus, hasSafew } = useWalletInstallation();
  const [results, setResults] = useState<DiagResult[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [tableCounts, setTableCounts] = useState<TableCounts | null>(null);
  const [utxos, setUtxos] = useState<any[] | null>(null);
  const [compileResult, setCompileResult] = useState<string | null>(null);
  const [escrowBuildResult, setEscrowBuildResult] = useState<string | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [healthRunning, setHealthRunning] = useState(false);

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

  // Comprehensive system health check
  const runSystemHealthCheck = async () => {
    setHealthRunning(true);
    
    const health: SystemHealth = {
      walletConnection: [],
      supabaseHealth: [],
      explorerHealth: [],
      contractVerification: []
    };

    // === WALLET CONNECTION TESTS ===
    health.walletConnection.push({
      label: 'Browser Environment',
      status: typeof window !== 'undefined' ? 'ok' : 'error',
      detail: typeof window !== 'undefined' ? 'Client-side environment available' : 'Server-side rendering detected',
    });

    health.walletConnection.push({
      label: 'Wallet Extensions',
      status: isWalletAvailable() ? 'ok' : 'error',
      detail: isWalletAvailable() ? `Extensions: ${[hasNautilus && 'Nautilus', hasSafew && 'SAFEW'].filter(Boolean).join(', ') || 'Unknown'}` : 'No wallet extensions detected',
    });

    if (wallet.connected) {
      health.walletConnection.push({
        label: 'Wallet Status',
        status: 'ok',
        detail: `Connected via ${wallet.walletName} | ${wallet.address}`
      });
      
      health.walletConnection.push({
        label: 'ERG Balance',
        status: parseFloat(wallet.balance.erg) > 0 ? 'ok' : 'warn',
        detail: `${wallet.balance.erg} ERG | ${wallet.balance.tokens.length} token(s)`
      });

      try {
        const boxes = await getUtxos();
        health.walletConnection.push({
          label: 'UTXOs Available',
          status: boxes.length > 0 ? 'ok' : 'warn',
          detail: `${boxes.length} unspent box(es) | Total: ${boxes.reduce((sum, b) => sum + Number(b.value), 0) / 1e9} ERG`
        });
      } catch (e) {
        health.walletConnection.push({
          label: 'UTXO Fetch',
          status: 'error',
          detail: `Failed: ${(e as Error).message}`
        });
      }
    } else {
      health.walletConnection.push({
        label: 'Wallet Status',
        status: 'warn',
        detail: 'Not connected - some tests will be skipped'
      });
    }

    // === SUPABASE CONNECTION TESTS ===
    const supabaseStart = performance.now();
    try {
      const { data: statusData, error: statusError } = await supabase.from('agents').select('id').limit(1);
      const supabaseLatency = Math.round(performance.now() - supabaseStart);
      
      health.supabaseHealth.push({
        label: 'Database Connection',
        status: statusError ? 'error' : 'ok',
        detail: statusError ? `Failed: ${statusError.message}` : `Connected in ${supabaseLatency}ms`
      });

      if (!statusError) {
        // Count records in all tables
        try {
          const [agents, tasks, bids, transactions, completions, reputationEvents, walletProfiles] = await Promise.all([
            getAgents(),
            getTasks(), 
            getBids(),
            getTransactions(),
            getCompletions(),
            getReputationEvents(),
            getWalletProfiles()
          ]);

          const counts: TableCounts = {
            agents: agents.length,
            tasks: tasks.length,
            bids: bids.length,
            transactions: transactions.length,
            completions: completions.length,
            reputation_events: reputationEvents.length,
            wallet_profiles: walletProfiles.length
          };
          setTableCounts(counts);

          health.supabaseHealth.push({
            label: 'Table Record Counts',
            status: 'ok',
            detail: `Agents: ${counts.agents}, Tasks: ${counts.tasks}, Bids: ${counts.bids}, TXs: ${counts.transactions}, Completions: ${counts.completions}, Rep Events: ${counts.reputation_events}, Wallet Profiles: ${counts.wallet_profiles}`
          });
        } catch (e) {
          health.supabaseHealth.push({
            label: 'Table Access',
            status: 'error',
            detail: `Failed to fetch data: ${(e as Error).message}`
          });
        }

        // Test RLS by attempting to read protected columns
        try {
          const { data: rlsTest, error: rlsError } = await supabase
            .from('agents')
            .select('ego_score')
            .limit(1);
          
          health.supabaseHealth.push({
            label: 'Row Level Security (RLS)',
            status: rlsError ? 'ok' : 'warn',
            detail: rlsError ? `Protected columns blocked: ${rlsError.message}` : 'RLS may not be properly configured - protected columns accessible'
          });
        } catch (e) {
          health.supabaseHealth.push({
            label: 'RLS Test',
            status: 'error',
            detail: `RLS test failed: ${(e as Error).message}`
          });
        }
      }
    } catch (e) {
      health.supabaseHealth.push({
        label: 'Database Connection',
        status: 'error',
        detail: `Connection failed: ${(e as Error).message}`
      });
    }

    // === ERGO EXPLORER API TESTS ===
    const explorerStart = performance.now();
    try {
      const height = await getCurrentHeight();
      const explorerLatency = Math.round(performance.now() - explorerStart);
      setBlockHeight(height);
      
      health.explorerHealth.push({
        label: 'Explorer API Connection',
        status: 'ok',
        detail: `Connected to ${ERGO_EXPLORER_API} in ${explorerLatency}ms`
      });

      health.explorerHealth.push({
        label: 'Current Block Height',
        status: height > 0 ? 'ok' : 'error',
        detail: `Block #${height.toLocaleString()} | Network: ${NETWORK}`
      });

      // Check escrow contract address for boxes
      try {
        const escrowBoxes = await getBoxesByAddress(ESCROW_CONTRACT_ADDRESS);
        health.explorerHealth.push({
          label: 'Escrow Contract Status',
          status: escrowBoxes.length >= 0 ? 'ok' : 'warn',
          detail: `${escrowBoxes.length} box(es) at escrow contract | ${ESCROW_CONTRACT_ADDRESS.slice(0, 20)}...`
        });
      } catch (e) {
        health.explorerHealth.push({
          label: 'Escrow Contract Check',
          status: 'error',
          detail: `Failed to check boxes: ${(e as Error).message}`
        });
      }

      // Check platform fee address
      try {
        const platformBoxes = await getBoxesByAddress(PLATFORM_FEE_ADDRESS);
        health.explorerHealth.push({
          label: 'Platform Fee Address',
          status: 'ok',
          detail: `${platformBoxes.length} box(es) at platform address | ${PLATFORM_FEE_ADDRESS.slice(0, 20)}...`
        });
      } catch (e) {
        health.explorerHealth.push({
          label: 'Platform Fee Address',
          status: 'warn',
          detail: `Check failed: ${(e as Error).message}`
        });
      }
    } catch (e) {
      health.explorerHealth.push({
        label: 'Explorer API Connection',
        status: 'error',
        detail: `Failed: ${(e as Error).message}`
      });
    }

    // === CONTRACT VERIFICATION TESTS ===
    const contracts = [
      { name: 'Escrow Contract', address: ESCROW_CONTRACT_ADDRESS },
      { name: 'Platform Fee Address', address: PLATFORM_FEE_ADDRESS },
      { name: 'Reputation Oracle', address: REPUTATION_ORACLE_CONTRACT_ADDRESS },
      { name: 'Multi-Sig Escrow', address: MULTISIG_ESCROW_CONTRACT_ADDRESS },
      { name: 'Milestone Escrow', address: MILESTONE_ESCROW_CONTRACT_ADDRESS }
    ];

    for (const contract of contracts) {
      // Validate Ergo address format
      const isValidAddress = contract.address && 
        contract.address !== 'NEEDS_COMPILATION' && 
        contract.address.length >= 30 && 
        contract.address.length <= 120 && 
        /^[1-9A-HJ-NP-Za-km-z]+$/.test(contract.address);

      if (contract.address === 'NEEDS_COMPILATION') {
        health.contractVerification.push({
          label: contract.name,
          status: 'warn',
          detail: 'Contract not yet compiled - needs deployment'
        });
        continue;
      }

      if (!isValidAddress) {
        health.contractVerification.push({
          label: contract.name,
          status: 'error',
          detail: 'Invalid Ergo address format'
        });
        continue;
      }

      // Check for boxes at contract address
      try {
        const boxes = await getBoxesByAddress(contract.address);
        health.contractVerification.push({
          label: contract.name,
          status: 'ok',
          detail: `Valid address | ${boxes.length} box(es) | ${contract.address.slice(0, 20)}...`
        });
      } catch (e) {
        health.contractVerification.push({
          label: contract.name,
          status: 'warn',
          detail: `Valid address but box check failed: ${(e as Error).message.slice(0, 50)}`
        });
      }
    }

    setSystemHealth(health);
    setHealthRunning(false);
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

  // Calculate overall system health score
  const getOverallHealth = () => {
    if (!systemHealth) return { score: 0, status: 'unknown', message: 'No health check run yet' };
    
    const allResults = [
      ...systemHealth.walletConnection,
      ...systemHealth.supabaseHealth,
      ...systemHealth.explorerHealth,
      ...systemHealth.contractVerification
    ];
    
    const total = allResults.length;
    const ok = allResults.filter(r => r.status === 'ok').length;
    const warn = allResults.filter(r => r.status === 'warn').length;
    const error = allResults.filter(r => r.status === 'error').length;
    
    const score = Math.round((ok + warn * 0.5) / total * 100);
    
    if (error > 0) return { score, status: 'error', message: `${error} critical failure(s) detected` };
    if (warn > 0) return { score, status: 'warn', message: `${warn} warning(s) - system partially operational` };
    return { score, status: 'ok', message: 'All systems operational' };
  };

  const STATUS_COLORS = { ok: 'text-green-400', warn: 'text-amber-400', error: 'text-red-400', pending: 'text-gray-400' };
  const STATUS_ICONS = { ok: '✅', warn: '⚠️', error: '❌', pending: '⏳' };
  const overallHealth = getOverallHealth();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">🔧 System Health & Validation</h1>
      <p className="text-[var(--text-secondary)] mb-8">Comprehensive testing and validation dashboard for AgenticAiHome platform.</p>

      {/* System Status Summary */}
      {systemHealth && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">🎯 System Status Summary</h2>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {overallHealth.status === 'ok' ? '✅' : overallHealth.status === 'warn' ? '⚠️' : '❌'}
              </div>
              <div>
                <div className="text-lg font-semibold text-[var(--text-primary)]">
                  Health Score: {overallHealth.score}%
                </div>
                <div className={`text-sm ${STATUS_COLORS[overallHealth.status as keyof typeof STATUS_COLORS]}`}>
                  {overallHealth.message}
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-[var(--text-secondary)]">
              <div>Network: {NETWORK.toUpperCase()}</div>
              <div>Block: #{blockHeight?.toLocaleString() || 'Unknown'}</div>
            </div>
          </div>
          
          {/* Quick status indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span>{systemHealth.walletConnection.some(r => r.status === 'ok') ? '✅' : '❌'}</span>
              <span>Wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{systemHealth.supabaseHealth.some(r => r.status === 'ok') ? '✅' : '❌'}</span>
              <span>Database</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{systemHealth.explorerHealth.some(r => r.status === 'ok') ? '✅' : '❌'}</span>
              <span>Explorer API</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{systemHealth.contractVerification.some(r => r.status === 'ok') ? '✅' : '❌'}</span>
              <span>Contracts</span>
            </div>
          </div>
        </div>
      )}

      {/* Connection controls */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">🔗 Connection & Testing</h2>
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
            {running ? 'Running...' : 'Basic Diagnostics'}
          </button>
          <button onClick={runSystemHealthCheck} disabled={healthRunning}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {healthRunning ? 'Checking...' : 'Full System Health Check'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* System Health Details */}
      {systemHealth && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Wallet Connection Test */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              💰 Wallet Connection Test
            </h3>
            <div className="space-y-2 text-sm">
              {systemHealth.walletConnection.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">{STATUS_ICONS[r.status]}</span>
                  <span className="font-medium text-[var(--text-primary)] w-28 flex-shrink-0">{r.label}:</span>
                  <span className={`${STATUS_COLORS[r.status as keyof typeof STATUS_COLORS]} font-mono text-xs break-all`}>{r.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supabase Connection Test */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              🗄️ Supabase Connection Test
            </h3>
            <div className="space-y-2 text-sm">
              {systemHealth.supabaseHealth.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">{STATUS_ICONS[r.status]}</span>
                  <span className="font-medium text-[var(--text-primary)] w-28 flex-shrink-0">{r.label}:</span>
                  <span className={`${STATUS_COLORS[r.status as keyof typeof STATUS_COLORS]} font-mono text-xs break-all`}>{r.detail}</span>
                </div>
              ))}
            </div>
            {tableCounts && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="text-xs text-[var(--text-secondary)] grid grid-cols-2 gap-1">
                  <div>Agents: {tableCounts.agents}</div>
                  <div>Tasks: {tableCounts.tasks}</div>
                  <div>Bids: {tableCounts.bids}</div>
                  <div>Transactions: {tableCounts.transactions}</div>
                  <div>Completions: {tableCounts.completions}</div>
                  <div>Reputation Events: {tableCounts.reputation_events}</div>
                </div>
              </div>
            )}
          </div>

          {/* Ergo Explorer API Test */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              🔍 Ergo Explorer API Test
            </h3>
            <div className="space-y-2 text-sm">
              {systemHealth.explorerHealth.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">{STATUS_ICONS[r.status]}</span>
                  <span className="font-medium text-[var(--text-primary)] w-28 flex-shrink-0">{r.label}:</span>
                  <span className={`${STATUS_COLORS[r.status as keyof typeof STATUS_COLORS]} font-mono text-xs break-all`}>{r.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Verification */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
            <h3 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              📜 Contract Verification
            </h3>
            <div className="space-y-2 text-sm">
              {systemHealth.contractVerification.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">{STATUS_ICONS[r.status]}</span>
                  <span className="font-medium text-[var(--text-primary)] w-28 flex-shrink-0">{r.label}:</span>
                  <span className={`${STATUS_COLORS[r.status as keyof typeof STATUS_COLORS]} font-mono text-xs break-all`}>{r.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legacy Diagnostic results */}
      {results.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-[var(--text-primary)] mb-3">📋 Basic Diagnostic Results</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{STATUS_ICONS[r.status]}</span>
                <span className="font-medium text-[var(--text-primary)] w-40 flex-shrink-0">{r.label}</span>
                <span className={`${STATUS_COLORS[r.status as keyof typeof STATUS_COLORS]} font-mono text-xs break-all`}>{r.detail}</span>
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

      {/* Network & Configuration Info */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">🌐 Network Configuration</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1 text-[var(--text-secondary)]">
            <div><strong>Network:</strong> {NETWORK.toUpperCase()}</div>
            <div><strong>Block Height:</strong> {blockHeight?.toLocaleString() || 'Unknown'}</div>
            <div><strong>Platform Fee:</strong> 1% to treasury</div>
            <div><strong>Min Box Value:</strong> 0.001 ERG</div>
          </div>
          <div className="space-y-1 text-[var(--text-secondary)]">
            <div><strong>Explorer API:</strong> <a href={ERGO_EXPLORER_API} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline break-all">{ERGO_EXPLORER_API}</a></div>
            <div><strong>Explorer UI:</strong> <a href={ERGO_EXPLORER_UI} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline break-all">{ERGO_EXPLORER_UI}</a></div>
            <div><strong>Treasury:</strong> <span className="font-mono text-xs">{PLATFORM_FEE_ADDRESS.slice(0, 20)}...</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
