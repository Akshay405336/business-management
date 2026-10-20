import type { ReactNode } from 'react';
import { AdminSessionProvider } from '@/features/admin/auth/components/admin-session-provider';
import { AdminShell } from '@/features/admin/auth/components/admin-shell';

export default function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
