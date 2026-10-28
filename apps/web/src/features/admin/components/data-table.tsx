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
  frame = 'surface',
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** `flush`: no outer card; use inside a parent surface. */
  frame?: 'surface' | 'flush';
}) {
  const tableBlock =
    frame === 'flush' ? (
      <div className="max-w-full min-h-[8rem] min-w-0 bg-card">{children}</div>
    ) : (
      <div className="workspace-surface max-w-full min-h-[8rem] min-w-0">
        <div className="overflow-hidden rounded-lg">{children}</div>
      </div>
    );

  return (
    <div className={cn('grid min-w-0 max-w-full gap-3', className)}>
      {tableBlock}
      {footer ? <div>{footer}</div> : null}
    </div>
  );
}

export function DataTable({
  phase,
  colSpan,
  header,
  headerVariant = 'default',
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
  tableBodyClassName,
  frame = 'surface',
}: {
  phase: DataTablePhase;
  colSpan: number;
  header: ReactNode;
  headerVariant?: 'default' | 'gradient' | 'plain';
  frame?: 'surface' | 'flush';
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
  tableBodyClassName?: string;
}) {
  const showFooter =
    footer && (phase === 'success' || phase === 'initial-loading' || phase === 'empty');

  return (
    <DataTableFrame footer={showFooter ? footer : undefined} className={className} frame={frame}>
      <DataTableBodyRefreshOverlay active={refreshing && phase === 'success'}>
        <Table className={cn('bg-card', tableClassName)}>
          <TableHeader variant={headerVariant}>{header}</TableHeader>
          <TableBody className={cn('bg-card', tableBodyClassName)}>
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
