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
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { useEmployeeLeavePage } from '../hooks/use-employee-leave-page';
import {
  EMPLOYEE_LEAVE_SURFACE,
  EMPLOYEE_LEAVE_TAB_TRIGGER,
  EMPLOYEE_LEAVE_TABLE_BODY,
  EMPLOYEE_LEAVE_TABLE_CELL,
  EMPLOYEE_LEAVE_TABLE_CLASS,
  EMPLOYEE_LEAVE_TABLE_COL,
  EMPLOYEE_LEAVE_TABLE_HEAD,
} from '../constants/employee-leave-ui';
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
  const [applyOpen, setApplyOpen] = useState(false);

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
    <div className="mx-auto grid w-full max-w-[1100px] gap-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-[#1E293B] sm:text-2xl">Leave</h1>
          <p className="text-xs text-[#64748B] sm:text-sm">
            Track your leave requests ({page.calendarYear}).
          </p>
        </div>
        <Button
          type="button"
          className={APPLY_BTN}
          onClick={() => {
            page.resetApplyForm();
            setApplyOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Apply for Leave
        </Button>
      </header>

      {page.balancesError ? <CrmErrorAlert message={page.balancesError} /> : null}

      <section className={EMPLOYEE_LEAVE_SURFACE.section}>
        <div
          className={cn(
            EMPLOYEE_LEAVE_SURFACE.headerBar,
            'flex flex-wrap items-center justify-between gap-2',
          )}
        >
          <h2 className="text-sm font-semibold text-[#1E293B]">Request history</h2>
          <Tabs
            value={page.historyTab}
            onValueChange={(v) => page.setHistoryTab(v as typeof page.historyTab)}
          >
            <TabsList className="h-9 border border-[#E8E8EF] bg-[#F8F9FC] p-0.5">
              <TabsTrigger value="PENDING" className={EMPLOYEE_LEAVE_TAB_TRIGGER}>
                Pending
              </TabsTrigger>
              <TabsTrigger value="APPROVED" className={EMPLOYEE_LEAVE_TAB_TRIGGER}>
                Approved
              </TabsTrigger>
              <TabsTrigger value="REJECTED" className={EMPLOYEE_LEAVE_TAB_TRIGGER}>
                Rejected
              </TabsTrigger>
              <TabsTrigger value="ALL" className={EMPLOYEE_LEAVE_TAB_TRIGGER}>
                All
              </TabsTrigger>
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
          headerVariant="plain"
          className="min-w-0 max-w-full gap-0"
          tableClassName={EMPLOYEE_LEAVE_TABLE_CLASS}
          tableBodyClassName={EMPLOYEE_LEAVE_TABLE_BODY}
          phase={historyPhase}
          colSpan={5}
          skeletonColumns={HISTORY_SKELETON}
          header={
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(EMPLOYEE_LEAVE_TABLE_HEAD, EMPLOYEE_LEAVE_TABLE_COL.type)}>
                Leave type
              </TableHead>
              <TableHead className={cn(EMPLOYEE_LEAVE_TABLE_HEAD, EMPLOYEE_LEAVE_TABLE_COL.dates)}>
                Dates
              </TableHead>
              <TableHead
                className={cn(
                  EMPLOYEE_LEAVE_TABLE_HEAD,
                  EMPLOYEE_LEAVE_TABLE_COL.days,
                  'text-right',
                )}
              >
                Days
              </TableHead>
              <TableHead className={cn(EMPLOYEE_LEAVE_TABLE_HEAD, EMPLOYEE_LEAVE_TABLE_COL.status)}>
                Status
              </TableHead>
              <TableHead
                className={cn(
                  EMPLOYEE_LEAVE_TABLE_HEAD,
                  EMPLOYEE_LEAVE_TABLE_COL.actions,
                  'text-right',
                )}
              >
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
            <TableRow key={row.id}>
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_CELL, EMPLOYEE_LEAVE_TABLE_COL.type)}>
                <span className="font-medium">{row.leaveTypeName}</span>
              </TableCell>
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_CELL, EMPLOYEE_LEAVE_TABLE_COL.dates)}>
                {formatLeaveRequestDates(row)}
              </TableCell>
              <TableCell
                className={cn(
                  EMPLOYEE_LEAVE_TABLE_CELL,
                  EMPLOYEE_LEAVE_TABLE_COL.days,
                  'text-right tabular-nums',
                )}
              >
                {row.totalDays}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_LEAVE_TABLE_CELL, EMPLOYEE_LEAVE_TABLE_COL.status)}>
                {requestStatusBadge(row.status)}
              </TableCell>
              <TableCell
                className={cn(
                  EMPLOYEE_LEAVE_TABLE_CELL,
                  EMPLOYEE_LEAVE_TABLE_COL.actions,
                  'text-right',
                )}
              >
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
      </section>

      <EmployeeApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} page={page} />
    </div>
  );
}
