import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyTasksHistoryPage } from '@/features/admin/daily-tasks/components/daily-tasks-history-page';

export default function AdminDailyTasksHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <DailyTasksHistoryPage />
    </Suspense>
  );
}
