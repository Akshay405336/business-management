/** @deprecated Use `AdminDashboard` on `/employee/dashboard`. */
'use client';

import Link from 'next/link';
import { ClipboardList, LayoutDashboard } from 'lucide-react';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { filterEmployeeNav } from './employee-access-provider';

export function EmployeeDashboard() {
  const { permissions } = usePermissions();
  const links = filterEmployeeNav(permissions).filter((item) => item.href !== '/employee/dashboard');

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-600">
          Your employee workspace for assigned projects and daily tasks.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/employee/dashboard"
          className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
        >
          <LayoutDashboard className="size-5 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-medium text-slate-900">Dashboard</p>
            <p className="text-muted-foreground text-xs">Overview of your workspace</p>
          </div>
        </Link>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
          >
            <ClipboardList className="size-5 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="text-muted-foreground text-xs">Open {item.label.toLowerCase()}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
