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
};

export type AdminNavSoon = {
  kind: 'soon';
  label: string;
  icon: LucideIcon;
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
    items: [{ kind: 'link', href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    items: [
      { kind: 'link', href: '/admin/pipeline', label: 'Pipeline', icon: GitBranch },
      { kind: 'link', href: '/admin/leads', label: 'Leads', icon: Users },
      { kind: 'link', href: '/admin/packages', label: 'Service Packages', icon: Package },
      { kind: 'link', href: '/admin/proposals', label: 'Proposals & Quotations', icon: FileText },
      { kind: 'link', href: '/admin/clients', label: 'Clients', icon: UserCircle2 },
    ],
  },
  {
    id: 'projects',
    label: 'Project Management',
    icon: FolderKanban,
    items: [
      { kind: 'link', href: '/admin/project-tasks', label: 'Project Management', icon: FolderKanban },
      { kind: 'soon', label: 'Milestones', icon: Target },
      { kind: 'soon', label: 'Team Assignments', icon: Users },
      { kind: 'soon', label: 'Project Reports', icon: BarChart3 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Expenses',
    icon: Wallet,
    items: [
      { kind: 'soon', label: 'Finance Dashboard', icon: WalletCards },
      { kind: 'soon', label: 'Invoices', icon: Receipt },
      { kind: 'soon', label: 'Payments', icon: CreditCard },
      { kind: 'soon', label: 'Expenses', icon: Wallet },
      { kind: 'soon', label: 'Budgets', icon: BarChart3 },
      { kind: 'soon', label: 'Financial Reports', icon: FileText },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: Briefcase,
    items: [
      { kind: 'soon', label: 'Employees', icon: Users },
      { kind: 'soon', label: 'Departments', icon: Building2 },
      { kind: 'soon', label: 'Attendance', icon: CalendarDays },
      { kind: 'soon', label: 'Leave Management', icon: CalendarDays },
      { kind: 'soon', label: 'Payroll', icon: Wallet },
      { kind: 'soon', label: 'Performance', icon: BarChart3 },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    items: [
      { kind: 'soon', label: 'Team Management', icon: Users },
      { kind: 'soon', label: 'Roles & Permissions', icon: Shield },
      { kind: 'soon', label: 'Audit Logs', icon: ClipboardList },
      { kind: 'soon', label: 'Settings', icon: Settings },
    ],
  },
] as const;

export function isNavItemActive(pathname: string, item: AdminNavLink): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
