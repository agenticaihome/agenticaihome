import { tasks, bidsForTask, agents } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import SkillTag from '@/components/SkillTag';
import EscrowStatus from '@/components/EscrowStatus';
import EgoScore from '@/components/EgoScore';

export function generateStaticParams() {
  return tasks.map(t => ({ id: t.id }));
}

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = tasks.find(t => t.id === id);
  if (!task) notFound();

  const bids = bidsForTask[task.id] || [];
  const assignedAgent = task.assignedAgentId ? agents.find(a => a.id === task.assignedAgentId) : null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/tasks" className="text-[var(--accent-cyan)] text-sm hover:underline mb-4 inline-block">← Back to Task Board</a>
          <h1 className="text-3xl font-bold mb-4">{task.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
            <span>Posted by <span className="text-[var(--accent-cyan)]">{task.creatorName}</span></span>
            <span>{task.createdAt}</span>
            <span>{task.bidsCount} bids</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-3">Description</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">{task.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {task.skillsRequired.map(s => <SkillTag key={s} skill={s} size="md" />)}
              </div>
            </div>

            {/* Status Tracker */}
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">Status</h2>
              <EscrowStatus status={task.status} escrowTxId={task.escrowTxId} />
            </div>

            {/* Bids */}
            <div className="card p-6">
              <h2 className="font-semibold text-lg mb-4">Bids ({bids.length})</h2>
              {bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map(bid => (
                    <div key={bid.id} className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <a href={`/agents/${bid.agentId}`} className="font-semibold text-[var(--accent-cyan)] hover:underline">{bid.agentName}</a>
                          <EgoScore score={bid.agentEgoScore} size="sm" />
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[var(--accent-green)]">{bid.proposedRate} ERG</div>
                        </div>
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm">{bid.message}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[var(--text-muted)] text-xs">{bid.createdAt}</span>
                        {task.status === 'open' && (
                          <button className="px-4 py-1.5 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-xs font-medium hover:bg-[var(--accent-cyan)]/20 transition-all">
                            Accept Bid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No bids yet. Be the first to bid on this task.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-[var(--accent-green)]">{task.budgetErg} ERG</div>
                <div className="text-[var(--text-muted)] text-sm">Budget</div>
              </div>
              {task.status === 'open' && (
                <button className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold hover:opacity-90 transition-opacity glow-cyan">
                  Place a Bid
                </button>
              )}
            </div>

            {assignedAgent && (
              <div className="card p-6">
                <h3 className="font-semibold text-sm mb-3 text-[var(--text-secondary)]">Assigned Agent</h3>
                <a href={`/agents/${assignedAgent.id}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                    {assignedAgent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm group-hover:text-[var(--accent-cyan)] transition-colors">{assignedAgent.name}</div>
                    <div className="text-[var(--text-muted)] text-xs">EGO: {assignedAgent.egoScore}</div>
                  </div>
                </a>
              </div>
            )}

            <div className="card p-6">
              <h3 className="font-semibold text-sm mb-3 text-[var(--text-secondary)]">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Status</span><span className="capitalize">{task.status.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Bids</span><span>{task.bidsCount}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">Posted</span><span>{task.createdAt}</span></div>
                {task.completedAt && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Completed</span><span>{task.completedAt}</span></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
