import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeAttendanceWorkspace } from '@/features/employee/components/employee-attendance-workspace';

export default function EmployeeAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1100px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EmployeeAttendanceWorkspace />
    </Suspense>
  );
}
