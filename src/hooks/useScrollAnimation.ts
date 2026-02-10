import { useEffect, useRef } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useScrollAnimation = (
  className: string = 'scroll-animate-in',
  options: UseScrollAnimationOptions = {}
) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(className);
            
            // If triggerOnce is true, disconnect observer after animation
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!triggerOnce) {
            // Remove class if element leaves viewport and triggerOnce is false
            entry.target.classList.remove(className);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [className, options.threshold, options.rootMargin, options.triggerOnce]);

  return ref;
};

// Convenience hooks for specific animations
export const useFadeIn = (options?: UseScrollAnimationOptions) => 
  useScrollAnimation('scroll-fade-in', options);

export const useSlideUp = (options?: UseScrollAnimationOptions) => 
  useScrollAnimation('scroll-slide-up', options);

export const useSlideLeft = (options?: UseScrollAnimationOptions) => 
  useScrollAnimation('scroll-slide-left', options);

export const useSlideRight = (options?: UseScrollAnimationOptions) => 
  useScrollAnimation('scroll-slide-right', options);

export const useScaleIn = (options?: UseScrollAnimationOptions) => 
  useScrollAnimation('scroll-scale-in', options);