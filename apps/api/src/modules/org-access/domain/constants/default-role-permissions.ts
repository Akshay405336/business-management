import {
  PERMISSION_KEYS,
  SYSTEM_ROLE_KEYS,
  USER_ADMINISTRATION_PERMISSIONS,
  type PermissionKey,
} from '@techwin/contracts';

export { SYSTEM_ROLE_KEYS };

export const OWNER_PERMISSIONS: readonly PermissionKey[] = PERMISSION_KEYS;

const USER_ADMIN_SET = new Set<string>(USER_ADMINISTRATION_PERMISSIONS);

export const ORG_ADMIN_PERMISSIONS: readonly PermissionKey[] = PERMISSION_KEYS.filter(
  (key) => !USER_ADMIN_SET.has(key),
);

export const PROJECT_MANAGER_PERMISSIONS: readonly PermissionKey[] = [
  'leads.read',
  'leads.create',
  'leads.update',
  'leads.delete',
  'clients.read',
  'clients.create',
  'clients.update',
  'employees.read',
  'employees.create',
  'employees.update',
  'settings.read',
];

export const SALES_PERMISSIONS: readonly PermissionKey[] = [
  'leads.read',
  'leads.create',
  'leads.update',
  'leads.delete',
  'clients.read',
  'settings.read',
];

export const FINANCIAL_PERMISSIONS: readonly PermissionKey[] = [
  'finance.read',
  'finance.manage',
  'expenses.read',
  'expenses.create',
  'expenses.update',
  'expenses.approve',
  'expenses.delete',
];

export const MEMBER_PERMISSIONS: readonly PermissionKey[] = [
  'employees.read',
  'leads.read',
  'clients.read',
  'projects.read',
  'tasks.read',
  'settings.read',
];

export const DEFAULT_SYSTEM_ROLES: readonly {
  key: string;
  name: string;
  description: string;
  permissions: readonly PermissionKey[];
}[] = [
  {
    key: SYSTEM_ROLE_KEYS.owner,
    name: 'Owner',
    description: 'Full organization administration including users and roles.',
    permissions: OWNER_PERMISSIONS,
  },
  {
    key: SYSTEM_ROLE_KEYS.admin,
    name: 'Admin',
    description: 'Full business module access without user or role administration.',
    permissions: ORG_ADMIN_PERMISSIONS,
  },
  {
    key: SYSTEM_ROLE_KEYS.projectManager,
    name: 'Project Manager',
    description: 'Leads and human resources operations.',
    permissions: PROJECT_MANAGER_PERMISSIONS,
  },
  {
    key: SYSTEM_ROLE_KEYS.sales,
    name: 'Sales',
    description: 'Leads and client-facing sales operations.',
    permissions: SALES_PERMISSIONS,
  },
  {
    key: SYSTEM_ROLE_KEYS.financial,
    name: 'Financial',
    description: 'Finance and expense operations.',
    permissions: FINANCIAL_PERMISSIONS,
  },
  {
    key: SYSTEM_ROLE_KEYS.member,
    name: 'Member',
    description: 'Read-only access to common modules.',
    permissions: MEMBER_PERMISSIONS,
  },
];
