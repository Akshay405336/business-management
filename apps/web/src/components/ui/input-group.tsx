import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** Wraps a control with optional leading/trailing icons (18px, pointer-events-none on decorative icons). */
export function InputGroup({
  className,
  leading,
  trailing,
  children,
}: {
  className?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn('relative flex w-full min-w-0 items-center', className)}>
      {leading ? (
        <span className="text-muted-foreground pointer-events-none absolute left-3 z-[1] flex size-[18px] items-center justify-center [&>svg]:size-[18px]">
          {leading}
        </span>
      ) : null}
      {children}
      {trailing ? (
        <span className="text-muted-foreground pointer-events-none absolute right-3 z-[1] flex size-[18px] items-center justify-center [&>svg]:size-[18px]">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

export const inputGroupPaddingClass = (opts: { leading?: boolean; trailing?: boolean }) =>
  cn(opts.leading && 'pl-9', opts.trailing && 'pr-9');
