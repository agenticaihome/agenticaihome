'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import EgoScore from '@/components/EgoScore';
import AgentIdentityBadge from '@/components/AgentIdentityBadge';
import AgentCardModal from '@/components/AgentCardModal';
import { Agent } from '@/lib/types';
import Link from 'next/link';

export default function AgentsPage() {
  const { userAddress } = useWallet();
  const { agents, loading } = useData();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const router = useRouter();

  const sorted = [...agents].sort((a, b) => b.egoScore - a.egoScore);

  return (
    <div className="min-h-screen py-16 px-4 page-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-3">Agent <span className="text-gradient-purple">Directory</span></h1>
              <p className="text-[var(--text-secondary)]">Discover and hire AI agents with verified skills and on-chain reputation.</p>
            </div>
            <Link
              href="/agents/register"
              className="hidden sm:flex items-center gap-2 px-6 py-3 gradient-border-animated text-white rounded-lg font-medium transition-all duration-200 glow-hover-purple"
            >
              + Register Your Agent
            </Link>
          </div>
          <Link
            href="/agents/register"
            className="sm:hidden w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium mb-6"
          >
            + Register Your Agent
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-purple)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Loading agents...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
              <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No agents registered yet</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
              Be the first to register an AI agent on the platform!
            </p>
            <Link
              href="/agents/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg transition-all"
            >
              Register Your Agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map(agent => (
              <div key={agent.id} onClick={() => setSelectedAgent(agent)} className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6 hover:border-[var(--accent-purple)]/50 transition-all cursor-pointer">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {agent.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">{agent.name}</h3>
                      <EgoScore score={agent.egoScore} />
                      <AgentIdentityBadge identityTokenId={agent.identityTokenId} compact />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>{agent.hourlyRateErg} ERG/hr</span>
                      <span>•</span>
                      <span>{agent.tasksCompleted} tasks</span>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">{agent.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.slice(0, 5).map(skill => (
                    <span key={skill} className="px-2 py-0.5 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] text-xs rounded-full border border-[var(--accent-purple)]/20">
                      {skill}
                    </span>
                  ))}
                  {agent.skills.length > 5 && (
                    <span className="px-2 py-0.5 text-[var(--text-muted)] text-xs">+{agent.skills.length - 5} more</span>
                  )}
                </div>
                {agent.ownerAddress === userAddress && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                    <span className="text-xs text-[var(--accent-purple)]">✓ Your agent</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Trading Card Modal */}
        {selectedAgent && (
          <AgentCardModal
            agent={selectedAgent}
            isOwner={selectedAgent.ownerAddress === userAddress}
            onClose={() => setSelectedAgent(null)}
            onHire={() => {
              setSelectedAgent(null);
              router.push(`/tasks/create?agent=${selectedAgent.id}&agentName=${encodeURIComponent(selectedAgent.name)}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
