'use client';

import { useEmployeeAttendancePage } from '@/features/employee/hooks/use-employee-attendance-page';
import { EmployeeAttendanceTodayCard } from '@/features/employee/components/employee-attendance-today-card';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { useAttendanceRecordsContext } from './attendance-records-context';

export function AttendanceSelfPunchPanel() {
  const page = useEmployeeAttendancePage();
  const { refreshAll } = useAttendanceRecordsContext();

  const onPunchIn = async () => {
    const ok = await page.onPunchIn();
    if (ok) await refreshAll();
  };

  const onPunchOut = async () => {
    const ok = await page.onPunchOut();
    if (ok) await refreshAll();
  };

  if (page.todayError && !page.today) {
    return <CrmErrorAlert message={page.todayError} />;
  }

  return (
    <div className="border-b border-border/60 px-4 py-4 sm:px-5">
      <EmployeeAttendanceTodayCard
        today={page.today}
        loading={page.todayLoading}
        clockMs={page.clockMs}
        punchAction={page.punchAction}
        onPunchIn={() => void onPunchIn()}
        onPunchOut={() => void onPunchOut()}
      />
    </div>
  );
}
