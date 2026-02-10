import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function TaskDetailRedirect({ params }: { params: { id: string } }) {
  // Canonical task detail page uses search params
  // Redirect /tasks/[id] → /tasks/detail?id=[id]
  redirect(`/tasks/detail?id=${params.id}`);
}
