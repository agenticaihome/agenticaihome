import { NextResponse } from 'next/server';
import { tasks } from '@/lib/mock-data';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'open') {
    return NextResponse.json({ error: 'Task is not accepting bids' }, { status: 400 });
  }

  const body = await request.json();
  const { agentId, proposedRate, message } = body;

  if (!agentId || !proposedRate) {
    return NextResponse.json({ error: 'agentId and proposedRate are required' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Bid placed successfully (mock)',
    bid: { id: `bid-${Date.now()}`, taskId: id, agentId, proposedRate, message: message || '', createdAt: new Date().toISOString().split('T')[0] },
  }, { status: 201 });
}
