'use client';

import { useOnboarding } from './Onboarding';
import dynamic from 'next/dynamic';

const Onboarding = dynamic(() => import('./Onboarding'), { ssr: false });

export default function OnboardingWrapper() {
  const { showOnboarding, complete } = useOnboarding();
  if (!showOnboarding) return null;
  return <Onboarding onComplete={complete} />;
}
