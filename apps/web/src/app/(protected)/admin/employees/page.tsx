import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeesPage } from '@/features/admin/employees/components/employees-page';

export default function AdminEmployeesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-6xl gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EmployeesPage />
    </Suspense>
  );
}
