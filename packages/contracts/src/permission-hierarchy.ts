import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  type PermissionDefinition,
  type PermissionKey,
} from './permissions.js';

/** Sidebar-aligned page bucket for grouping catalog permissions in the role editor. */
export type PermissionHierarchyPage = {
  readonly id: string;
  readonly label: string;
  /** Route when the page exists in admin nav; omitted for cross-cutting resources. */
  readonly href?: string;
  /** Permission keys enforced for this page (may overlap other pages when backend shares keys). */
  readonly permissionKeys: readonly PermissionKey[];
};

export type PermissionHierarchyGroup = {
  readonly id: string;
  readonly label: string;
  readonly pages: readonly PermissionHierarchyPage[];
};

export type PermissionHierarchyModule = {
  readonly id: string;
  readonly label: string;
  readonly groups: readonly PermissionHierarchyGroup[];
};

/**
 * Admin sidebar–aligned permission hierarchy. Keys must exist in {@link PERMISSION_KEYS}.
 * Page groupings reflect live routes and API `@RequirePermissions` usage.
 */
export const PERMISSION_HIERARCHY: readonly PermissionHierarchyModule[] = [
  {
    id: 'overview',
    label: 'Overview',
    groups: [
      {
        id: 'overview-main',
        label: 'Overview',
        pages: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            href: '/admin/dashboard',
            permissionKeys: [],
          },
        ],
      },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    groups: [
      {
        id: 'crm-sales',
        label: 'CRM',
        pages: [
          {
            id: 'pipeline',
            label: 'Pipeline',
            href: '/admin/pipeline',
            permissionKeys: ['leads.read', 'leads.update'],
          },
          {
            id: 'leads',
            label: 'Leads',
            href: '/admin/leads',
            permissionKeys: ['leads.read', 'leads.create', 'leads.update', 'leads.delete'],
          },
          {
            id: 'service-packages',
            label: 'Service Packages',
            href: '/admin/packages',
            permissionKeys: ['settings.read', 'settings.manage'],
          },
          {
            id: 'proposals',
            label: 'Proposals & Quotations',
            href: '/admin/proposals',
            permissionKeys: ['leads.read', 'leads.create', 'leads.update', 'leads.delete'],
          },
          {
            id: 'clients',
            label: 'Clients',
            href: '/admin/clients',
            permissionKeys: ['clients.read', 'clients.create', 'clients.update', 'clients.delete'],
          },
        ],
      },
    ],
  },
  {
    id: 'communications',
    label: 'Communications',
    groups: [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        pages: [
          {
            id: 'whatsapp-inbox',
            label: 'WhatsApp Inbox',
            href: '/admin/whatsapp/inbox',
            permissionKeys: [
              'whatsapp.read',
              'whatsapp.view_all',
              'whatsapp.reply',
              'whatsapp.assign',
            ],
          },
          {
            id: 'whatsapp-channels',
            label: 'WhatsApp Channels',
            href: '/admin/whatsapp/channels',
            permissionKeys: ['whatsapp.channels.manage'],
          },
          {
            id: 'whatsapp-templates',
            label: 'Templates',
            href: '/admin/whatsapp/templates',
            permissionKeys: ['whatsapp.templates.manage'],
          },
          {
            id: 'whatsapp-broadcasts',
            label: 'Broadcasts',
            href: '/admin/whatsapp/broadcasts',
            permissionKeys: ['whatsapp.broadcasts.manage'],
          },
          {
            id: 'whatsapp-reports',
            label: 'WhatsApp Reports',
            href: '/admin/whatsapp/reports',
            permissionKeys: ['whatsapp.view_all', 'whatsapp.channels.manage'],
          },
        ],
      },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    groups: [
      {
        id: 'task-workspace',
        label: 'Tasks',
        pages: [
          {
            id: 'daily-tasks',
            label: 'Daily Tasks',
            href: '/admin/daily-tasks',
            permissionKeys: [
              'tasks.read',
              'tasks.create',
              'tasks.update',
              'tasks.delete',
              'tasks.assign',
            ],
          },
          {
            id: 'task-calendar',
            label: 'Task Calendar',
            href: '/admin/task-calendar',
            permissionKeys: ['tasks.read'],
          },
        ],
      },
    ],
  },
  {
    id: 'projects',
    label: 'Project Management',
    groups: [
      {
        id: 'project-workspace',
        label: 'Project Management',
        pages: [
          {
            id: 'project-tasks',
            label: 'Project Management',
            href: '/admin/project-tasks',
            permissionKeys: [
              'tasks.read',
              'tasks.update',
              'tasks.delete',
              'tasks.assign',
              'projects.read',
              'projects.create',
              'projects.update',
              'projects.delete',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Expenses',
    groups: [
      {
        id: 'finance-main',
        label: 'Finance & Expenses',
        pages: [
          {
            id: 'finance-dashboard',
            label: 'Finance Dashboard',
            permissionKeys: ['finance.read', 'finance.manage'],
          },
          {
            id: 'expenses',
            label: 'Expenses',
            permissionKeys: [
              'expenses.read',
              'expenses.create',
              'expenses.update',
              'expenses.approve',
              'expenses.delete',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    groups: [
      {
        id: 'hr-main',
        label: 'Human Resources',
        pages: [
          {
            id: 'employees',
            label: 'Employees',
            href: '/admin/employees',
            permissionKeys: [
              'employees.read',
              'employees.create',
              'employees.update',
              'employees.compensation.read',
              'employees.compensation.manage',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    groups: [
      {
        id: 'organization-access',
        label: 'Organization',
        pages: [
          {
            id: 'users',
            label: 'Users',
            href: '/admin/users',
            permissionKeys: [
              'users.read',
              'users.create',
              'users.update',
              'users.deactivate',
              'users.manage_roles',
              'users.reset_password',
              'memberships.invite',
              'memberships.manage',
            ],
          },
          {
            id: 'roles',
            label: 'Roles & Permissions',
            href: '/admin/roles',
            permissionKeys: [
              'roles.read',
              'roles.create',
              'roles.update',
              'roles.delete',
              'permissions.read',
            ],
          },
          {
            id: 'settings',
            label: 'Settings',
            permissionKeys: ['settings.read', 'settings.manage'],
          },
          {
            id: 'media',
            label: 'Media & files',
            permissionKeys: ['media.read', 'media.upload', 'media.delete'],
          },
        ],
      },
    ],
  },
] as const;

const definitionByKey = new Map<PermissionKey, PermissionDefinition>(
  PERMISSION_DEFINITIONS.map((item) => [item.key, item]),
);

export function permissionDefinitionForKey(key: PermissionKey): PermissionDefinition {
  const found = definitionByKey.get(key);
  if (!found) {
    throw new Error(`Missing permission definition for key: ${key}`);
  }
  return found;
}

/** Unique permission keys referenced in the hierarchy (includes keys listed on multiple pages once). */
export function uniqueHierarchyPermissionKeys(
  hierarchy: readonly PermissionHierarchyModule[] = PERMISSION_HIERARCHY,
): readonly PermissionKey[] {
  const keys = new Set<PermissionKey>();
  for (const mod of hierarchy) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        for (const key of page.permissionKeys) {
          keys.add(key);
        }
      }
    }
  }
  return [...keys];
}

/** Ensures every catalog key appears on at least one hierarchy page. Keys may appear on multiple pages when backend shares them. */
export function assertPermissionHierarchyComplete(
  hierarchy: readonly PermissionHierarchyModule[] = PERMISSION_HIERARCHY,
): void {
  const seen = new Set<PermissionKey>();
  for (const mod of hierarchy) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        for (const key of page.permissionKeys) {
          seen.add(key);
        }
      }
    }
  }
  const missing = PERMISSION_KEYS.filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(`Permission hierarchy missing catalog keys: ${missing.join(', ')}`);
  }
}

assertPermissionHierarchyComplete();

export type FlattenedPermissionPage = PermissionHierarchyPage & {
  readonly moduleId: string;
  readonly moduleLabel: string;
  readonly groupId: string;
  readonly groupLabel: string;
};

export function flattenPermissionHierarchy(
  hierarchy: readonly PermissionHierarchyModule[] = PERMISSION_HIERARCHY,
): readonly FlattenedPermissionPage[] {
  const pages: FlattenedPermissionPage[] = [];
  for (const mod of hierarchy) {
    for (const group of mod.groups) {
      for (const page of group.pages) {
        if (page.permissionKeys.length === 0) continue;
        pages.push({
          ...page,
          moduleId: mod.id,
          moduleLabel: mod.label,
          groupId: group.id,
          groupLabel: group.label,
        });
      }
    }
  }
  return pages;
}
