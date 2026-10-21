import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/shared/lib/utils';

export type DataTableSkeletonColumnVariant =
  | 'text'
  | 'textWide'
  | 'subtitle'
  | 'badge'
  | 'number'
  | 'icon'
  | 'actions';

export type DataTableSkeletonColumn = {
  variant?: DataTableSkeletonColumnVariant;
  className?: string;
  headClassName?: string;
};

function SkeletonCell({ variant, className }: { variant: DataTableSkeletonColumnVariant; className?: string }) {
  switch (variant) {
    case 'textWide':
      return (
        <div className={cn('grid gap-1.5', className)}>
          <Skeleton className="h-4 w-[min(100%,12rem)]" />
          <Skeleton className="h-3 w-[min(100%,8rem)]" />
        </div>
      );
    case 'subtitle':
      return <Skeleton className={cn('h-3 w-20', className)} />;
    case 'badge':
      return <Skeleton className={cn('h-6 w-16 rounded-full', className)} />;
    case 'number':
      return <Skeleton className={cn('ml-auto h-4 w-16', className)} />;
    case 'icon':
      return <Skeleton className={cn('size-8 rounded-md', className)} />;
    case 'actions':
      return (
        <div className={cn('flex justify-end gap-1', className)}>
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      );
    case 'text':
    default:
      return <Skeleton className={cn('h-4 w-24', className)} />;
  }
}

export function DataTableSkeletonBody({
  columns,
  rowCount = 6,
}: {
  columns: readonly DataTableSkeletonColumn[];
  rowCount?: number;
}) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {columns.map((column, columnIndex) => (
            <TableCell key={columnIndex} className={column.className}>
              <SkeletonCell variant={column.variant ?? 'text'} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function DataTableSkeleton({
  columns,
  rowCount = 6,
  header,
  headerVariant = 'gradient',
  className,
}: {
  columns: readonly DataTableSkeletonColumn[];
  rowCount?: number;
  header?: ReactNode;
  headerVariant?: 'default' | 'gradient';
  className?: string;
}) {
  return (
    <Table className={className}>
      {header ? (
        <TableHeader variant={headerVariant}>{header}</TableHeader>
      ) : (
        <TableHeader variant={headerVariant}>
          <TableRow className="hover:bg-transparent">
            {columns.map((column, index) => (
              <TableHead key={index} className={column.headClassName}>
                <Skeleton className="h-4 w-16 max-w-full" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        <DataTableSkeletonBody columns={columns} rowCount={rowCount} />
      </TableBody>
    </Table>
  );
}
