import type { ReactNode } from 'react';
import { ToastProvider } from '@/features/admin/components/toast';
import { PortalGate } from '@/features/auth/components/portal-gate';
import { ProjectManagerAccessProvider } from '@/features/project-manager/components/project-manager-access-provider';
import { ProjectManagerShell } from '@/features/project-manager/components/project-manager-shell';

export default function ProjectManagerLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGate portal="project-manager">
      <ToastProvider>
        <ProjectManagerAccessProvider>
          <ProjectManagerShell>{children}</ProjectManagerShell>
        </ProjectManagerAccessProvider>
      </ToastProvider>
    </PortalGate>
  );
}
