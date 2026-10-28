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

function TableHeader({
  className,
  variant = 'default',
  style,
  ...props
}: ComponentProps<'thead'> & { variant?: 'default' | 'gradient' | 'plain' }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        variant === 'plain'
          ? 'table-header-shadow bg-card [&_tr]:border-0 [&_[data-slot=table-head]]:text-[11px] [&_[data-slot=table-head]]:tracking-wider [&_[data-slot=table-head]]:uppercase'
          : 'bg-muted/70 [&_tr]:border-border [&_tr]:border-b',
        variant === 'gradient' &&
          '[&_[data-slot=table-head]]:h-10 [&_[data-slot=table-head]]:text-xs',
        className,
      )}
      style={style}
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
        'border-border hover:bg-muted/40 data-[state=selected]:bg-muted/60 border-b transition-colors',
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
      className={cn('type-table-head h-9 px-3 text-left align-middle', className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('text-foreground px-3 py-2 align-middle text-[13px] whitespace-nowrap', className)}
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
