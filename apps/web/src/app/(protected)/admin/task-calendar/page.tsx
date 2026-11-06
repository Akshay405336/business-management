import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCalendarPage } from '@/features/project-management/task-calendar';

export default function AdminTaskCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3 px-3 py-4 sm:px-5">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      }
    >
      <TaskCalendarPage />
    </Suspense>
  );
}
