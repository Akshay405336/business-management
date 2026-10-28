import type { PermissionKey } from '@techwin/contracts';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Shield,
  Target,
  UserCircle2,
  Users,
  Wallet,
  WalletCards,
} from 'lucide-react';

export type AdminNavLink = {
  kind: 'link';
  href: string;
  label: string;
  icon: LucideIcon;
  requiredPermissions: readonly PermissionKey[];
};

export type AdminNavSoon = {
  kind: 'soon';
  label: string;
  icon: LucideIcon;
  requiredPermissions: readonly PermissionKey[];
};

export type AdminNavItem = AdminNavLink | AdminNavSoon;

export type AdminNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      {
        kind: 'link',
        href: '/admin/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        requiredPermissions: [],
      },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    items: [
      {
        kind: 'link',
        href: '/admin/pipeline',
        label: 'Pipeline',
        icon: GitBranch,
        requiredPermissions: ['leads.read'],
      },
      {
        kind: 'link',
        href: '/admin/leads',
        label: 'Leads',
        icon: Users,
        requiredPermissions: ['leads.read'],
      },
      {
        kind: 'link',
        href: '/admin/packages',
        label: 'Service Packages',
        icon: Package,
        requiredPermissions: ['settings.read'],
      },
      {
        kind: 'link',
        href: '/admin/proposals',
        label: 'Proposals & Quotations',
        icon: FileText,
        requiredPermissions: ['leads.read'],
      },
      {
        kind: 'link',
        href: '/admin/clients',
        label: 'Clients',
        icon: UserCircle2,
        requiredPermissions: ['clients.read'],
      },
    ],
  },
  {
    id: 'projects',
    label: 'Project Management',
    icon: FolderKanban,
    items: [
      {
        kind: 'link',
        href: '/admin/project-tasks',
        label: 'Project Management',
        icon: FolderKanban,
        requiredPermissions: ['tasks.read', 'projects.read'],
      },
      { kind: 'soon', label: 'Milestones', icon: Target, requiredPermissions: ['projects.read'] },
      { kind: 'soon', label: 'Team Assignments', icon: Users, requiredPermissions: ['projects.read'] },
      { kind: 'soon', label: 'Project Reports', icon: BarChart3, requiredPermissions: ['projects.read'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Expenses',
    icon: Wallet,
    items: [
      { kind: 'soon', label: 'Finance Dashboard', icon: WalletCards, requiredPermissions: ['finance.read'] },
      { kind: 'soon', label: 'Invoices', icon: Receipt, requiredPermissions: ['finance.read'] },
      { kind: 'soon', label: 'Payments', icon: CreditCard, requiredPermissions: ['finance.read'] },
      { kind: 'soon', label: 'Expenses', icon: Wallet, requiredPermissions: ['expenses.read'] },
      { kind: 'soon', label: 'Budgets', icon: BarChart3, requiredPermissions: ['finance.manage'] },
      { kind: 'soon', label: 'Financial Reports', icon: FileText, requiredPermissions: ['finance.read'] },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: Briefcase,
    items: [
      {
        kind: 'link',
        href: '/admin/employees',
        label: 'Employees',
        icon: Users,
        requiredPermissions: ['employees.read'],
      },
      { kind: 'soon', label: 'Departments', icon: Building2, requiredPermissions: ['employees.read'] },
      { kind: 'soon', label: 'Attendance', icon: CalendarDays, requiredPermissions: ['employees.read'] },
      { kind: 'soon', label: 'Leave Management', icon: CalendarDays, requiredPermissions: ['employees.read'] },
      { kind: 'soon', label: 'Payroll', icon: Wallet, requiredPermissions: ['employees.read'] },
      { kind: 'soon', label: 'Performance', icon: BarChart3, requiredPermissions: ['employees.read'] },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    items: [
      {
        kind: 'link',
        href: '/admin/users',
        label: 'Users',
        icon: Users,
        requiredPermissions: ['users.read'],
      },
      {
        kind: 'link',
        href: '/admin/roles',
        label: 'Roles & Permissions',
        icon: Shield,
        requiredPermissions: ['roles.read'],
      },
      { kind: 'soon', label: 'Audit Logs', icon: ClipboardList, requiredPermissions: ['settings.read'] },
      { kind: 'soon', label: 'Settings', icon: Settings, requiredPermissions: ['settings.read'] },
    ],
  },
] as const;

export const ADMIN_DASHBOARD_HREF = '/admin/dashboard';

function normalizePath(path: string): string {
  if (path.length <= 1) return path;
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function effectivePathname(pathname: string): string {
  const current = normalizePath(pathname);
  return current === '/admin' ? ADMIN_DASHBOARD_HREF : current;
}

function hrefMatchesPath(href: string, current: string): boolean {
  if (href === ADMIN_DASHBOARD_HREF) {
    return current === ADMIN_DASHBOARD_HREF;
  }
  return current === href || current.startsWith(`${href}/`);
}

/** Longest matching href wins so only one nav item is active. Dashboard is exact-match only. */
export function resolveActiveNavHref(
  pathname: string,
  links: readonly AdminNavLink[],
): string | null {
  const current = effectivePathname(pathname);
  let best: { href: string; length: number } | null = null;

  for (const item of links) {
    const href = normalizePath(item.href);
    if (!hrefMatchesPath(href, current)) continue;
    if (!best || href.length > best.length) {
      best = { href, length: href.length };
    }
  }

  return best?.href ?? null;
}

export function isNavItemActive(
  pathname: string,
  item: AdminNavLink,
  links?: readonly AdminNavLink[],
): boolean {
  const href = normalizePath(item.href);
  if (links) {
    const activeHref = resolveActiveNavHref(pathname, links);
    return activeHref !== null && href === activeHref;
  }
  const current = effectivePathname(pathname);
  return hrefMatchesPath(href, current);
}

export function isNavGroupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.items.some((item) => item.kind === 'link' && isNavItemActive(pathname, item));
}

export function adminPageTitle(pathname: string): string {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.kind === 'link' && isNavItemActive(pathname, item)) return item.label;
    }
  }
  return 'Admin';
}
