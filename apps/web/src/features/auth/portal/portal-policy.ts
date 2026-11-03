import {
  EMPLOYEE_PORTAL_PERMISSIONS,
  SYSTEM_ROLE_KEYS,
  type MyOrganizationRole,
  type PermissionKey,
  type PlatformAdminProfile,
} from '@techwin/contracts';
import { membershipAccessContext, type MembershipAccessContext } from '../membership/membership-access';

export type PortalKind = 'admin' | 'employee' | 'project-manager';

const EMPLOYEE_PORTAL_SET = new Set<string>(EMPLOYEE_PORTAL_PERMISSIONS);

const WORKSPACE_ADMIN_ROLE_KEYS: ReadonlySet<string> = new Set([
  SYSTEM_ROLE_KEYS.owner,
  SYSTEM_ROLE_KEYS.admin,
]);

export function usesEmployeePortal(permissions: readonly PermissionKey[]): boolean {
  if (permissions.length === 0) return false;
  return permissions.every((key) => EMPLOYEE_PORTAL_SET.has(key));
}

export function usesProjectManagerPortal(roles: readonly MyOrganizationRole[]): boolean {
  return roles.some((role) => role.key === SYSTEM_ROLE_KEYS.projectManager);
}

export function hasWorkspaceAdminRole(context: MembershipAccessContext): boolean {
  if (context.platformRole === 'SUPER_ADMIN') return true;
  return context.membershipRoles.some((role) => WORKSPACE_ADMIN_ROLE_KEYS.has(role.key));
}

/**
 * Chooses the shell namespace (URL prefix + navigation) for the signed-in member.
 * Permission checks for individual pages remain separate.
 */
export function resolvePortalKind(
  admin: PlatformAdminProfile,
  permissions: readonly PermissionKey[],
  roles: readonly MyOrganizationRole[],
): PortalKind {
  if (admin.role === 'SUPER_ADMIN') return 'admin';
  if (usesEmployeePortal(permissions)) return 'employee';

  const access = membershipAccessContext(admin, roles);
  if (usesProjectManagerPortal(roles) && !hasWorkspaceAdminRole(access)) {
    return 'project-manager';
  }

  return 'admin';
}
