/**
 * Canonical permission catalog. Permissions are defined in code only;
 * the database stores assignments by stable key.
 */
export const PERMISSION_KEYS = [
  'users.read',
  'users.create',
  'users.update',
  'users.deactivate',
  'users.manage_roles',
  'users.reset_password',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'permissions.read',
  'memberships.invite',
  'memberships.manage',
  'employees.read',
  'employees.create',
  'employees.update',
  'employees.compensation.read',
  'employees.compensation.manage',
  'media.read',
  'media.upload',
  'media.delete',
  'leads.read',
  'leads.create',
  'leads.update',
  'leads.delete',
  'clients.read',
  'clients.create',
  'clients.update',
  'clients.delete',
  'projects.read',
  'projects.create',
  'projects.update',
  'projects.delete',
  'tasks.read',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'tasks.assign',
  'tasks.progress',
  'tasks.comment',
  'daily_tasks.update_status',
  'daily_tasks.comment',
  'daily_tasks.manage_workflow',
  'daily_tasks.notes.create',
  'daily_tasks.notes.view_own',
  'daily_tasks.notes.view_all',
  'daily_tasks.notes.acknowledge',
  'finance.read',
  'finance.manage',
  'expenses.read',
  'expenses.create',
  'expenses.update',
  'expenses.approve',
  'expenses.delete',
  'settings.read',
  'settings.manage',
  'whatsapp.read',
  'whatsapp.view_all',
  'whatsapp.reply',
  'whatsapp.assign',
  'whatsapp.channels.manage',
  'whatsapp.templates.manage',
  'whatsapp.broadcasts.manage',
  'attendance.view_own',
  'attendance.view_all',
  'attendance.punch_in',
  'attendance.punch_out',
  'attendance.view_summary',
  'attendance.manage_settings',
  'attendance.correct_records',
  'attendance.manage_devices',
  'attendance.view_audit',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionDefinition = {
  readonly key: PermissionKey;
  readonly module: string;
  readonly action: string;
  readonly description: string;
};

export const USER_ADMINISTRATION_PERMISSIONS: readonly PermissionKey[] = [
  'users.read',
  'users.create',
  'users.update',
  'users.deactivate',
  'users.manage_roles',
  'users.reset_password',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  'permissions.read',
  'memberships.invite',
  'memberships.manage',
];

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  { key: 'users.read', module: 'Users', action: 'View', description: 'View organization members and invitations.' },
  { key: 'users.create', module: 'Users', action: 'Invite', description: 'Invite or create organization members.' },
  { key: 'users.update', module: 'Users', action: 'Edit', description: 'Update member profile and membership details.' },
  { key: 'users.deactivate', module: 'Users', action: 'Deactivate', description: 'Suspend or deactivate memberships.' },
  { key: 'users.manage_roles', module: 'Users', action: 'Assign roles', description: 'Assign or remove roles for members.' },
  {
    key: 'users.reset_password',
    module: 'Users',
    action: 'Reset password',
    description: 'Set a new sign-in password for organization members.',
  },
  { key: 'roles.read', module: 'Roles', action: 'View', description: 'View roles and their permissions.' },
  { key: 'roles.create', module: 'Roles', action: 'Create', description: 'Create custom organization roles.' },
  { key: 'roles.update', module: 'Roles', action: 'Edit', description: 'Update custom roles and permission assignments.' },
  { key: 'roles.delete', module: 'Roles', action: 'Delete', description: 'Delete unused custom roles.' },
  { key: 'permissions.read', module: 'Permissions', action: 'View', description: 'View the permission catalog.' },
  { key: 'memberships.invite', module: 'Memberships', action: 'Invite', description: 'Send member invitations.' },
  { key: 'memberships.manage', module: 'Memberships', action: 'Manage', description: 'Change membership status and remove members.' },
  { key: 'employees.read', module: 'HRM', action: 'View', description: 'View employee records.' },
  { key: 'employees.create', module: 'HRM', action: 'Create', description: 'Create employee records.' },
  { key: 'employees.update', module: 'HRM', action: 'Edit', description: 'Update employee records and status.' },
  {
    key: 'employees.compensation.read',
    module: 'HRM',
    action: 'View compensation',
    description: 'View employee salary structure.',
  },
  {
    key: 'employees.compensation.manage',
    module: 'HRM',
    action: 'Manage compensation',
    description: 'Create or update employee salary structure.',
  },
  { key: 'media.read', module: 'Media', action: 'View', description: 'Preview and download authorized files.' },
  { key: 'media.upload', module: 'Media', action: 'Upload', description: 'Upload files to organization storage.' },
  { key: 'media.delete', module: 'Media', action: 'Delete', description: 'Delete unreferenced stored files.' },
  { key: 'leads.read', module: 'Leads', action: 'View', description: 'View leads and pipeline.' },
  { key: 'leads.create', module: 'Leads', action: 'Create', description: 'Create leads.' },
  { key: 'leads.update', module: 'Leads', action: 'Edit', description: 'Update leads and proposals.' },
  { key: 'leads.delete', module: 'Leads', action: 'Delete', description: 'Delete leads.' },
  { key: 'clients.read', module: 'Clients', action: 'View', description: 'View clients.' },
  { key: 'clients.create', module: 'Clients', action: 'Create', description: 'Create clients.' },
  { key: 'clients.update', module: 'Clients', action: 'Edit', description: 'Update clients.' },
  { key: 'clients.delete', module: 'Clients', action: 'Delete', description: 'Delete clients.' },
  { key: 'projects.read', module: 'Projects', action: 'View', description: 'View projects and plans.' },
  { key: 'projects.create', module: 'Projects', action: 'Create', description: 'Create projects.' },
  { key: 'projects.update', module: 'Projects', action: 'Edit', description: 'Update projects and execution.' },
  { key: 'projects.delete', module: 'Projects', action: 'Delete', description: 'Delete projects.' },
  { key: 'tasks.read', module: 'Tasks', action: 'View', description: 'View project tasks.' },
  { key: 'tasks.create', module: 'Tasks', action: 'Create', description: 'Create project tasks.' },
  { key: 'tasks.update', module: 'Tasks', action: 'Edit', description: 'Update and move project tasks.' },
  { key: 'tasks.delete', module: 'Tasks', action: 'Delete', description: 'Delete project tasks.' },
  {
    key: 'tasks.assign',
    module: 'Tasks',
    action: 'Assign',
    description: 'Choose or change who daily and project tasks are assigned to.',
  },
  {
    key: 'tasks.progress',
    module: 'Tasks',
    action: 'Update progress',
    description: 'Update workflow status on daily tasks assigned to you.',
  },
  {
    key: 'tasks.comment',
    module: 'Tasks',
    action: 'Add task notes (legacy)',
    description: 'Legacy alias for daily task notes. Prefer daily_tasks.comment.',
  },
  {
    key: 'daily_tasks.update_status',
    module: 'Daily Tasks',
    action: 'Update task status',
    description: 'Update the workflow status of daily tasks assigned to you.',
  },
  {
    key: 'daily_tasks.comment',
    module: 'Daily Tasks',
    action: 'Add notes',
    description: 'Add notes on daily tasks assigned to you.',
  },
  {
    key: 'daily_tasks.manage_workflow',
    module: 'Daily Tasks',
    action: 'Manage workflow stages',
    description: 'Configure daily task workflow stages for the organization.',
  },
  {
    key: 'daily_tasks.notes.create',
    module: 'Daily Tasks',
    action: 'Add task notes',
    description: 'Submit notes on assigned daily tasks.',
  },
  {
    key: 'daily_tasks.notes.view_own',
    module: 'Daily Tasks',
    action: 'View own task notes',
    description: 'View notes you submitted on assigned tasks.',
  },
  {
    key: 'daily_tasks.notes.view_all',
    module: 'Daily Tasks',
    action: 'View all task notes',
    description: 'View employee notes across daily tasks.',
  },
  {
    key: 'daily_tasks.notes.acknowledge',
    module: 'Daily Tasks',
    action: 'Acknowledge task notes',
    description: 'Mark employee task notes as noted.',
  },
  { key: 'finance.read', module: 'Finance', action: 'View', description: 'View finance dashboards and records.' },
  { key: 'finance.manage', module: 'Finance', action: 'Manage', description: 'Manage finance configuration and records.' },
  { key: 'expenses.read', module: 'Expenses', action: 'View', description: 'View expenses.' },
  { key: 'expenses.create', module: 'Expenses', action: 'Create', description: 'Create expense records.' },
  { key: 'expenses.update', module: 'Expenses', action: 'Edit', description: 'Update expense records.' },
  { key: 'expenses.approve', module: 'Expenses', action: 'Approve', description: 'Approve or reject expenses.' },
  { key: 'expenses.delete', module: 'Expenses', action: 'Delete', description: 'Delete expense records.' },
  { key: 'settings.read', module: 'Settings', action: 'View', description: 'View organization settings and catalogs.' },
  { key: 'settings.manage', module: 'Settings', action: 'Manage', description: 'Change organization settings and catalogs.' },
  {
    key: 'whatsapp.read',
    module: 'WhatsApp',
    action: 'View inbox',
    description: 'View WhatsApp conversations assigned to you or unassigned.',
  },
  {
    key: 'whatsapp.view_all',
    module: 'WhatsApp',
    action: 'View all conversations',
    description: 'View every WhatsApp conversation in the organization.',
  },
  {
    key: 'whatsapp.reply',
    module: 'WhatsApp',
    action: 'Reply',
    description: 'Send WhatsApp messages, templates and internal notes.',
  },
  {
    key: 'whatsapp.assign',
    module: 'WhatsApp',
    action: 'Assign',
    description: 'Assign or reassign WhatsApp conversations to employees.',
  },
  {
    key: 'whatsapp.channels.manage',
    module: 'WhatsApp',
    action: 'Manage channels',
    description: 'Connect, rotate credentials, disconnect and delete WhatsApp channels.',
  },
  {
    key: 'whatsapp.templates.manage',
    module: 'WhatsApp',
    action: 'Manage templates',
    description: 'Sync and submit WhatsApp message templates.',
  },
  {
    key: 'whatsapp.broadcasts.manage',
    module: 'WhatsApp',
    action: 'Manage broadcasts',
    description: 'Create, schedule and cancel WhatsApp template broadcasts.',
  },
  {
    key: 'attendance.view_own',
    module: 'Attendance',
    action: 'View own',
    description: 'View personal attendance records and history.',
  },
  {
    key: 'attendance.view_all',
    module: 'Attendance',
    action: 'View all',
    description: 'View organization-wide attendance records.',
  },
  {
    key: 'attendance.punch_in',
    module: 'Attendance',
    action: 'Punch in',
    description: 'Record attendance punch-in from an approved desktop session.',
  },
  {
    key: 'attendance.punch_out',
    module: 'Attendance',
    action: 'Punch out',
    description: 'Record attendance punch-out from an approved desktop session.',
  },
  {
    key: 'attendance.view_summary',
    module: 'Attendance',
    action: 'View summary',
    description: 'View attendance summaries and monthly statistics.',
  },
  {
    key: 'attendance.manage_settings',
    module: 'Attendance',
    action: 'Manage settings',
    description: 'Configure office schedules and attendance rules.',
  },
  {
    key: 'attendance.correct_records',
    module: 'Attendance',
    action: 'Correct records',
    description: 'Apply audited corrections to attendance records.',
  },
  {
    key: 'attendance.manage_devices',
    module: 'Attendance',
    action: 'Manage devices',
    description: 'Register and revoke trusted attendance devices.',
  },
  {
    key: 'attendance.view_audit',
    module: 'Attendance',
    action: 'View audit',
    description: 'View attendance corrections and security events.',
  },
] as const;

