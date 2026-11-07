'use client';

import type { AttendanceListResponse } from '@techwin/contracts';
import { CalendarClock, CalendarDays, ListFilter, Loader2, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import type { DataTableEmptyStateContent } from '@/features/admin/components/data-table-states';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { ATTENDANCE_STATUS_FILTER_OPTIONS } from '@/features/admin/attendance/constants/attendance-status-filter-options';
import type { AttendanceStatusFilter } from '@/features/admin/attendance/constants/attendance-status-filter-options';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { AttendanceStatusBadge } from '@/features/attendance/components/attendance-status-badge';
import { describeRecordResult } from '@/features/attendance/utils/attendance-result';
import {
  formatAttendanceDate,
  formatWorkingHoursClock,
  formatIsoTime,
  weekdayLabel,
} from '@/features/attendance/utils/time';
import { cn } from '@/shared/lib/utils';
import {
  EMPLOYEE_ATTENDANCE_FILTER_GROUP,
  EMPLOYEE_ATTENDANCE_FILTER_ROW,
  EMPLOYEE_ATTENDANCE_FILTER_SEARCH_GROUP,
  EMPLOYEE_ATTENDANCE_SURFACE,
  EMPLOYEE_ATTENDANCE_TABLE_BODY,
  EMPLOYEE_ATTENDANCE_TABLE_CELL,
  EMPLOYEE_ATTENDANCE_TABLE_CLASS,
  EMPLOYEE_ATTENDANCE_TABLE_COL,
  EMPLOYEE_ATTENDANCE_TABLE_HEAD,
  employeeAttendanceFilterInputClass,
} from '../constants/employee-attendance-ui';

const EMPLOYEE_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

const SKELETON = [
  { variant: 'text' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.date },
  { variant: 'text' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.day },
  { variant: 'text' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.punchIn },
  { variant: 'text' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.punchOut },
  { variant: 'text' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.hours },
  { variant: 'text' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.late },
  { variant: 'badge' as const, className: EMPLOYEE_ATTENDANCE_TABLE_COL.status },
];

const FILTER_INPUT = employeeAttendanceFilterInputClass({ leading: true });

export function EmployeeAttendanceHistorySection({
  history,
  historyLoading,
  historyError,
  timeZone,
  filterDate,
  filterFrom,
  filterTo,
  statusFilter,
  filtersActive,
  page,
  pageSize,
  onFilterDate,
  onFilterFrom,
  onFilterTo,
  onStatusFilter,
  onPageChange,
  onPageSizeChange,
  onClearFilters,
  onRetry,
}: {
  history: AttendanceListResponse | null;
  historyLoading: boolean;
  historyError: string | null;
  timeZone: string;
  filterDate: string;
  filterFrom: string;
  filterTo: string;
  statusFilter: AttendanceStatusFilter;
  filtersActive: boolean;
  page: number;
  pageSize: number;
  onFilterDate: (value: string) => void;
  onFilterFrom: (value: string) => void;
  onFilterTo: (value: string) => void;
  onStatusFilter: (value: AttendanceStatusFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  const items = history?.items ?? [];
  const total = history?.total ?? 0;
  const tablePhase = deriveDataTablePhase({ loading: historyLoading, error: historyError, rowCount: total });
  const tableRefreshing = isDataTableRefreshing({ loading: historyLoading, rowCount: items.length });

  const emptyTableContent = useMemo((): DataTableEmptyStateContent => {
    return {
      icon: CalendarClock,
      title: 'No attendance records yet',
      description: filtersActive
        ? 'No completed records match your filters. Try another date range or clear filters.'
        : 'Your attendance history will appear here once you complete a punch out.',
      secondaryAction: filtersActive ? { label: 'Clear filters', onClick: onClearFilters } : undefined,
    };
  }, [filtersActive, onClearFilters]);

  return (
    <section className={cn('min-w-0 overflow-hidden', EMPLOYEE_ATTENDANCE_SURFACE.card)}>
      <div className="space-y-2.5 border-b border-[#E8E8EF] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-[#1E293B]">Attendance Records</h2>
          <p className="mt-0.5 text-xs text-[#64748B]">View your completed attendance history.</p>
        </div>

        <div className={EMPLOYEE_ATTENDANCE_FILTER_ROW}>
          <InputGroup
            leading={<Search className="size-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />}
            className={EMPLOYEE_ATTENDANCE_FILTER_SEARCH_GROUP}
          >
            <Input
              type="date"
              value={filterDate}
              onChange={(event) => onFilterDate(event.target.value)}
              className={FILTER_INPUT}
              aria-label="Search by date"
            />
          </InputGroup>

          <InputGroup
            leading={<CalendarDays className="size-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />}
            className={EMPLOYEE_ATTENDANCE_FILTER_GROUP}
          >
            <Input
              type="date"
              value={filterFrom}
              onChange={(event) => onFilterFrom(event.target.value)}
              className={FILTER_INPUT}
              aria-label="From date"
            />
          </InputGroup>

          <InputGroup
            leading={<CalendarDays className="size-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />}
            className={EMPLOYEE_ATTENDANCE_FILTER_GROUP}
          >
            <Input
              type="date"
              value={filterTo}
              onChange={(event) => onFilterTo(event.target.value)}
              className={FILTER_INPUT}
              aria-label="To date"
            />
          </InputGroup>

          <InputGroup
            leading={<ListFilter className="size-4 shrink-0 text-[#94A3B8]" aria-hidden="true" />}
            className={cn(EMPLOYEE_ATTENDANCE_FILTER_GROUP, 'sm:w-[11.5rem]')}
          >
            <Select value={statusFilter} onValueChange={(v) => onStatusFilter(v as AttendanceStatusFilter)}>
              <SelectTrigger
                className={cn(FILTER_INPUT, 'border-0 shadow-none focus:ring-1 focus:ring-[#E8E8EF]')}
                aria-label="Filter by status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ATTENDANCE_STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputGroup>

          {tableRefreshing ? (
            <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-label="Loading records" />
          ) : null}

          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-9 shrink-0 px-2 text-xs"
              onClick={onClearFilters}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {historyError && items.length > 0 ? (
        <div className="border-b border-[#E8E8EF] px-4 py-2 sm:px-5">
          <CrmErrorAlert message={historyError} />
        </div>
      ) : null}

      <div aria-hidden className="table-header-edge" />

      <DataTable
        frame="flush"
        frameClassName="min-h-0 min-w-0 max-w-full bg-white"
        headerVariant="plain"
        className="min-w-0 max-w-full gap-0"
        tableClassName={EMPLOYEE_ATTENDANCE_TABLE_CLASS}
        tableContainerClassName="min-w-0 max-w-full overflow-x-auto md:overflow-x-visible"
        tableBodyClassName={EMPLOYEE_ATTENDANCE_TABLE_BODY}
        skeletonRows={5}
        phase={tablePhase}
        colSpan={7}
        skeletonColumns={SKELETON}
        header={
          <TableRow className="border-b border-[#E8E8EF] hover:bg-transparent">
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.date, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>Date</TableHead>
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.day, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>Day</TableHead>
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.punchIn, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>
              Punch In
            </TableHead>
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.punchOut, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>
              Punch Out
            </TableHead>
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.hours, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>
              Working Hours
            </TableHead>
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.late, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>Result</TableHead>
            <TableHead className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.status, EMPLOYEE_ATTENDANCE_TABLE_HEAD)}>Status</TableHead>
          </TableRow>
        }
        empty={emptyTableContent}
        errorMessage={historyError}
        onRetry={onRetry}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            className="border-[#E8E8EF] min-w-0 max-w-full border-t px-4 py-2.5 sm:px-5"
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={EMPLOYEE_PAGE_SIZE_OPTIONS}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        }
      >
        {items.map((row) => {
          const tz = row.scheduleSnapshot.timeZone || timeZone;
          return (
            <TableRow key={row.id}>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.date, EMPLOYEE_ATTENDANCE_TABLE_CELL)}>
                {formatAttendanceDate(row.attendanceDate, tz)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.day, EMPLOYEE_ATTENDANCE_TABLE_CELL, 'text-[#64748B]')}>
                {weekdayLabel(row.attendanceDate, tz)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.punchIn, EMPLOYEE_ATTENDANCE_TABLE_CELL)}>
                {formatIsoTime(row.punchInAt, tz)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.punchOut, EMPLOYEE_ATTENDANCE_TABLE_CELL)}>
                {formatIsoTime(row.punchOutAt, tz)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.hours, EMPLOYEE_ATTENDANCE_TABLE_CELL)}>
                {formatWorkingHoursClock(row.workingMinutes)}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.late, 'whitespace-normal px-3 py-2.5 text-[#64748B]')}>
                {describeRecordResult(row) || '—'}
              </TableCell>
              <TableCell className={cn(EMPLOYEE_ATTENDANCE_TABLE_COL.status, 'px-3 py-2.5')}>
                <AttendanceStatusBadge status={row.status} className="h-5 text-[10px]" />
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </section>
  );
}
