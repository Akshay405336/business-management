'use client';

import type { AttendanceRecordDetail } from '@techwin/contracts';
import { CalendarClock, Eye, SquarePen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import type { DataTableEmptyStateContent } from '@/features/admin/components/data-table-states';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { AttendanceResult } from '@/features/attendance/components/attendance-result';
import {
  formatAttendanceDate,
  formatAttendanceWorkingHours,
  formatIsoTime,
} from '@/features/attendance/utils/time';
import { useMyPermissions } from '@/features/admin/org-access/hooks/use-my-permissions';
import { cn } from '@/shared/lib/utils';
import {
  ATTENDANCE_TABLE_COLUMN_CLASS,
  ATTENDANCE_TABLE_COMPACT_CELL,
  ATTENDANCE_TABLE_HEAD_CLASS,
  ATTENDANCE_TABLE_SKELETON,
} from '../constants/attendance-table-presets';
import { AttendanceEditRecordDialog } from './attendance-edit-record-dialog';
import { AttendanceRecordDetailSheet } from './attendance-record-detail-sheet';
import { AttendanceRecordsMobileList } from './attendance-records-mobile-list';
import { useAttendanceRecordsContext } from './attendance-records-context';

export function AttendanceRecordsSection() {
  const { has } = useMyPermissions();
  const canCorrectRecords = has('attendance.correct_records');

  const {
    items,
    total,
    loading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtersActive,
    clearFilters,
    refreshAll,
    safePage,
    openDetail,
  } = useAttendanceRecordsContext();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AttendanceRecordDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: total });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });
  const showMobileCards = tablePhase === 'success' && items.length > 0;

  const emptyTableContent = useMemo((): DataTableEmptyStateContent => {
    return {
      icon: CalendarClock,
      title: 'No attendance records found',
      description: filtersActive
        ? 'No records match the selected date or filters. Try another date or clear filters.'
        : 'Attendance records will appear here once employees punch in.',
      secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
    };
  }, [clearFilters, filtersActive]);

  const openEdit = (recordId: string) => {
    setEditRecordId(recordId);
    setEditOpen(true);
  };

  const showDetail = async (recordId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    const loaded = await openDetail(recordId);
    setDetail(loaded);
    if (!loaded) setDetailOpen(false);
    setDetailLoading(false);
  };

  return (
    <>
      {error && items.length > 0 ? (
        <div className="border-border border-b px-4 sm:px-5">
          <CrmErrorAlert message={error} />
        </div>
      ) : null}

      <div
        aria-hidden
        className={cn('table-header-edge', showMobileCards && 'max-md:hidden')}
      />

      {showMobileCards ? (
        <AttendanceRecordsMobileList
          items={items}
          canCorrectRecords={canCorrectRecords}
          onOpenDetail={(id) => void showDetail(id)}
          onOpenEdit={openEdit}
        />
      ) : null}

      <DataTable
        frame="flush"
        frameClassName="min-w-0 max-w-full"
        headerVariant="plain"
        className="min-w-0 max-w-full gap-0"
        tableClassName="table-fixed w-full [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-2.5 sm:[&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-2.5 sm:[&_[data-slot=table-cell]]:py-3"
        tableContainerClassName={cn(
          'min-w-0 max-w-full overflow-x-auto md:overflow-x-visible',
          showMobileCards && 'max-md:hidden',
        )}
        tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
        phase={tablePhase}
        colSpan={7}
        skeletonColumns={ATTENDANCE_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead
              className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.employee, ATTENDANCE_TABLE_HEAD_CLASS)}
            >
              Employee
            </TableHead>
            <TableHead
              className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.date, ATTENDANCE_TABLE_HEAD_CLASS)}
              title="Date"
            >
              Date
            </TableHead>
            <TableHead
              className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.punchIn, ATTENDANCE_TABLE_HEAD_CLASS)}
              title="Punch in"
            >
              Punch in
            </TableHead>
            <TableHead
              className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.punchOut, ATTENDANCE_TABLE_HEAD_CLASS)}
              title="Punch out"
            >
              Punch out
            </TableHead>
            <TableHead
              className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.hours, ATTENDANCE_TABLE_HEAD_CLASS)}
              title="Working hours"
            >
              <span className="hidden xl:inline">Working hours</span>
              <span className="xl:hidden">Hours</span>
            </TableHead>
            <TableHead
              className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.result, ATTENDANCE_TABLE_HEAD_CLASS)}
              title="Result"
            >
              Result
            </TableHead>
            <TableHead
              className={cn(
                ATTENDANCE_TABLE_COLUMN_CLASS.actions,
                ATTENDANCE_TABLE_HEAD_CLASS,
                'text-right',
              )}
            >
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        }
        empty={emptyTableContent}
        errorMessage={error}
        onRetry={() => refreshAll()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            className="border-border min-w-0 max-w-full border-t px-4 py-3 sm:px-5"
            page={safePage}
            pageSize={pageSize}
            total={total}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {items.map((row) => {
          const timeZone = row.scheduleSnapshot.timeZone;
          return (
            <TableRow
              key={row.id}
              className="border-0 cursor-pointer"
              onClick={() => void showDetail(row.id)}
            >
              <TableCell className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.employee, 'min-w-0 overflow-hidden')}>
                <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <EmployeeAvatar displayName={row.employeeDisplayName} className="size-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-foreground line-clamp-2 text-[13px] leading-snug font-semibold">
                          {row.employeeDisplayName}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{row.employeeDisplayName}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-muted-foreground truncate font-mono text-[10px]">
                          {row.employeeCode}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top">{row.employeeCode}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TableCell>
              <TableCell
                className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.date, ATTENDANCE_TABLE_COMPACT_CELL, 'text-sm')}
              >
                {formatAttendanceDate(row.attendanceDate, timeZone)}
              </TableCell>
              <TableCell
                className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.punchIn, ATTENDANCE_TABLE_COMPACT_CELL, 'text-sm')}
              >
                {formatIsoTime(row.punchInAt, timeZone)}
              </TableCell>
              <TableCell
                className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.punchOut, ATTENDANCE_TABLE_COMPACT_CELL, 'text-sm')}
              >
                {formatIsoTime(row.punchOutAt, timeZone)}
              </TableCell>
              <TableCell
                className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.hours, ATTENDANCE_TABLE_COMPACT_CELL, 'text-sm')}
              >
                {formatAttendanceWorkingHours(row.workingMinutes, row.punchInAt, row.punchOutAt)}
              </TableCell>
              <TableCell className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.result, 'whitespace-normal px-2 py-2')}>
                <AttendanceResult row={row} />
              </TableCell>
              <TableCell
                className={cn(ATTENDANCE_TABLE_COLUMN_CLASS.actions, 'text-right')}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-0.5">
                  <TableIconButton
                    label={`View attendance for ${row.employeeDisplayName}`}
                    tone="primary"
                    onClick={() => void showDetail(row.id)}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                  </TableIconButton>
                  {canCorrectRecords ? (
                    <TableIconButton
                      label={`Edit attendance for ${row.employeeDisplayName}`}
                      tone="default"
                      className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                      onClick={() => openEdit(row.id)}
                    >
                      <SquarePen className="size-4" aria-hidden="true" />
                    </TableIconButton>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>

      <AttendanceRecordDetailSheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetail(null);
        }}
        detail={detail}
        loading={detailLoading}
      />

      <AttendanceEditRecordDialog
        open={editOpen}
        recordId={editRecordId}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditRecordId(null);
        }}
        onSaved={() => refreshAll()}
      />
    </>
  );
}
