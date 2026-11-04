import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminOrgCalendarWorkspace } from '@/features/admin/org-calendar/components/admin-org-calendar-workspace';

export default function AdminCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-[1400px] gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AdminOrgCalendarWorkspace />
    </Suspense>
  );
}
