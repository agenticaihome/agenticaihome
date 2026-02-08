import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export const dynamicParams = false;

export default function AgentProfile() {
  redirect('/agents');
}
