import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadsPage } from '@/features/admin/crm/components/leads-page';

export default function AdminLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <LeadsPage />
    </Suspense>
  );
}
