import type { PermissionKey } from '@techwin/contracts';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Briefcase,
  FileText,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Smartphone,
  UserCircle2,
  Users,
} from 'lucide-react';
import { canAccessProjectManagerPath } from './project-manager-route-permissions';

export type ProjectManagerNavLink = {
  kind: 'link';
  href: string;
  label: string;
  icon: LucideIcon;
};

export type ProjectManagerNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: readonly ProjectManagerNavLink[];
};

/** Navigation for the `/project-manager` portal only (no admin organization routes). */
export const PROJECT_MANAGER_NAV_GROUPS: readonly ProjectManagerNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      {
        kind: 'link',
        href: '/project-manager/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        kind: 'link',
        href: '/project-manager/profile',
        label: 'Profile',
        icon: UserCircle2,
      },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    items: [
      { kind: 'link', href: '/project-manager/pipeline', label: 'Pipeline', icon: GitBranch },
      { kind: 'link', href: '/project-manager/leads', label: 'Leads', icon: Users },
      { kind: 'link', href: '/project-manager/packages', label: 'Service Packages', icon: Package },
      { kind: 'link', href: '/project-manager/quotations', label: 'Quotations', icon: FileText },
      { kind: 'link', href: '/project-manager/clients', label: 'Clients', icon: UserCircle2 },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: MessageCircle,
    items: [
      { kind: 'link', href: '/project-manager/whatsapp/inbox', label: 'WhatsApp Inbox', icon: Inbox },
      { kind: 'link', href: '/project-manager/whatsapp/channels', label: 'WhatsApp Channels', icon: Smartphone },
      { kind: 'link', href: '/project-manager/whatsapp/templates', label: 'Templates', icon: FileText },
      { kind: 'link', href: '/project-manager/whatsapp/broadcasts', label: 'Broadcasts', icon: Megaphone },
      { kind: 'link', href: '/project-manager/whatsapp/reports', label: 'WhatsApp Reports', icon: BarChart3 },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: Briefcase,
    items: [
      { kind: 'link', href: '/project-manager/employees', label: 'Employees', icon: Users },
    ],
  },
];

export function filterProjectManagerNav(
  permissions: readonly PermissionKey[],
): readonly ProjectManagerNavGroup[] {
  const granted = new Set(permissions);
  const groups: ProjectManagerNavGroup[] = [];
  for (const group of PROJECT_MANAGER_NAV_GROUPS) {
    const items = group.items.filter((item) => canAccessProjectManagerPath(item.href, granted));
    if (items.length > 0) groups.push({ ...group, items });
  }
  return groups;
}

export function projectManagerPageTitle(pathname: string): string {
  for (const group of PROJECT_MANAGER_NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.label;
    }
  }
  return 'Project Manager';
}
