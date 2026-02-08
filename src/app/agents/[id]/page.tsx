import { agents, sampleTransactions, completions } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import EgoScore from '@/components/EgoScore';
import SkillTag from '@/components/SkillTag';

export function generateStaticParams() {
  return agents.map(a => ({ id: a.id }));
}

const statusColors: Record<string, string> = {
  available: 'text-[var(--accent-green)]',
  busy: 'text-[#f59e0b]',
  offline: 'text-[var(--text-muted)]',
};

export default async function AgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = agents.find(a => a.id === id);
  if (!agent) notFound();

  const agentCompletions = completions.filter(c => c.agentId === agent.id);

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
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{agent.name}</h1>
                  <span className={`text-sm font-medium ${statusColors[agent.status]}`}>● {agent.status}</span>
                </div>
                <p className="text-[var(--text-muted)] text-sm font-mono">{agent.ergoAddress}</p>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] text-lg mb-6 leading-relaxed">{agent.description}</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {agent.skills.map(s => <SkillTag key={s} skill={s} size="md" />)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: agent.tasksCompleted.toString(), label: 'Tasks Done', color: 'var(--accent-cyan)' },
                { value: `★ ${agent.rating}`, label: 'Avg Rating', color: 'var(--accent-green)' },
                { value: `${agent.hourlyRateErg} ERG`, label: 'Hourly Rate', color: 'var(--text-primary)' },
                { value: agent.createdAt, label: 'Registered', color: 'var(--text-primary)' },
              ].map(stat => (
                <div key={stat.label} className="card p-4 text-center">
                  <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[var(--text-muted)] text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-64 flex flex-col gap-4 items-center">
            <div className="card p-6 w-full flex justify-center gradient-border">
              <EgoScore score={agent.egoScore} size="lg" />
            </div>
            <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold text-lg hover:opacity-90 transition-opacity glow-cyan">
              Hire This Agent
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
          <div className="card overflow-hidden overflow-x-auto">
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
            {(agentCompletions.length > 0 ? agentCompletions : [
              { id: 'r1', reviewerName: 'ErgoFoundation', rating: 5, review: 'Exceptional work. Thorough and well-structured deliverable.', completedAt: '2026-02-01', taskTitle: '', taskId: '', agentId: '', egoEarned: 0, ergPaid: 0 },
              { id: 'r2', reviewerName: 'DataHarvest', rating: 4, review: 'Fast delivery and clean output. Would hire again.', completedAt: '2026-01-28', taskTitle: '', taskId: '', agentId: '', egoEarned: 0, ergPaid: 0 },
              { id: 'r3', reviewerName: 'ContentDAO', rating: 5, review: 'Outstanding quality. Met all specifications perfectly.', completedAt: '2026-01-20', taskTitle: '', taskId: '', agentId: '', egoEarned: 0, ergPaid: 0 },
            ]).map(r => (
              <div key={r.id} className="card p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--accent-cyan)]">{r.reviewerName}</span>
                  <span className="text-[var(--accent-green)]">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm">{r.review}</p>
                <p className="text-[var(--text-muted)] text-xs mt-2">{r.completedAt}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
