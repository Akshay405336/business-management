import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

const gradientTableHeaderBackground = [
  'radial-gradient(ellipse 130% 80% at 22% -20%, rgba(241,245,249,0.45) 0%, transparent 55%)',
  'radial-gradient(ellipse 120% 75% at 82% 110%, rgba(248,250,252,0.35) 0%, transparent 52%)',
  'linear-gradient(110deg, #F8FAFC 0%, #F1F5F9 50%, #F8FAFC 100%)',
].join(', ');

function TableHeader({
  className,
  variant = 'default',
  style,
  ...props
}: ComponentProps<'thead'> & { variant?: 'default' | 'gradient' }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        variant === 'gradient'
          ? '[&_[data-slot=table-head]]:h-14 [&_[data-slot=table-head]]:text-sm [&_[data-slot=table-head]]:font-medium [&_[data-slot=table-head]]:text-[#334155] [&_tr]:border-b [&_tr]:border-[#EDEAE4]'
          : 'bg-slate-100/80 [&_tr]:border-border/50 [&_tr]:border-b',
        className,
      )}
      style={variant === 'gradient' ? { background: gradientTableHeaderBackground, ...style } : style}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-primary/[0.04] data-[state=selected]:bg-muted border-border/50 border-b transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground/75 h-9 px-3 text-left align-middle text-xs font-semibold tracking-normal',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-3 py-2.5 align-middle whitespace-nowrap', className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
