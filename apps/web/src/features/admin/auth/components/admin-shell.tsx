'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  adminPageTitle,
  isNavItemActive,
  type AdminNavGroup,
  type AdminNavLink,
} from '@/features/admin/navigation/admin-nav-config';
import {
  AdminAppHeader,
  AdminHeaderSidebarToggle,
  AdminMobileNavTrigger,
} from './admin-app-header';
import { useAdminAccess } from './admin-access-provider';
import { TechwinLogo, TechwinMark } from '@/shared/components/techwin-logo';
import { cn } from '@/shared/lib/utils';
import { useAuthenticatedAdmin } from '../hooks/use-admin-session';

const NAV_ICON_CLASS = 'size-[18px] shrink-0 stroke-[1.75]';

/** CRM and Project Management always use a text heading + submenu, even with one link. */
const COLLAPSIBLE_GROUP_IDS = new Set(['crm', 'projects']);

function navLinksInGroup(group: AdminNavGroup): AdminNavLink[] {
  return group.items.filter((item): item is AdminNavLink => item.kind === 'link');
}

function allNavLinks(groups: readonly AdminNavGroup[]): AdminNavLink[] {
  return groups.flatMap((group) => navLinksInGroup(group));
}

function usesCollapsibleGroup(group: AdminNavGroup): boolean {
  if (group.id === 'overview') return false;
  if (COLLAPSIBLE_GROUP_IDS.has(group.id)) return true;
  return navLinksInGroup(group).length > 1;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin } = useAuthenticatedAdmin();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const title = adminPageTitle(pathname);

  return (
    <div className="bg-background relative flex h-dvh max-h-dvh min-w-0 overflow-hidden">
      <AdminHeaderSidebarToggle
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        className="absolute top-7 z-30 hidden -translate-x-1/2 -translate-y-1/2 lg:inline-flex"
        style={{
          left: sidebarCollapsed
            ? 'var(--workspace-sidebar-width-collapsed)'
            : 'var(--workspace-sidebar-width)',
        }}
      />
      <aside
        data-admin-chrome
        data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
        className={cn(
          'admin-sidebar-shell hidden h-full shrink-0 bg-white lg:block print:hidden',
          sidebarCollapsed
            ? 'w-[var(--workspace-sidebar-width-collapsed)] max-w-[var(--workspace-sidebar-width-collapsed)]'
            : 'w-[var(--workspace-sidebar-width)] max-w-[var(--workspace-sidebar-width)]',
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div
            className={cn(
              'shrink-0 pt-4 pb-3',
              sidebarCollapsed ? 'flex justify-center px-2' : 'px-3',
            )}
          >
            {sidebarCollapsed ? (
              <TechwinMark className="size-8" />
            ) : (
              <TechwinLogo compact title="Techwin Pvt Ltd" />
            )}
          </div>
          <SidebarNav
            pathname={pathname}
            collapsed={sidebarCollapsed}
            className="min-h-0 flex-1 pt-4"
          />
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <AdminAppHeader
          title={title}
          admin={admin}
          mobileNavTrigger={
            <AdminMobileNavTrigger onClick={() => setMobileOpen(true)} />
          }
        />

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="flex w-[min(100vw,280px)] flex-col border-0 bg-white p-0"
          >
            <div className="shrink-0 px-3 pt-4 pb-3 pr-12">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Platform administration</SheetDescription>
              <TechwinLogo compact title="Techwin Pvt Ltd" />
            </div>
            <SidebarNav
              pathname={pathname}
              collapsed={false}
              className="min-h-0 flex-1 pt-4"
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 print:overflow-visible print:px-0 print:py-0">
          <TooltipProvider>{children}</TooltipProvider>
        </main>
      </div>
    </div>
  );
}

function defaultExpandedForGroups(groups: readonly AdminNavGroup[]): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  for (const group of groups) {
    if (usesCollapsibleGroup(group)) initial[group.id] = true;
  }
  return initial;
}

function SidebarNav({
  pathname,
  onNavigate,
  className,
  collapsed = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
}) {
  const { navGroups } = useAdminAccess();
  const navLinks = allNavLinks(navGroups);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    defaultExpandedForGroups(navGroups),
  );

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };
      let changed = false;
      for (const group of navGroups) {
        if (usesCollapsibleGroup(group) && next[group.id] === undefined) {
          next[group.id] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [navGroups]);

  const toggleGroup = (groupId: string) => {
    setExpanded((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  if (collapsed) {
    return (
      <nav
        aria-label="Admin"
        className={cn(
          'scrollbar-hide overflow-x-hidden overflow-y-auto px-1.5 pb-2',
          className,
        )}
      >
        <div className="flex flex-col gap-0.5">
          {navLinks.map((item) => {
            const active = isNavItemActive(pathname, item, navLinks);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : 'false'}
                className={cn('admin-nav-item admin-nav-item-icon-only')}
              >
                <item.icon className={NAV_ICON_CLASS} aria-hidden="true" />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Admin"
      className={cn(
        'scrollbar-hide overflow-x-hidden overflow-y-auto px-2 pb-2',
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        {navGroups.map((group) => {
          const links = navLinksInGroup(group);
          if (links.length === 0) return null;

          if (!usesCollapsibleGroup(group)) {
            const link = links[0];
            if (!link) return null;
            const active = isNavItemActive(pathname, link, navLinks);
            return (
              <Link
                key={group.id}
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : 'false'}
                className="admin-nav-item"
              >
                <link.icon className={NAV_ICON_CLASS} aria-hidden="true" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          }

          const isOpen = expanded[group.id] ?? true;

          return (
            <div key={group.id} className="flex flex-col gap-0.5 pt-1 first:pt-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="admin-nav-group-trigger"
              >
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown
                  className={cn(
                    'admin-nav-group-chevron size-3.5 shrink-0 stroke-[1.75] transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <div className="flex flex-col gap-0.5 pb-0.5">
                  {links.map((item) => {
                    const active = isNavItemActive(pathname, item, navLinks);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        data-active={active ? 'true' : 'false'}
                        className="admin-nav-subitem"
                      >
                        <item.icon className={NAV_ICON_CLASS} aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
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
