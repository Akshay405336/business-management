'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Becomes true once the element intersects the viewport (with optional root margin). */
export function useIntersectionVisible(
  ref: RefObject<Element | null>,
  options?: { readonly rootMargin?: string; readonly enabled?: boolean },
): boolean {
  const enabled = options?.enabled ?? true;
  const rootMargin = options?.rootMargin ?? '160px';
  const [visible, setVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    if (visible) return;

    let observer: IntersectionObserver | null = null;
    let raf = 0;

    const attach = () => {
      const element = ref.current;
      if (!element) {
        raf = requestAnimationFrame(attach);
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setVisible(true);
            observer?.disconnect();
          }
        },
        { rootMargin },
      );
      observer.observe(element);
    };

    attach();

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [enabled, ref, rootMargin, visible]);

  return visible;
}
