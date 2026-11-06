'use client';

import { useState } from 'react';
import { ImageSkeleton } from '@/components/loading/skeletons';
import { cn } from '@/shared/lib/utils';

/** Reserves space, shows a shimmer until the image loads, and a muted fallback on error. */
export function MediaImage({
  src,
  alt,
  className,
  skeletonClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
}) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {phase === 'loading' ? <ImageSkeleton className={cn('absolute inset-0 h-full', skeletonClassName)} /> : null}
      {phase === 'error' ? (
        <span className="bg-muted text-muted-foreground flex size-full items-center justify-center text-xs">
          Image unavailable
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- generic media placeholder; callers may pass any URL
        <img
          src={src}
          alt={alt}
          className={cn('size-full object-cover', phase === 'loading' && 'opacity-0')}
          onLoad={() => setPhase('ready')}
          onError={() => setPhase('error')}
        />
      )}
    </span>
  );
}
