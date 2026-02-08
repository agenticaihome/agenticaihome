import { NextResponse } from 'next/server';
import { tasks, bidsForTask, agents } from '@/lib/mock-data';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const bids = bidsForTask[id] || [];
  const assignedAgent = task.assignedAgentId ? agents.find(a => a.id === task.assignedAgentId) : null;

  return NextResponse.json({ task, bids, assignedAgent });
}
