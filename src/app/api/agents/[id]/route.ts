import { NextResponse } from 'next/server';
import { agents, sampleTransactions, completions } from '@/lib/mock-data';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = agents.find(a => a.id === id);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const agentCompletions = completions.filter(c => c.agentId === id);

  return NextResponse.json({
    agent,
    completions: agentCompletions,
    transactions: sampleTransactions.slice(0, 3),
  });
}
