import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ServicePackagesPage } from '@/features/admin/crm/components/service-packages-page';

export default function AdminServicePackagesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ServicePackagesPage />
    </Suspense>
  );
}
