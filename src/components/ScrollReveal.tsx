'use client';

import React, { ReactNode, CSSProperties } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

type AnimationType = 
  | 'fade-in' 
  | 'slide-up' 
  | 'slide-left' 
  | 'slide-right' 
  | 'scale-in'
  | 'text-reveal'
  | 'card-lift'
  | 'blur-focus'
  | 'rotate-in'
  | 'width-expand';

interface ScrollRevealProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number; // in milliseconds
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  className?: string;
  style?: CSSProperties;
  as?: React.ElementType;
}

const ScrollReveal = ({
  children,
  animation = 'fade-in',
  delay = 0,
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  className = '',
  style = {},
  as: Component = 'div'
}: ScrollRevealProps) => {
  const animationClass = `scroll-${animation}`;
  const ref = useScrollAnimation(
    'scroll-animate-in',
    { threshold, rootMargin, triggerOnce }
  );

  // Calculate stagger class based on delay
  let staggerClass = '';
  if (delay > 0) {
    if (delay <= 100) staggerClass = 'scroll-stagger-1';
    else if (delay <= 200) staggerClass = 'scroll-stagger-2';
    else if (delay <= 300) staggerClass = 'scroll-stagger-3';
    else if (delay <= 400) staggerClass = 'scroll-stagger-4';
    else if (delay <= 500) staggerClass = 'scroll-stagger-5';
  }

  const combinedClassName = [
    animationClass,
    staggerClass,
    className
  ].filter(Boolean).join(' ');

  const combinedStyle: CSSProperties = {
    ...style,
    // Apply custom delay if it doesn't match predefined stagger classes
    ...(delay > 0 && delay > 500 ? { transitionDelay: `${delay}ms` } : {})
  };

  return (
    <Component 
      ref={ref as any}
      className={combinedClassName}
      style={combinedStyle}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;