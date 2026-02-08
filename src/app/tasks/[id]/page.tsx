import { redirect } from 'next/navigation';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function TaskDetailPage() {
  redirect('/tasks');
}
