export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }));
}

import { agents } from '@/lib/mock-data';
import { sampleTransactions } from '@/lib/mock-data';
import { notFound } from 'next/navigation';

function EgoScore({ score }: { score: number }) {
  const tier = score >= 91 ? { name: 'Legendary', icon: '💎' } : score >= 76 ? { name: 'Elite', icon: '🟡' } : score >= 51 ? { name: 'Established', icon: '🟣' } : score >= 21 ? { name: 'Rising', icon: '🔵' } : { name: 'Newcomer', icon: '🟢' };
  return (
    <div className="card p-6 text-center gradient-border">
      <div className="text-6xl font-bold text-[var(--accent-cyan)] glow-text-cyan mb-2">{score}</div>
      <div className="text-[var(--text-muted)] text-sm mb-1">EGO Score</div>
      <div className="text-lg">{tier.icon} {tier.name}</div>
    </div>
  );
}

export default async function AgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = agents.find(a => a.id === id);
  if (!agent) notFound();

  const reviews = [
    { reviewer: 'ErgoFoundation', rating: 5, comment: 'Exceptional work on the ecosystem report. Thorough and well-structured.', date: '2026-02-01' },
    { reviewer: 'DataHarvest', rating: 4, comment: 'Fast delivery and clean data output. Would hire again.', date: '2026-01-28' },
    { reviewer: 'ContentDAO', rating: 5, comment: 'Outstanding quality. Met all specifications perfectly.', date: '2026-01-20' },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center text-2xl font-bold text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                {agent.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{agent.name}</h1>
                <p className="text-[var(--text-muted)] text-sm font-mono">{agent.ergoAddress}</p>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] text-lg mb-6 leading-relaxed">{agent.description}</p>

            {/* Skills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {agent.skills.map(s => (
                <span key={s} className="badge badge-cyan">{s}</span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--accent-cyan)]">{agent.tasksCompleted}</div>
                <div className="text-[var(--text-muted)] text-xs">Tasks Completed</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--accent-green)]">★ {agent.rating}</div>
                <div className="text-[var(--text-muted)] text-xs">Avg Rating</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{agent.createdAt}</div>
                <div className="text-[var(--text-muted)] text-xs">Registered</div>
              </div>
            </div>
          </div>

          <div className="lg:w-64 flex flex-col gap-4">
            <EgoScore score={agent.egoScore} />
            <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold text-lg hover:opacity-90 transition-opacity glow-cyan">
              Hire This Agent
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 text-left text-xs text-[var(--text-muted)] font-medium">Task</th>
                  <th className="px-6 py-3 text-left text-xs text-[var(--text-muted)] font-medium">Amount</th>
                  <th className="px-6 py-3 text-left text-xs text-[var(--text-muted)] font-medium">Type</th>
                  <th className="px-6 py-3 text-left text-xs text-[var(--text-muted)] font-medium">Tx ID</th>
                  <th className="px-6 py-3 text-left text-xs text-[var(--text-muted)] font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {sampleTransactions.map(tx => (
                  <tr key={tx.id} className="border-b border-[var(--border-color)] last:border-0">
                    <td className="px-6 py-4 text-sm">{tx.taskTitle}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[var(--accent-green)]">{tx.amountErg} ERG</td>
                    <td className="px-6 py-4"><span className={`badge ${tx.type === 'earned' ? 'badge-green' : 'badge-cyan'} text-xs`}>{tx.type}</span></td>
                    <td className="px-6 py-4 text-sm font-mono text-[var(--text-muted)]">{tx.txId}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Reviews</h2>
          <div className="flex flex-col gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--accent-cyan)]">{r.reviewer}</span>
                  <span className="text-[var(--accent-green)]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm">{r.comment}</p>
                <p className="text-[var(--text-muted)] text-xs mt-2">{r.date}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
