'use client';

import { ChevronDown, LogOut, Menu } from 'lucide-react';
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
import { adminPageTitle, isNavGroupActive, isNavItemActive, type AdminNavGroup } from '@/features/admin/navigation/admin-nav-config';
import { useAdminAccess } from './admin-access-provider';
import { TechwinLogo, TechwinMark } from '@/shared/components/techwin-logo';
import { cn } from '@/shared/lib/utils';
import { initialsOf } from '@/shared/lib/format';
import { useAuthenticatedAdmin, useAdminSession } from '../hooks/use-admin-session';

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin } = useAuthenticatedAdmin();
  const { signOut, isSigningOut } = useAdminSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = adminPageTitle(pathname);

  return (
    <div className="bg-background flex min-h-dvh min-w-0">
      <aside
        data-admin-chrome
        className="bg-card hidden w-64 shrink-0 flex-col border-r lg:flex print:hidden"
      >
        <div className="flex h-14 items-center border-b px-4">
          <TechwinLogo subtitle="Admin" />
        </div>
        <SidebarNav pathname={pathname} />
        <div className="mt-auto border-t p-3">
          <p className="text-muted-foreground truncate px-2 text-xs">{admin.email}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-admin-chrome
          className="bg-card sticky top-0 z-20 flex h-14 min-w-0 items-center gap-3 border-b px-3 sm:px-4 print:hidden"
        >
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
            <SheetContent side="left" className="w-72 p-0">
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
            <p className="truncate text-sm font-medium">{title}</p>
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

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 print:px-0 print:py-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { navGroups } = useAdminAccess();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      initial[group.id] = isNavGroupActive(pathname, group);
    }
    return initial;
  });

  const toggleGroup = (group: AdminNavGroup) => {
    setExpanded((current) => ({
      ...current,
      [group.id]: !current[group.id],
    }));
  };

  return (
    <nav
      aria-label="Admin"
      className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-2 lg:max-h-[calc(100dvh-8rem)]"
    >
      <div className="grid gap-0.5">
        {navGroups.map((group) => {
          const groupActive = isNavGroupActive(pathname, group);
          const isOpen = expanded[group.id] ?? groupActive;
          const singleLink =
            group.items.length === 1 && group.items[0]?.kind === 'link' ? group.items[0] : null;

          if (singleLink) {
            const active = isNavItemActive(pathname, singleLink);
            return (
              <Link
                key={group.id}
                href={singleLink.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <singleLink.icon className="size-4 shrink-0" aria-hidden="true" />
                {singleLink.label}
              </Link>
            );
          }

          return (
            <div key={group.id} className="grid gap-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={isOpen}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium',
                  groupActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <group.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown
                  className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <div className="grid gap-0.5 border-l border-border/60 pl-2 ml-3">
                  {group.items.map((item) => {
                    if (item.kind === 'link') {
                      const active = isNavItemActive(pathname, item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                            active
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <item.icon className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    }
                    return (
                      <div
                        key={item.label}
                        aria-disabled="true"
                        title="Coming soon"
                        className="text-muted-foreground flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm opacity-60"
                      >
                        <item.icon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <span className="text-[10px] font-medium tracking-wide uppercase">Soon</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
