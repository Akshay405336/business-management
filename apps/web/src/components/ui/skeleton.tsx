import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'bg-secondary relative overflow-hidden rounded-md',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[data-table-shimmer_1.4s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent motion-reduce:before:animate-none',
        'animate-pulse motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
