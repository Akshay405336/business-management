import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input bg-card text-foreground placeholder:text-muted-foreground/80 flex min-h-[5rem] w-full min-w-0 rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none sm:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/15',
        'data-[state=invalid]:border-destructive data-[state=invalid]:ring-destructive/15',
        'data-[state=valid]:border-success/70 data-[state=valid]:focus-visible:border-success/80',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
