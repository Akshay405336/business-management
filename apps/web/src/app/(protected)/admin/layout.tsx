import type { ReactNode } from 'react';
import { AdminSessionProvider } from '@/features/admin/auth/components/admin-session-provider';
import { AdminShell } from '@/features/admin/auth/components/admin-shell';
import { ToastProvider } from '@/features/admin/components/toast';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </AdminSessionProvider>
  );
}
