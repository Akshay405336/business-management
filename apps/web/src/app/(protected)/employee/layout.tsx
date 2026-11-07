import type { ReactNode } from 'react';
import { AdminAccessProvider } from '@/features/admin/auth/components/admin-access-provider';
import { AdminShell } from '@/features/admin/auth/components/admin-shell';
import { ToastProvider } from '@/features/admin/components/toast';

/** Unified shell; route access is permission-driven (same as admin). */
export default function ProtectedEmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AdminAccessProvider>
        <AdminShell>{children}</AdminShell>
      </AdminAccessProvider>
    </ToastProvider>
  );
}
