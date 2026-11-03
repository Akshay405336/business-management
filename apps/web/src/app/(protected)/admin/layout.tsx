import type { ReactNode } from 'react';
import { AdminAccessProvider } from '@/features/admin/auth/components/admin-access-provider';
import { AdminShell } from '@/features/admin/auth/components/admin-shell';
import { ToastProvider } from '@/features/admin/components/toast';
import { PortalGate } from '@/features/auth/components/portal-gate';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGate portal="admin">
      <ToastProvider>
        <AdminAccessProvider>
          <AdminShell>{children}</AdminShell>
        </AdminAccessProvider>
      </ToastProvider>
    </PortalGate>
  );
}
