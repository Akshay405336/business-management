import type { ReactNode } from 'react';
import { AdminAccessProvider } from '@/features/admin/auth/components/admin-access-provider';
import { AdminShell } from '@/features/admin/auth/components/admin-shell';
import { ToastProvider } from '@/features/admin/components/toast';

/** Same application shell as admin; legacy `/project-manager` URLs remain supported. */
export default function ProjectManagerLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminAccessProvider>
        <AdminShell>{children}</AdminShell>
      </AdminAccessProvider>
    </ToastProvider>
  );
}
