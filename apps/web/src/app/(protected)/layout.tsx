import type { ReactNode } from 'react';
import { AdminSessionProvider } from '@/features/admin/auth/components/admin-session-provider';
import { PermissionsProvider } from '@/features/auth/components/permissions-provider';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <PermissionsProvider>{children}</PermissionsProvider>
    </AdminSessionProvider>
  );
}
