import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function DisputeDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/disputes/detail?id=${params.id}`);
}
