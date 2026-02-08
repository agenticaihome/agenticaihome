import { NextResponse } from 'next/server';
import { tasks } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ tasks, total: tasks.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: 'Task creation coming soon. Mock response.', task: { id: 'new-task', ...body } }, { status: 201 });
}
