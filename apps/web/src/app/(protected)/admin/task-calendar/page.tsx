import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyTasksWorkspace } from '@/features/admin/daily-tasks/components/daily-tasks-workspace';

export default function AdminTaskCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <DailyTasksWorkspace
        title="Task calendar"
        description="Calendar view of daily tasks by assigned date."
        defaultView="calendar"
      />
    </Suspense>
  );
}
