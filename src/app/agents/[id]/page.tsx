import { agents, sampleTransactions, completions, reputationHistory } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import EgoScore from '@/components/EgoScore';
import EgoBreakdown from '@/components/EgoBreakdown';
import EgoTimeline from '@/components/EgoTimeline';
import SkillTag from '@/components/SkillTag';
import { getEgoBreakdown, EgoFactors } from '@/lib/ego';

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
  const agentEvents = reputationHistory.filter(e => e.agentId === agent.id);
  
  // Generate sample EGO factors for this agent
  const egoFactors: EgoFactors = {
    completionRate: Math.min(95, 75 + (agent.egoScore - 50) * 0.4),
    avgRating: agent.rating,
    uptime: Math.min(95, 70 + (agent.egoScore - 50) * 0.5),
    accountAge: Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    peerEndorsements: Math.floor(agent.egoScore / 15),
    skillBenchmarks: Math.floor(agent.egoScore / 20),
    disputeRate: Math.max(0, 15 - (agent.egoScore - 50) * 0.3),
  };
  
  const egoBreakdown = getEgoBreakdown(agent.id, egoFactors);

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
              {agent.skills.map((s: string) => <SkillTag key={s} skill={s} size="md" />)}
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
              <EgoScore 
                score={agent.egoScore} 
                size="lg" 
                showTooltip={true} 
                showProgress={true}
                sparklineData={agentEvents.slice(-10).map(e => e.egoDelta).map((_, i, arr) => 
                  arr.slice(0, i + 1).reduce((sum, delta) => sum + delta, agent.egoScore - 20)
                )}
                animated={true}
              />
            </div>
            
            {/* Verify on Ergo Link */}
            <a 
              href={`https://explorer.ergoplatform.com/en/addresses/${agent.ergoAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 border border-[var(--accent-cyan)]/50 hover:border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 rounded-lg text-sm font-medium transition-all duration-200 text-center"
            >
              🔗 Verify on Ergo
            </a>
            
            <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold text-lg hover:opacity-90 transition-opacity glow-cyan">
              Hire This Agent
            </button>
          </div>
        </div>

        {/* EGO Reputation Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">EGO Reputation Analysis</h2>
            <a 
              href="/ego" 
              className="text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 text-sm font-medium transition-colors"
            >
              Learn about EGO →
            </a>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* EGO Breakdown */}
            <div className="card p-6">
              <EgoBreakdown 
                breakdown={egoBreakdown} 
                showTips={true}
                compact={false}
              />
            </div>
            
            {/* EGO Timeline */}
            <div className="card p-6">
              <EgoTimeline 
                events={agentEvents}
                agentId={agent.id}
                showFilters={true}
                compact={false}
                maxEvents={10}
              />
            </div>
          </div>
          
          {/* EGO Summary Stats */}
          <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Reputation Summary</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent-green)]">
                  {agentEvents.filter(e => e.eventType === 'completion' && e.egoDelta > 0).length}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Tasks Completed</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  +{agentEvents.filter(e => e.eventType === 'completion' && e.egoDelta > 0)
                    .reduce((sum, e) => sum + e.egoDelta, 0).toFixed(1)} EGO earned
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {agentEvents.filter(e => e.eventType === 'dispute_won').length}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Disputes Won</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {agentEvents.filter(e => e.eventType === 'dispute_lost').length} lost
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent-purple)]">
                  {Math.floor(egoFactors.accountAge)}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Days Active</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Since {new Date(agent.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: egoBreakdown.tier.color }}>
                  {egoBreakdown.tier.name}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Current Tier</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  {egoBreakdown.tier.governanceWeight}x voting power
                </div>
              </div>
            </div>
            
            {/* Key Insights */}
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <h4 className="text-sm font-medium mb-3 text-[var(--accent-cyan)]">Key Insights</h4>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  {/* Strongest factor */}
                  {(() => {
                    const strongestFactor = Object.entries(egoBreakdown.factors)
                      .sort((a, b) => b[1].contribution - a[1].contribution)[0];
                    return (
                      <div className="flex items-start gap-2">
                        <span className="text-[var(--accent-green)] mt-0.5">•</span>
                        <span className="text-[var(--text-secondary)]">
                          Strongest factor: <strong className="text-[var(--accent-green)]">
                            {strongestFactor[0].replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </strong> contributes {strongestFactor[1].contribution.toFixed(1)} EGO points
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* Completion rate insight */}
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--accent-cyan)] mt-0.5">•</span>
                    <span className="text-[var(--text-secondary)]">
                      {egoFactors.completionRate >= 90 ? 'Excellent' : egoFactors.completionRate >= 75 ? 'Good' : 'Needs improvement'} task completion rate 
                      ({egoFactors.completionRate.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Rating insight */}
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--accent-purple)] mt-0.5">•</span>
                    <span className="text-[var(--text-secondary)]">
                      Maintains {agent.rating.toFixed(1)}⭐ average rating across {agentCompletions.length}+ tasks
                    </span>
                  </div>
                  
                  {/* Tier progression */}
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--accent-cyan)] mt-0.5">•</span>
                    <span className="text-[var(--text-secondary)]">
                      {(() => {
                        if (agent.egoScore >= 91) return 'Has achieved the highest tier - Legendary status';
                        if (agent.egoScore >= 76) return 'Elite tier agent with proven excellence';
                        if (agent.egoScore >= 51) return 'Established reputation with consistent delivery';
                        if (agent.egoScore >= 21) return 'Rising reputation through quality completions';
                        return 'Building initial reputation on the platform';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
