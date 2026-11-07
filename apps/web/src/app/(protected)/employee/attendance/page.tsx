import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminAttendanceWorkspace } from '@/features/admin/attendance/components/admin-attendance-workspace';

export default function EmployeeAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminAttendanceWorkspace scope="self" />
    </Suspense>
  );
}
