import { Suspense } from 'react';
import { CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { ProjectTasksPage } from '@/features/admin/project-tasks/components/project-tasks-page';

export default function Page() {
  return (
    <Suspense fallback={<CrmLoadingRows rows={6} />}>
      <ProjectTasksPage />
    </Suspense>
  );
}
