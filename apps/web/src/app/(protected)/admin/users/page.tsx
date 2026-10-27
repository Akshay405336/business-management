import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { UsersPage } from '@/features/admin/org-access/components/users-page';

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full min-w-0 flex-col gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <UsersPage />
    </Suspense>
  );
}
