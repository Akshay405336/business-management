'use client';

import { Loader2 } from 'lucide-react';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { useEmployeeAttendancePage } from '../hooks/use-employee-attendance-page';
import { EmployeeAttendanceHistorySection } from './employee-attendance-history-section';
import { EmployeeAttendanceTodayCard } from './employee-attendance-today-card';

export function EmployeeAttendanceWorkspace() {
  const page = useEmployeeAttendancePage();

  if (page.todayLoading && !page.today && !page.todayError) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-[1100px] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-3">
      <header className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-[#1E293B] sm:text-2xl">Attendance</h1>
        <p className="text-xs text-[#64748B] sm:text-sm">Punch in and out from a desktop browser.</p>
      </header>

      {page.todayError && !page.today ? (
        <CrmErrorAlert message={page.todayError} />
      ) : (
        <EmployeeAttendanceTodayCard
          today={page.today}
          loading={page.todayLoading}
          clockMs={page.clockMs}
          punchAction={page.punchAction}
          onPunchIn={() => void page.onPunchIn()}
          onPunchOut={() => void page.onPunchOut()}
        />
      )}

      <EmployeeAttendanceHistorySection
        history={page.history}
        historyLoading={page.historyLoading}
        historyError={page.historyError}
        timeZone={page.timeZone}
        filterDate={page.filterDate}
        filterFrom={page.filterFrom}
        filterTo={page.filterTo}
        statusFilter={page.statusFilter}
        filtersActive={page.filtersActive}
        page={page.page}
        pageSize={page.pageSize}
        onFilterDate={page.setFilterDate}
        onFilterFrom={page.setFilterFrom}
        onFilterTo={page.setFilterTo}
        onStatusFilter={page.setStatusFilter}
        onPageChange={page.setPage}
        onPageSizeChange={page.setPageSize}
        onClearFilters={page.clearFilters}
        onRetry={() => page.reloadHistory()}
      />
    </div>
  );
}
