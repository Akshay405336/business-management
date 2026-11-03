import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import type { OrgRoleListItem } from '../types';
import type { GrantableRoleActor } from './role-policy';

/**
 * Roles the signed-in user may assign: active, not the owner role (platform super admins only),
 * and never granting a permission the user does not hold. The API enforces the same rules.
 */
export function selectGrantableRoles(
  roles: readonly OrgRoleListItem[],
  actor: GrantableRoleActor,
): readonly OrgRoleListItem[] {
  if (actor.isPlatformSuperAdmin) return roles.filter((role) => role.status === 'ACTIVE');
  return roles.filter(
    (role) =>
      role.status === 'ACTIVE' &&
      role.key !== SYSTEM_ROLE_KEYS.owner &&
      role.permissionKeys.every((key) => actor.permissions.has(key)),
  );
}
