'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { TechwinMark } from '@/shared/components/techwin-logo';
import { cn } from '@/shared/lib/utils';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { filterEmployeeNav } from './employee-access-provider';
import {
  AdminAppHeader,
  AdminMobileNavTrigger,
} from '@/features/admin/auth/components/admin-app-header';

export function EmployeeShell({ children }: { children: ReactNode }) {
  const { admin } = useAuthenticatedAdmin();
  const { permissions } = usePermissions();
  const pathname = usePathname();
  const navItems = filterEmployeeNav(permissions);

  return (
    <div className="bg-background relative flex h-dvh max-h-dvh min-w-0 overflow-hidden">
      <aside className="hidden w-[var(--workspace-sidebar-width)] max-w-[var(--workspace-sidebar-width)] shrink-0 border-r border-slate-200 bg-white lg:block print:hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-[var(--workspace-header-height)] items-center gap-2 border-b border-slate-200 px-4">
            <TechwinMark className="size-8 text-[#128C7E]" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-900">Employee</span>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Employee navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
            Signed in as {admin.displayName}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminAppHeader
          title="Employee portal"
          admin={admin}
          mobileNavTrigger={<AdminMobileNavTrigger />}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
