'use client';

import type { PermissionKey } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, type ReactNode } from 'react';
import { canAccessEmployeePath } from '@/features/employee/navigation/employee-route-permissions';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export type EmployeeNavItem = {
  readonly href: string;
  readonly label: string;
};

export function filterEmployeeNav(permissions: readonly PermissionKey[]): EmployeeNavItem[] {
  const granted = new Set(permissions);
  const items: EmployeeNavItem[] = [
    { href: '/employee/dashboard', label: 'Dashboard' },
    { href: '/employee/daily-tasks', label: 'My tasks' },
    { href: '/employee/attendance', label: 'Attendance' },
    { href: '/employee/calendar', label: 'Calendar' },
  ];
  return items.filter((item) => canAccessEmployeePath(item.href, granted));
}

export function EmployeeAccessProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { permissions, permissionSet } = usePermissions();

  const navItems = useMemo(() => filterEmployeeNav(permissions), [permissions]);

  const redirectTarget = useMemo(() => {
    if (canAccessEmployeePath(pathname, permissionSet)) return null;
    const fallback = navItems[0]?.href ?? '/employee/dashboard';
    return pathname !== fallback ? fallback : null;
  }, [navItems, pathname, permissionSet]);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  if (redirectTarget) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center px-4">
        <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Redirecting…
        </p>
      </div>
    );
  }

  return children;
}
