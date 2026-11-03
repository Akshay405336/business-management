import {
  SYSTEM_ROLE_KEYS,
  type MyOrganizationRole,
  type PlatformAdminProfile,
  type PlatformAdminRole,
} from '@techwin/contracts';

export type MembershipAccessContext = {
  readonly platformRole: PlatformAdminRole;
  readonly membershipRoles: readonly MyOrganizationRole[];
};

const WORKSPACE_OVERVIEW_ROLE_KEYS: ReadonlySet<string> = new Set([
  SYSTEM_ROLE_KEYS.owner,
  SYSTEM_ROLE_KEYS.admin,
]);

export function canAccessWorkspaceDashboard(context: MembershipAccessContext): boolean {
  if (context.platformRole === 'SUPER_ADMIN') return true;
  return context.membershipRoles.some((role) => WORKSPACE_OVERVIEW_ROLE_KEYS.has(role.key));
}

export function formatMembershipRoleLabel(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): string {
  if (admin.role === 'SUPER_ADMIN' && roles.length === 0) return 'Super Admin';
  if (roles.length === 0) return 'Member';
  return roles.map((role) => role.name).join(', ');
}

export function membershipAccessContext(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): MembershipAccessContext {
  return { platformRole: admin.role, membershipRoles: roles };
}
