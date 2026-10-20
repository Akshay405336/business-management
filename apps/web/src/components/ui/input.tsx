import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-card text-foreground placeholder:text-muted-foreground/80 flex h-10 w-full min-w-0 rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none sm:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:focus-visible:ring-destructive/25',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
