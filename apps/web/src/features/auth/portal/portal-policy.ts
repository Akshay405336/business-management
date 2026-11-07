import type { MyOrganizationRole, PermissionKey, PlatformAdminProfile } from '@techwin/contracts';
import type { MembershipAccessContext } from '../membership/membership-access';

/** Legacy namespace id; all roles share one application shell and `/admin` feature routes. */
export type PortalKind = 'admin' | 'employee' | 'project-manager';

/**
 * Unified workspace: every organization member uses the same Admin shell and navigation config.
 * Route access, sidebar items and actions come from effective permissions — not portal kind.
 */
export function resolvePortalKind(
  _admin: PlatformAdminProfile,
  _permissions: readonly PermissionKey[],
  _roles: readonly MyOrganizationRole[],
): PortalKind {
  return 'admin';
}
