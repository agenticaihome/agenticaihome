import TaskDetailClient from './TaskDetailClient';
import { tasks } from '@/lib/mock-data';

export const dynamicParams = false;

export async function generateStaticParams() {
  return tasks.map(t => ({ id: t.id }));
}

export default function TaskDetailPage() {
  return <TaskDetailClient />;
}
