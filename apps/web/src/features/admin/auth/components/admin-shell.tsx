'use client';

import { LayoutDashboard, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TechwinLogo, TechwinMark } from '@/shared/components/techwin-logo';
import { cn } from '@/shared/lib/utils';
import { initialsOf } from '@/shared/lib/format';
import { useAuthenticatedAdmin, useAdminSession } from '../hooks/use-admin-session';

const NAV = [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin } = useAuthenticatedAdmin();
  const { signOut, isSigningOut } = useAdminSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-dvh min-w-0">
      <aside className="bg-card hidden w-60 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <TechwinLogo subtitle="Admin" />
        </div>
        <SidebarNav pathname={pathname} />
        <div className="mt-auto border-t p-3">
          <p className="text-muted-foreground truncate px-2 text-xs">{admin.email}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 border-b px-3 sm:px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="flex h-14 items-center border-b px-4 pr-12">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetDescription className="sr-only">Platform administration</SheetDescription>
                <TechwinLogo subtitle="Admin" />
              </div>
              <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TechwinMark className="size-7 lg:hidden" />
            <p className="truncate text-sm font-medium">Dashboard</p>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <span
              className="bg-accent text-accent-foreground hidden size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:flex"
              aria-hidden="true"
            >
              {initialsOf(admin.displayName)}
            </span>
            <span className="hidden min-w-0 truncate text-sm sm:inline">{admin.displayName}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void signOut()}
              disabled={isSigningOut}
            >
              <LogOut aria-hidden="true" />
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="grid gap-1 p-3">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
