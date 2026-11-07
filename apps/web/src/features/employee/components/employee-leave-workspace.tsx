'use client';

import type { LeaveRequestStatus } from '@techwin/contracts';
import { CalendarClock, Loader2, Plus, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { PermissionGate } from '@/shared/components/permission-gate';
import { useEmployeeLeavePage } from '../hooks/use-employee-leave-page';
import { EMPLOYEE_LEAVE_TABLE_COL } from '../constants/employee-leave-ui';
import { EmployeeApplyLeaveDialog } from './employee-apply-leave-dialog';
import { cn } from '@/shared/lib/utils';

const HISTORY_SKELETON = [
  { variant: 'text' as const, className: EMPLOYEE_LEAVE_TABLE_COL.type },
  { variant: 'text' as const, className: EMPLOYEE_LEAVE_TABLE_COL.dates },
  { variant: 'number' as const, className: EMPLOYEE_LEAVE_TABLE_COL.days },
  { variant: 'badge' as const, className: EMPLOYEE_LEAVE_TABLE_COL.status },
  {
    variant: 'actions' as const,
    className: EMPLOYEE_LEAVE_TABLE_COL.actions,
    headClassName: `${EMPLOYEE_LEAVE_TABLE_COL.actions} text-right`,
  },
];

const APPLY_BTN =
  'h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

function requestStatusBadge(status: LeaveRequestStatus) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
          Rejected
        </Badge>
      );
    case 'CANCELLED':
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
          Pending
        </Badge>
      );
  }
}

function formatLeaveRequestDates(row: { startDate: string; endDate: string; selectedDates: readonly string[] }) {
  const dates = row.selectedDates?.length ? row.selectedDates : [row.startDate, row.endDate];
  const unique = [...new Set(dates)].sort();
  if (unique.length === 1) return unique[0]!;
  if (unique.length <= 3) return unique.join(', ');
  return `${unique[0]} … ${unique[unique.length - 1]} (${unique.length} days)`;
}

export function EmployeeLeaveWorkspace() {
  const page = useEmployeeLeavePage();
  const { dashboardBreadcrumb } = usePortalNavigation();
  const [applyOpen, setApplyOpen] = useState(false);
  const breadcrumbs = [dashboardBreadcrumb, { label: 'My leave' }] as const;

  const historyPhase = deriveDataTablePhase({
    loading: page.historyLoading,
    error: page.historyError,
    rowCount: page.historyTotal,
  });
  const historyRefreshing = isDataTableRefreshing({
    loading: page.historyLoading,
    rowCount: page.history.length,
  });
  const safeHistoryPage = Math.min(Math.max(1, page.historyPage), page.historyTotalPages);

  const emptyDescription =
    page.historyTab === 'PENDING'
      ? 'You have no pending leave requests.'
      : page.historyTab === 'ALL'
        ? 'Your leave applications will appear here.'
        : `No ${page.historyTab.toLowerCase()} requests for ${page.calendarYear}.`;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="My leave"
            description={`Track your leave requests (${page.calendarYear}).`}
            className="rounded-none border-0 bg-card shadow-none"
            titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
            toolbar={
              <PermissionGate anyOf={['leave.requests.create']}>
                <Button
                  type="button"
                  size="sm"
                  className={cn('h-9 shrink-0', APPLY_BTN)}
                  onClick={() => {
                    page.resetApplyForm();
                    setApplyOpen(true);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Apply for Leave
                </Button>
              </PermissionGate>
            }
          />

          {page.balancesError ? (
            <div className="border-border border-b px-4 sm:px-5">
              <CrmErrorAlert message={page.balancesError} />
            </div>
          ) : null}

          <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 sm:px-5">
            <h2 className="text-foreground text-sm font-semibold">Request history</h2>
            <Tabs
              value={page.historyTab}
              onValueChange={(v) => page.setHistoryTab(v as typeof page.historyTab)}
            >
              <TabsList className="h-9">
                <TabsTrigger value="PENDING">Pending</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                <TabsTrigger value="ALL">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

        {page.historyError && page.history.length > 0 ? (
          <div className="border-b border-[#E8E8EF] px-4 py-2 sm:px-5">
            <CrmErrorAlert message={page.historyError} />
          </div>
        ) : null}

        <div aria-hidden className="table-header-edge" />

        <DataTable
          frame="flush"
          frameClassName="min-h-0"
          headerVariant="plain"
          className="min-w-0 max-w-full gap-0"
          tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
          tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
          phase={historyPhase}
          colSpan={5}
          skeletonColumns={HISTORY_SKELETON}
          header={
            <TableRow className="hover:bg-transparent">
              <TableHead className={EMPLOYEE_LEAVE_TABLE_COL.type}>Leave type</TableHead>
              <TableHead className={EMPLOYEE_LEAVE_TABLE_COL.dates}>Dates</TableHead>
              <TableHead className={cn(EMPLOYEE_LEAVE_TABLE_COL.days, 'text-right')}>Days</TableHead>
              <TableHead className={EMPLOYEE_LEAVE_TABLE_COL.status}>Status</TableHead>
              <TableHead className={cn(EMPLOYEE_LEAVE_TABLE_COL.actions, 'text-right')}>
                Actions
              </TableHead>
            </TableRow>
          }
          empty={{
            icon: CalendarClock,
            title: 'No requests',
            description: emptyDescription,
          }}
          errorMessage={page.historyError}
          onRetry={() => void page.reloadHistory()}
          refreshing={historyRefreshing}
          footer={
            <TablePagination
              className="border-border border-t px-4 py-3 sm:px-5"
              page={safeHistoryPage}
              pageSize={page.historyPageSize}
              total={page.historyTotal}
              loading={historyPhase === 'initial-loading'}
              hideWhenEmpty={false}
              pageSizeOptions={[10, 25, 50]}
              onPageChange={page.setHistoryPage}
              onPageSizeChange={(size) => {
                page.setHistoryPageSize(size);
                page.setHistoryPage(1);
              }}
            />
          }
        >
          {page.history.map((row) => (
            <TableRow key={row.id} className="border-0">
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_COL.type, 'min-w-0')}>
                <span className="font-medium">{row.leaveTypeName}</span>
              </TableCell>
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_COL.dates, 'min-w-0 whitespace-normal')}>
                {formatLeaveRequestDates(row)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_COL.days, 'text-right tabular-nums')}>
                {row.totalDays}
              </TableCell>
              <TableCell className={EMPLOYEE_LEAVE_TABLE_COL.status}>
                {requestStatusBadge(row.status)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_COL.actions, 'text-right')}>
                {row.status === 'PENDING' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8 px-2"
                    disabled={page.cancelPendingId === row.id}
                    onClick={() => void page.cancelRequest(row.id)}
                  >
                    {page.cancelPendingId === row.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <XCircle className="size-4" aria-hidden />
                    )}
                    Cancel
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
        </div>
      </section>

      <EmployeeApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} page={page} />
    </div>
  );
}
