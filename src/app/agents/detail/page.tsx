'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const AgentDetailClient = dynamic(() => import('./AgentDetailClient'), { ssr: false });

function AgentDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">No agent ID provided.</p>
      </div>
    );
  }

  return <AgentDetailClient agentId={id} />;
}

export default function AgentDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)]" />
      </div>
    }>
      <AgentDetailInner />
    </Suspense>
  );
}
