import type { ReactNode } from 'react';
import { AdminAccessProvider } from '@/features/admin/auth/components/admin-access-provider';
import { ToastProvider } from '@/features/admin/components/toast';
import { PortalGate } from '@/features/auth/components/portal-gate';
import { EmployeeAccessProvider } from '@/features/employee/components/employee-access-provider';
import { EmployeeShell } from '@/features/employee/components/employee-shell';

export default function ProtectedEmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <PortalGate portal="employee">
      <ToastProvider>
        <EmployeeAccessProvider>
          <AdminAccessProvider>
            <EmployeeShell>{children}</EmployeeShell>
          </AdminAccessProvider>
        </EmployeeAccessProvider>
      </ToastProvider>
    </PortalGate>
  );
}
