import TaskDetailClient from './TaskDetailClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function TaskDetailPage() {
  return <TaskDetailClient />;
}