export const PERMISSION_KEY_SET: ReadonlySet<string> = new Set(PERMISSION_KEYS);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value);
}

export const SYSTEM_ROLE_KEYS = {
  owner: 'owner',
  admin: 'admin',
  projectManager: 'project_manager',
  projectManagement: 'project_management',
  sales: 'sales',
  financial: 'financial',
  member: 'member',
  employee: 'employee',
} as const;

/** Permissions for the organization Employee system role (employee portal). */
export const EMPLOYEE_PORTAL_PERMISSIONS: readonly PermissionKey[] = [
  'projects.read',
  'tasks.read',
  'daily_tasks.update_status',
  'daily_tasks.notes.create',
  'daily_tasks.notes.view_own',
  'daily_tasks.comment',
  'attendance.view_own',
  'attendance.punch_in',
  'attendance.punch_out',
  'attendance.view_summary',
  'attendance.manage_devices',
];

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[keyof typeof SYSTEM_ROLE_KEYS];

/** Protected system role; only platform super admins receive owner membership automatically. */
export const PROTECTED_SYSTEM_ROLE_KEYS: ReadonlySet<string> = new Set([
  SYSTEM_ROLE_KEYS.owner,
]);

/** Organization roles that cannot be edited, deactivated, or deleted (stable keys, not display names). */
export const IMMUTABLE_ORG_ROLE_KEYS: ReadonlySet<string> = new Set([
  SYSTEM_ROLE_KEYS.admin,
  SYSTEM_ROLE_KEYS.owner,
]);
