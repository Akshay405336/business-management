import { SYSTEM_ROLE_KEYS, type PermissionKey } from '@techwin/contracts';
import type { OrgRoleListItem } from '../types';

/**
 * Roles the signed-in user may assign: active, not the owner role (platform super admins only),
 * and never granting a permission the user does not hold. The API enforces the same rules.
 */
export function selectGrantableRoles(
  roles: readonly OrgRoleListItem[],
  actor: { readonly isPlatformSuperAdmin: boolean; readonly permissions: ReadonlySet<PermissionKey> },
): readonly OrgRoleListItem[] {
  if (actor.isPlatformSuperAdmin) return roles.filter((role) => role.status === 'ACTIVE');
  return roles.filter(
    (role) =>
      role.status === 'ACTIVE' &&
      role.key !== SYSTEM_ROLE_KEYS.owner &&
      role.permissionKeys.every((key) => actor.permissions.has(key)),
  );
}
