'use client';

import { Eye, SquarePen, ToggleLeft, ToggleRight, Trash2, Users } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  CRM_EMPLOYEES_TABLE_COLUMN_CLASS,
  CRM_EMPLOYEES_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { cn } from '@/shared/lib/utils';
import type { EmployeeListItem } from '../types';
import { labelEmploymentType } from '../utils/employee-formatters';
import { EmployeeAvatar } from './employee-avatar';
import { EmployeeStatusBadge } from './employee-status-badge';
import { EmployeeTableColumns } from './employee-table-columns';

type Props = {
  items: readonly EmployeeListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  filtersActive: boolean;
  canUpdate: boolean;
  pending: boolean;
  canDeleteEmployee: (employee: EmployeeListItem) => boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (employee: EmployeeListItem) => void;
  onEdit: (employee: EmployeeListItem) => void;
  onStatus: (employee: EmployeeListItem) => void;
  onDelete: (employee: EmployeeListItem) => void;
};

export function EmployeeTable({
  items,
  total,
  loading,
  error,
  page,
  pageSize,
  filtersActive,
  canUpdate,
  pending,
  canDeleteEmployee,
  onRetry,
  onClearFilters,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onStatus,
  onDelete,
}: Props) {
  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: items.length > 0 ? total : 0 });
  const refreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  return (
    <DataTable
      frame="flush"
      frameClassName="min-h-0"
      headerVariant="plain"
      className="min-w-0 max-w-full gap-0"
      tableClassName="min-w-[968px] table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
      tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
      phase={tablePhase}
      colSpan={7}
      skeletonColumns={CRM_EMPLOYEES_TABLE_SKELETON}
      header={<EmployeeTableColumns />}
      empty={{
        icon: Users,
        title: filtersActive ? 'No employees match your filters' : 'No employees yet',
        description: filtersActive
          ? 'Try a different search or clear the filters.'
          : 'Add an employee to track employment details.',
        secondaryAction: filtersActive ? { label: 'Clear filters', onClick: onClearFilters } : undefined,
      }}
      errorMessage={error}
      onRetry={onRetry}
      refreshing={refreshing}
      footer={
        <TablePagination
          className="border-border border-t px-4 py-3 sm:px-5"
          page={page}
          pageSize={pageSize}
          total={total}
          loading={tablePhase === 'initial-loading'}
          hideWhenEmpty={false}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      }
    >
      {items.map((employee) => (
        <TableRow key={employee.id} className="border-0">
          <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.employee, 'min-w-0')}>
            <div className="flex min-w-0 items-center gap-2.5">
              <EmployeeAvatar displayName={employee.displayName} profileImageUrl={employee.profileImageUrl} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-foreground block max-w-full truncate text-left text-[13px] font-semibold hover:underline"
                    onClick={() => onView(employee)}
                  >
                    {employee.displayName}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{employee.displayName}</TooltipContent>
              </Tooltip>
            </div>
          </TableCell>
          <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.email, 'min-w-0')}>
            <span className="text-muted-foreground block truncate text-sm">{employee.workEmail}</span>
          </TableCell>
          <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.phone, 'text-sm tabular-nums')}>
            {employee.phone}
          </TableCell>
          <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.type, 'text-sm')}>
            {labelEmploymentType(employee.employmentType)}
          </TableCell>
          <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.joined, 'text-sm tabular-nums whitespace-nowrap')}>
            {employee.dateOfJoining}
          </TableCell>
          <TableCell className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.status}>
            <EmployeeStatusBadge status={employee.employmentStatus} />
          </TableCell>
          <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
            <div className="flex w-full shrink-0 items-center justify-end gap-1">
              <TableIconButton
                label={`View ${employee.displayName}`}
                tone="default"
                className="text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900"
                disabled={pending}
                onClick={() => onView(employee)}
              >
                <Eye className="size-4 stroke-[2]" aria-hidden="true" />
              </TableIconButton>
              {canUpdate ? (
                <TableIconButton
                  label={
                    employee.employmentStatus === 'ACTIVE'
                      ? `Deactivate ${employee.displayName}`
                      : `Activate ${employee.displayName}`
                  }
                  tone="default"
                  className={
                    employee.employmentStatus === 'ACTIVE'
                      ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                      : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                  }
                  disabled={pending}
                  onClick={() => onStatus(employee)}
                >
                  {employee.employmentStatus === 'ACTIVE' ? (
                    <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                  ) : (
                    <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                  )}
                </TableIconButton>
              ) : null}
              {canUpdate ? (
                <TableIconButton
                  label={`Edit ${employee.displayName}`}
                  tone="default"
                  className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                  disabled={pending}
                  onClick={() => onEdit(employee)}
                >
                  <SquarePen className="size-4 stroke-[2]" aria-hidden="true" />
                </TableIconButton>
              ) : null}
              {canUpdate ? (
                <TableIconButton
                  label={`Delete ${employee.displayName}`}
                  tone="default"
                  className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black disabled:opacity-100 disabled:hover:bg-transparent"
                  disabled={pending || !canDeleteEmployee(employee)}
                  onClick={() => onDelete(employee)}
                >
                  <Trash2 className="size-4 stroke-[2]" aria-hidden="true" />
                </TableIconButton>
              ) : null}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}
