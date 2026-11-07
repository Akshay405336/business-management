import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminDailyTasksWorkspace } from '@/features/admin/daily-tasks/components/admin-daily-tasks-workspace';

export default function AdminDailyTasksPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminDailyTasksWorkspace />
    </Suspense>
  );
}
