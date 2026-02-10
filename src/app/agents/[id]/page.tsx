import AgentDetailClient from './AgentDetailClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function AgentDetailPage() {
  return <AgentDetailClient />;
}
