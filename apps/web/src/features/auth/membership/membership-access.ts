import {
  SYSTEM_ROLE_KEYS,
  type MyOrganizationRole,
  type PlatformAdminProfile,
  type PlatformAdminRole,
} from '@techwin/contracts';
import {
  formatOrganizationRoleLabel,
  formatPrimaryOrganizationRoleLabel,
} from './organization-role-label';

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

/**
 * Header / compact identity label from organization membership roles only.
 * Never invents Admin, Member, or Employee when the API returns no roles.
 */
export function formatMembershipRoleLabel(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): string {
  if (roles.length > 0) {
    return formatPrimaryOrganizationRoleLabel(roles);
  }
  if (admin.role === 'SUPER_ADMIN') return 'Super Admin';
  return '';
}

/** Full membership role list for profile/dashboard details. */
export function formatMembershipRoleDetails(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): string {
  if (roles.length > 0) {
    return formatOrganizationRoleLabel(roles);
  }
  if (admin.role === 'SUPER_ADMIN') return 'Super Admin';
  return 'No organization role assigned';
}

export function membershipAccessContext(
  admin: PlatformAdminProfile,
  roles: readonly MyOrganizationRole[],
): MembershipAccessContext {
  return { platformRole: admin.role, membershipRoles: roles };
}
