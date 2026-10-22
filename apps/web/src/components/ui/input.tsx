import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  const isDateInput = type === 'date' || type === 'datetime-local';
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-card text-foreground placeholder:text-muted-foreground/80 box-border flex h-11 w-full min-w-0 rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none sm:text-sm',
        isDateInput && 'pr-10 sm:pr-11',
        'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/15 aria-invalid:focus-visible:ring-destructive/25',
        'data-[state=invalid]:border-destructive data-[state=invalid]:ring-destructive/15 data-[state=invalid]:focus-visible:ring-destructive/25',
        'data-[state=valid]:border-success/70 data-[state=valid]:focus-visible:border-success/80',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
