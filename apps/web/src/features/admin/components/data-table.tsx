import type { ReactNode } from 'react';
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { cn } from '@/shared/lib/utils';
import type { DataTablePhase } from './data-table-state';
import type { DataTableSkeletonColumn } from './data-table-skeleton';
import { DataTableSkeletonBody } from './data-table-skeleton';
import type { DataTableEmptyStateContent } from './data-table-states';
import {
  DataTableBodyRefreshOverlay,
  DataTableEmptyStateRow,
  DataTableErrorStateRow,
} from './data-table-states';

export function DataTableFrame({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 max-w-full gap-3', className)}>
      <div className="bg-card max-w-full min-h-[8rem] min-w-0 overflow-hidden rounded-xl shadow-md">
        {children}
      </div>
      {footer ? <div>{footer}</div> : null}
    </div>
  );
}

export function DataTable({
  phase,
  colSpan,
  header,
  headerVariant = 'gradient',
  skeletonColumns,
  skeletonRows = 6,
  empty,
  errorMessage,
  onRetry,
  refreshing = false,
  footer,
  children,
  className,
  tableClassName,
}: {
  phase: DataTablePhase;
  colSpan: number;
  header: ReactNode;
  headerVariant?: 'default' | 'gradient';
  skeletonColumns: readonly DataTableSkeletonColumn[];
  skeletonRows?: number;
  empty?: DataTableEmptyStateContent;
  errorMessage?: string | null;
  onRetry?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  tableClassName?: string;
}) {
  const showFooter =
    footer && (phase === 'success' || phase === 'initial-loading' || phase === 'empty');

  return (
    <DataTableFrame footer={showFooter ? footer : undefined} className={className}>
      <DataTableBodyRefreshOverlay active={refreshing && phase === 'success'}>
        <Table className={cn('bg-card', tableClassName)}>
          <TableHeader variant={headerVariant}>{header}</TableHeader>
          <TableBody className="bg-card">
            {phase === 'initial-loading' ? (
              <DataTableSkeletonBody columns={skeletonColumns} rowCount={skeletonRows} />
            ) : null}
            {phase === 'error' && errorMessage ? (
              <DataTableErrorStateRow
                colSpan={colSpan}
                message={errorMessage}
                onRetry={onRetry}
              />
            ) : null}
            {phase === 'empty' && empty ? (
              <DataTableEmptyStateRow colSpan={colSpan} content={empty} />
            ) : null}
            {phase === 'success' ? children : null}
          </TableBody>
        </Table>
      </DataTableBodyRefreshOverlay>
    </DataTableFrame>
  );
}

export type { DataTablePhase } from './data-table-state';
export { deriveDataTablePhase, isDataTableRefreshing } from './data-table-state';
export type { DataTableSkeletonColumn, DataTableSkeletonColumnVariant } from './data-table-skeleton';
export { DataTableSkeleton, DataTableSkeletonBody } from './data-table-skeleton';
export type { DataTableEmptyStateContent } from './data-table-states';
export {
  DataTableBodyRefreshOverlay,
  DataTableEmptyStateRow,
  DataTableErrorStateRow,
} from './data-table-states';
