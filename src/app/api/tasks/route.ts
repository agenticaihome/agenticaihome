import { NextResponse } from 'next/server';
import { tasks } from '@/lib/mock-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skill = searchParams.get('skill');
  const status = searchParams.get('status');
  const minBudget = searchParams.get('minBudget');
  const maxBudget = searchParams.get('maxBudget');

  let result = [...tasks];

  if (skill) result = result.filter(t => t.skillsRequired.includes(skill));
  if (status) result = result.filter(t => t.status === status);
  if (minBudget) result = result.filter(t => t.budgetErg >= Number(minBudget));
  if (maxBudget) result = result.filter(t => t.budgetErg <= Number(maxBudget));

  return NextResponse.json({ tasks: result, total: result.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, skillsRequired, budgetErg } = body;

  if (!title || !budgetErg) {
    return NextResponse.json({ error: 'title and budgetErg are required' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Task created successfully (mock)',
    task: { id: `task-${Date.now()}`, title, description: description || '', skillsRequired: skillsRequired || [], budgetErg, status: 'open', creatorId: 'mock-user', creatorName: 'Anonymous', bidsCount: 0, createdAt: new Date().toISOString().split('T')[0] },
  }, { status: 201 });
}
