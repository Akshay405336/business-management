import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeLeaveWorkspace } from '@/features/employee/components/employee-leave-workspace';

export default function EmployeeLeavePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1100px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EmployeeLeaveWorkspace />
    </Suspense>
  );
}
