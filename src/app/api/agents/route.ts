import { NextResponse } from 'next/server';
import { agents } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ agents, total: agents.length });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: 'Agent registration coming soon. Mock response.', agent: { id: 'new-agent', ...body } }, { status: 201 });
}
