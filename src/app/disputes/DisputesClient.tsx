'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/lib/supabase';
import { PLATFORM_FEE_ADDRESS } from '@/lib/ergo/constants';
import Navbar from '@/components/Navbar';

type FilterStatus = 'all' | 'open' | 'mediation' | 'resolved';

interface DisputeRow {
  id: string;
  taskId: string;
  taskTitle: string;
  status: string;
  posterAddress: string;
  agentAddress: string;
  mediatorAddress: string | null;
  originalAmount: number;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_BADGES: Record<string, { label: string; icon: string; cls: string }> = {
  open: { label: 'Open', icon: '🔴', cls: 'bg-red-500/20 text-red-400' },
  mediation: { label: 'Under Review', icon: '🟡', cls: 'bg-yellow-500/20 text-yellow-400' },
  resolved: { label: 'Resolved', icon: '🟢', cls: 'bg-green-500/20 text-green-400' },
  refunded: { label: 'Refunded', icon: '🟢', cls: 'bg-green-500/20 text-green-400' },
  expired: { label: 'Dismissed', icon: '⚪', cls: 'bg-gray-500/20 text-gray-400' },
};

export default function DisputesClient() {
  const { userAddress } = useWallet();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const isMediator = userAddress === PLATFORM_FEE_ADDRESS;

  useEffect(() => {
    loadDisputes();
  }, [userAddress]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      // Load disputes with task titles
      let query = supabase
        .from('disputes')
        .select('*, tasks!inner(title)')
        .order('created_at', { ascending: false });

      // If not mediator, only show user's disputes
      if (userAddress && !isMediator) {
        query = query.or(`poster_address.eq.${userAddress},agent_address.eq.${userAddress},mediator_address.eq.${userAddress}`);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback: load without join if tasks relation fails
        const { data: fallback } = await supabase
          .from('disputes')
          .select('*')
          .order('created_at', { ascending: false });
        if (fallback) {
          setDisputes(fallback.map((d: any) => ({
            id: d.id,
            taskId: d.task_id,
            taskTitle: 'Task ' + (d.task_id?.slice(0, 8) || ''),
            status: d.status,
            posterAddress: d.poster_address,
            agentAddress: d.agent_address,
            mediatorAddress: d.mediator_address,
            originalAmount: d.original_amount || 0,
            createdAt: d.created_at,
            resolvedAt: d.resolved_at,
          })));
        }
        return;
      }

      if (data) {
        setDisputes(data.map((d: any) => ({
          id: d.id,
          taskId: d.task_id,
          taskTitle: d.tasks?.title || 'Unknown Task',
          status: d.status,
          posterAddress: d.poster_address,
          agentAddress: d.agent_address,
          mediatorAddress: d.mediator_address,
          originalAmount: d.original_amount || 0,
          createdAt: d.created_at,
          resolvedAt: d.resolved_at,
        })));
      }
    } catch (err) {
      console.error('Error loading disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = disputes.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'open') return d.status === 'open';
    if (filter === 'mediation') return d.status === 'mediation';
    if (filter === 'resolved') return ['resolved', 'refunded'].includes(d.status);
    return true;
  });

  const truncAddr = (a: string) => a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '—';
  const nanoToErg = (n: number) => (n / 1e9).toFixed(2);
  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">⚖️ Dispute Resolution</h1>
            <p className="text-gray-400 mt-1">
              {isMediator ? 'Review and resolve disputes as mediator' : 'Your active and past disputes'}
            </p>
          </div>
          {isMediator && (
            <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
              👨‍⚖️ Mediator View
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'open', 'mediation', 'resolved'] as FilterStatus[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {f === 'all' ? 'All' : f === 'mediation' ? '🟡 Under Review' : f === 'open' ? '🔴 Open' : '🟢 Resolved'}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({disputes.filter(d => {
                    if (f === 'open') return d.status === 'open';
                    if (f === 'mediation') return d.status === 'mediation';
                    if (f === 'resolved') return ['resolved', 'refunded'].includes(d.status);
                    return false;
                  }).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Disputes List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-4">⚖️</div>
            <p className="text-lg">No disputes found</p>
            <p className="text-sm mt-1">Disputes will appear here when opened on tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => {
              const badge = STATUS_BADGES[d.status] || STATUS_BADGES.open;
              return (
                <Link key={d.id} href={`/disputes/detail?id=${d.id}`}
                  className="block border border-gray-800 rounded-lg p-5 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-700 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.icon} {badge.label}
                        </span>
                        <h3 className="text-white font-semibold truncate">{d.taskTitle}</h3>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400">
                        <span>Client: {truncAddr(d.posterAddress)}</span>
                        <span>Agent: {truncAddr(d.agentAddress)}</span>
                        {d.mediatorAddress && <span>Mediator: {d.mediatorAddress === PLATFORM_FEE_ADDRESS ? 'Platform' : truncAddr(d.mediatorAddress)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-white font-semibold">{nanoToErg(d.originalAmount)} ERG</div>
                        <div className="text-gray-500">in escrow</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400">{timeAgo(d.createdAt)}</div>
                      </div>
                      <span className="text-gray-600">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
