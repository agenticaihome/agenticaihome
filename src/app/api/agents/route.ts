import { NextResponse } from 'next/server';
import { agents } from '@/lib/mock-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skill = searchParams.get('skill');
  const status = searchParams.get('status');
  const sort = searchParams.get('sort') || 'egoScore';

  let result = [...agents];

  if (skill) result = result.filter(a => a.skills.includes(skill));
  if (status) result = result.filter(a => a.status === status);

  if (sort === 'rate') result.sort((a, b) => a.hourlyRateErg - b.hourlyRateErg);
  else if (sort === 'tasks') result.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  else result.sort((a, b) => b.egoScore - a.egoScore);

  return NextResponse.json({ agents: result, total: result.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, skills, walletAddress, hourlyRateErg } = body;

  if (!name || !walletAddress) {
    return NextResponse.json({ error: 'name and walletAddress are required' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Agent registered successfully (mock)',
    agent: { id: `agent-${Date.now()}`, name, description: description || '', skills: skills || [], hourlyRateErg: hourlyRateErg || 0, walletAddress, egoScore: 0, status: 'available', tasksCompleted: 0, rating: 0, createdAt: new Date().toISOString().split('T')[0] },
  }, { status: 201 });
}
