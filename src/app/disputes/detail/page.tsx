'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { PLATFORM_FEE_ADDRESS } from '@/lib/ergo/constants';
import { resolveMultiSigDispute } from '@/lib/ergo/multisig-escrow';
import { resolveDisputeTx } from '@/lib/ergo/dispute';
import { connectWallet, getUtxos, getAddress, signTransaction, submitTransaction } from '@/lib/ergo/wallet';
import DisputeEvidence from '@/components/DisputeEvidence';
import DisputeMessages from '@/components/DisputeMessages';
import Navbar from '@/components/Navbar';
import { BarChart3, Bot, Check, ClipboardList, Coins, User } from 'lucide-react';

interface DisputeDetail {
  id: string;
  taskId: string;
  taskTitle: string;
  reason: string;
  status: string;
  posterAddress: string;
  agentAddress: string;
  mediatorAddress: string | null;
  originalAmount: number;
  proposedPosterPercent: number | null;
  proposedAgentPercent: number | null;
  mediationDeadline: number;
  disputeBoxId: string | null;
  resolutionTxId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  escrowType: string;
}

interface EvidenceItem {
  id: string;
  taskId: string;
  submitterAddress: string;
  submitterRole: 'creator' | 'agent';
  evidenceText: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; icon: string; cls: string }> = {
  open: { label: 'Open', icon: '●', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  mediation: { label: 'Under Review', icon: '🟡', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  resolved: { label: 'Resolved', icon: '🟢', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  refunded: { label: 'Refunded', icon: '🟢', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  expired: { label: 'Dismissed', icon: '○', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export default function DisputeDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" /></div>}>
      <DisputeDetailInner />
    </Suspense>
  );
}

function DisputeDetailInner() {
  const searchParams = useSearchParams();
  const disputeId = searchParams?.get('id');
  const { userAddress } = useWallet();
  const { success: showSuccess, error: showError } = useToast();

  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);

  const isMediator = userAddress && dispute?.mediatorAddress && userAddress === dispute.mediatorAddress;
  const isClient = userAddress && dispute?.posterAddress === userAddress;
  const isAgent = userAddress && dispute?.agentAddress === userAddress;
  const userRole: 'creator' | 'agent' | 'mediator' = isMediator ? 'mediator' : isClient ? 'creator' : 'agent';
  const canResolve = isMediator && dispute && ['open', 'mediation'].includes(dispute.status);
  const nanoToErg = (n: number) => (n / 1e9).toFixed(2);

  const loadDispute = useCallback(async () => {
    if (!disputeId) return;
    try {
      const { data: d, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (error || !d) { setLoading(false); return; }

      let taskTitle = 'Unknown Task';
      let escrowType = 'simple';
      if (d.task_id) {
        const { data: task } = await supabase.from('tasks').select('title, escrow_type').eq('id', d.task_id).single();
        if (task) { taskTitle = task.title; escrowType = task.escrow_type || 'simple'; }
      }

      setDispute({
        id: d.id, taskId: d.task_id, taskTitle, reason: d.reason, status: d.status,
        posterAddress: d.poster_address, agentAddress: d.agent_address,
        mediatorAddress: d.mediator_address, originalAmount: d.original_amount || 0,
        proposedPosterPercent: d.proposed_poster_percent, proposedAgentPercent: d.proposed_agent_percent,
        mediationDeadline: d.mediation_deadline, disputeBoxId: d.dispute_box_id,
        resolutionTxId: d.resolution_tx_id, createdAt: d.created_at,
        resolvedAt: d.resolved_at, escrowType,
      });

      const { data: ev } = await supabase.from('dispute_evidence').select('*').eq('task_id', d.task_id).order('created_at', { ascending: true });
      if (ev) {
        setEvidence(ev.map((e: any) => ({
          id: e.id, taskId: e.task_id, submitterAddress: e.submitter_address,
          submitterRole: e.submitter_role, evidenceText: e.evidence_text,
          fileUrl: e.file_url, fileName: e.file_name, fileSize: e.file_size, createdAt: e.created_at,
        })));
      }
    } catch (err) {
      console.error('Error loading dispute:', err);
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => { loadDispute(); }, [loadDispute]);

  const handleResolve = async (resolution: 'agent' | 'client') => {
    if (!dispute || !canResolve) return;
    setResolving(true);
    try {
      const _walletState = await connectWallet('nautilus');
      const [utxos, changeAddress] = await Promise.all([getUtxos(), getAddress()]);
      let txId: string;

      if (dispute.escrowType === 'multisig' && dispute.disputeBoxId) {
        const unsignedTx = await resolveMultiSigDispute(dispute.disputeBoxId, resolution, userAddress!, utxos, changeAddress);
        const signedTx = await signTransaction(unsignedTx);
        txId = await submitTransaction(signedTx);
      } else if (dispute.disputeBoxId) {
        const posterPercent = resolution === 'client' ? 100 : 0;
        const agentPercent = resolution === 'agent' ? 100 : 0;
        const unsignedTx = await resolveDisputeTx(dispute.disputeBoxId, dispute.posterAddress, dispute.agentAddress, posterPercent, agentPercent, utxos, changeAddress);
        const signedTx = await signTransaction(unsignedTx);
        txId = await submitTransaction(signedTx);
      } else {
        txId = 'off-chain';
      }

      await supabase.from('disputes').update({
        status: 'resolved', resolution_tx_id: txId !== 'off-chain' ? txId : null,
        resolved_at: new Date().toISOString(),
        proposed_poster_percent: resolution === 'client' ? 100 : 0,
        proposed_agent_percent: resolution === 'agent' ? 100 : 0,
      }).eq('id', dispute.id);

      await supabase.from('tasks').update({ status: resolution === 'agent' ? 'completed' : 'cancelled' }).eq('id', dispute.taskId);
      await supabase.from('dispute_status').update({
        status: 'resolved', resolved_in_favor_of: resolution === 'agent' ? 'agent' : 'creator',
        resolution_notes: `Resolved by mediator in favor of ${resolution}. ${txId !== 'off-chain' ? `TX: ${txId}` : ''}`,
      }).eq('task_id', dispute.taskId);

      showSuccess(`Dispute resolved in favor of ${resolution}`);
      await loadDispute();
    } catch (err) {
      console.error('Resolution error:', err);
      showError(err instanceof Error ? err.message : 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  const handleSplit = async () => {
    if (!dispute || !canResolve) return;
    setResolving(true);
    try {
      const posterPercent = splitPercent;
      const agentPercent = 100 - splitPercent;

      if (dispute.disputeBoxId) {
        const _walletState = await connectWallet('nautilus');
        const [utxos, changeAddress] = await Promise.all([getUtxos(), getAddress()]);
        const unsignedTx = await resolveDisputeTx(dispute.disputeBoxId, dispute.posterAddress, dispute.agentAddress, posterPercent, agentPercent, utxos, changeAddress);
        const signedTx = await signTransaction(unsignedTx);
        const txId = await submitTransaction(signedTx);
        await supabase.from('disputes').update({ status: 'resolved', resolution_tx_id: txId, resolved_at: new Date().toISOString(), proposed_poster_percent: posterPercent, proposed_agent_percent: agentPercent }).eq('id', dispute.id);
      } else {
        await supabase.from('disputes').update({ status: 'resolved', resolved_at: new Date().toISOString(), proposed_poster_percent: posterPercent, proposed_agent_percent: agentPercent }).eq('id', dispute.id);
      }

      await supabase.from('dispute_status').update({ status: 'resolved', resolution_notes: `Split resolution: ${posterPercent}% client / ${agentPercent}% agent` }).eq('task_id', dispute.taskId);
      showSuccess(`Split resolution applied: ${posterPercent}% client / ${agentPercent}% agent`);
      setSplitMode(false);
      await loadDispute();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to apply split');
    } finally {
      setResolving(false);
    }
  };

  const handleRequestInfo = async (target: 'client' | 'agent') => {
    if (!dispute || !userAddress) return;
    try {
      await supabase.from('dispute_messages').insert([{
        dispute_id: dispute.id, author_address: userAddress, author_role: 'mediator',
        message: `<ClipboardList className="w-4 h-4 text-slate-400 inline" /> Mediator has requested additional information from the ${target}. Please provide more details about your case.`,
      }]);
      if (dispute.status === 'open') {
        await supabase.from('disputes').update({ status: 'mediation' }).eq('id', dispute.id);
      }
      showSuccess(`Information requested from ${target}`);
      await loadDispute();
    } catch { showError('Failed to send request'); }
  };

  const truncAddr = (a: string) => a ? `${a.slice(0, 8)}...${a.slice(-4)}` : '—';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Dispute Not Found</h1>
          <Link href="/disputes" className="text-blue-400 hover:text-blue-300">← Back to disputes</Link>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGES[dispute.status] || STATUS_BADGES.open;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/disputes" className="text-gray-400 hover:text-gray-300 text-sm">← Back to disputes</Link>
        </div>

        {/* Header */}
        <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.cls}`}>
                  {badge.icon} {badge.label}
                </span>
                {isMediator && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">👨‍⊖️ You are the mediator</span>}
              </div>
              <h1 className="text-2xl font-bold mb-1">{dispute.taskTitle}</h1>
              <p className="text-gray-400 text-sm">Dispute opened {new Date(dispute.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{nanoToErg(dispute.originalAmount)} ERG</div>
              <div className="text-gray-500 text-sm">in escrow</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-cyan-400 font-medium mb-1"><User className="w-4 h-4 text-slate-400 inline" /> Client</div>
              <div className="text-gray-300 font-mono text-xs">{truncAddr(dispute.posterAddress)}</div>
              {isClient && <span className="text-cyan-400 text-xs">(you)</span>}
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-green-400 font-medium mb-1"><Bot className="w-4 h-4 text-cyan-400 inline" /> Agent</div>
              <div className="text-gray-300 font-mono text-xs">{truncAddr(dispute.agentAddress)}</div>
              {isAgent && <span className="text-green-400 text-xs">(you)</span>}
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-yellow-400 font-medium mb-1">⊖️ Mediator</div>
              <div className="text-gray-300 font-mono text-xs">
                {dispute.mediatorAddress ? (dispute.mediatorAddress === PLATFORM_FEE_ADDRESS ? 'AgenticAiHome Platform' : truncAddr(dispute.mediatorAddress)) : 'Not assigned'}
              </div>
              {isMediator && <span className="text-yellow-400 text-xs">(you)</span>}
            </div>
          </div>

          {dispute.reason && (
            <div className="mt-4 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
              <div className="text-red-400 text-xs font-medium mb-1">Dispute Reason</div>
              <p className="text-gray-300 text-sm">{dispute.reason}</p>
            </div>
          )}
        </div>

        {/* Resolution Summary */}
        {dispute.status === 'resolved' && (
          <div className="border border-green-800 rounded-lg bg-green-900/10 p-6 mb-6">
            <h3 className="text-green-400 font-semibold text-lg mb-3"><Check className="w-4 h-4 text-emerald-400 inline" /> Resolution</h3>
            {dispute.proposedPosterPercent !== null && dispute.proposedAgentPercent !== null && (
              <div className="flex gap-4 mb-3">
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-cyan-400 text-sm">Client</div>
                  <div className="text-white text-xl font-bold">{dispute.proposedPosterPercent}%</div>
                  <div className="text-gray-500 text-xs">{nanoToErg(dispute.originalAmount * (dispute.proposedPosterPercent / 100))} ERG</div>
                </div>
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-green-400 text-sm">Agent</div>
                  <div className="text-white text-xl font-bold">{dispute.proposedAgentPercent}%</div>
                  <div className="text-gray-500 text-xs">{nanoToErg(dispute.originalAmount * (dispute.proposedAgentPercent / 100))} ERG</div>
                </div>
              </div>
            )}
            {dispute.resolutionTxId && (
              <a href={`https://explorer.ergoplatform.com/en/transactions/${dispute.resolutionTxId}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                View transaction on explorer →
              </a>
            )}
          </div>
        )}

        {/* Mediator Actions */}
        {canResolve && (
          <div className="border border-yellow-800 rounded-lg bg-yellow-900/10 p-6 mb-6">
            <h3 className="text-yellow-400 font-semibold text-lg mb-4">👨‍⊖️ Mediator Actions</h3>
            {!splitMode ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => handleResolve('agent')} disabled={resolving}
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50 text-left">
                    <div className="text-green-400 font-semibold"><Check className="w-4 h-4 text-emerald-400 inline" /> Release to Agent</div>
                    <div className="text-gray-400 text-sm mt-1">Agent completed the work. Release full escrow.</div>
                  </button>
                  <button onClick={() => handleResolve('client')} disabled={resolving}
                    className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 text-left">
                    <div className="text-red-400 font-semibold"><Coins className="w-4 h-4 text-yellow-400 inline" /> Refund to Client</div>
                    <div className="text-gray-400 text-sm mt-1">Work not satisfactory. Full refund to client.</div>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button onClick={() => setSplitMode(true)} disabled={resolving}
                    className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 text-left">
                    <div className="text-blue-400 font-semibold text-sm"><BarChart3 className="w-4 h-4 text-blue-400 inline" /> Propose Split</div>
                    <div className="text-gray-400 text-xs mt-1">Custom percentage split</div>
                  </button>
                  <button onClick={() => handleRequestInfo('client')} disabled={resolving}
                    className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg hover:bg-gray-500/20 transition-colors disabled:opacity-50 text-left">
                    <div className="text-gray-300 font-semibold text-sm"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> Request Info (Client)</div>
                  </button>
                  <button onClick={() => handleRequestInfo('agent')} disabled={resolving}
                    className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg hover:bg-gray-500/20 transition-colors disabled:opacity-50 text-left">
                    <div className="text-gray-300 font-semibold text-sm"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> Request Info (Agent)</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-gray-400 mb-2 block">Client: {splitPercent}%</label>
                    <input type="range" min={0} max={100} value={splitPercent}
                      onChange={e => setSplitPercent(Number(e.target.value))} className="w-full accent-blue-500" />
                    <label className="text-sm text-gray-400 mt-1 block">Agent: {100 - splitPercent}%</label>
                  </div>
                  <div className="text-center min-w-[100px]">
                    <div className="text-cyan-400 text-sm">{nanoToErg(dispute.originalAmount * splitPercent / 100)} ERG</div>
                    <div className="text-gray-600 text-xs">client</div>
                    <div className="text-green-400 text-sm">{nanoToErg(dispute.originalAmount * (100 - splitPercent) / 100)} ERG</div>
                    <div className="text-gray-600 text-xs">agent</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSplit} disabled={resolving}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                    {resolving ? 'Processing...' : 'Apply Split'}
                  </button>
                  <button onClick={() => setSplitMode(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {resolving && (
              <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400" />
                Building and signing transaction...
              </div>
            )}
          </div>
        )}

        {/* Evidence */}
        <div className="border border-gray-800 rounded-lg bg-gray-900/50 p-6 mb-6">
          <h3 className="text-white font-semibold text-lg mb-4"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> Evidence</h3>
          <DisputeEvidence
            taskId={dispute.taskId}
            disputeId={dispute.id}
            evidence={evidence}
            userRole={userRole}
            canSubmit={['open', 'mediation'].includes(dispute.status)}
            clientAddress={dispute.posterAddress}
            agentAddress={dispute.agentAddress}
            onEvidenceSubmitted={loadDispute}
          />
        </div>

        {/* Discussion */}
        <div className="mb-6">
          <DisputeMessages
            disputeId={dispute.id}
            clientAddress={dispute.posterAddress}
            agentAddress={dispute.agentAddress}
            mediatorAddress={dispute.mediatorAddress || undefined}
            userRole={userRole === 'creator' ? 'client' : userRole}
          />
        </div>

        <div className="text-center">
          <Link href={`/tasks/detail?id=${dispute.taskId}`} className="text-blue-400 hover:text-blue-300 text-sm">
            View original task →
          </Link>
        </div>
      </div>
    </div>
  );
}
