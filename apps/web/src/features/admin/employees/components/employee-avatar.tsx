'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { useAuthorizedImageSrc } from '@/features/admin/media/hooks/use-authorized-image-src';
import { useIntersectionVisible } from '@/shared/hooks/use-intersection-visible';
import { resolveEmployeeProfileImageSrc } from '../utils/profile-image';

function initialsFromName(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function EmployeeAvatar({
  displayName,
  profileImageUrl,
  className,
  size = 'md',
  lazyLoad = true,
}: {
  displayName: string;
  profileImageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md';
  /** When true, defer authorized fetch until the avatar is near the viewport. */
  lazyLoad?: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const inView = useIntersectionVisible(containerRef, {
    enabled: lazyLoad && Boolean(profileImageUrl),
  });
  const resolved = inView ? resolveEmployeeProfileImageSrc(profileImageUrl) : null;
  const { displaySrc, loading, failed } = useAuthorizedImageSrc(resolved);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setImgBroken(false);
  }, [displaySrc]);

  const initials = initialsFromName(displayName) || '?';
  const sizeClass = size === 'sm' ? 'size-8 text-[10px]' : 'size-9 text-[11px]';
  const showPhoto = Boolean(displaySrc && !failed && !imgBroken);
  const waitingForImage = Boolean(resolved && loading && !showPhoto);

  return (
    <span
      ref={containerRef}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5',
        sizeClass,
        className,
      )}
    >
      <span
        className={cn(
          'bg-muted text-muted-foreground absolute inset-0 flex items-center justify-center font-semibold',
          waitingForImage ? 'animate-pulse' : '',
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
      {showPhoto && displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob or authorized fetch URL
        <img
          src={displaySrc}
          alt=""
          decoding="async"
          className="relative z-[1] size-full object-cover"
          onError={() => setImgBroken(true)}
        />
      ) : null}
    </span>
  );
}
