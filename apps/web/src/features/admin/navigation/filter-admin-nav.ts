import type { PermissionKey } from '@techwin/contracts';
import type { MembershipAccessContext } from '@/features/auth/membership/membership-access';
import {
  ADMIN_NAV_GROUPS,
  type AdminNavGroup,
  type AdminNavItem,
} from './admin-nav-config';
import { canAccessAppPath } from '@/shared/navigation/app-route-permissions';

export type AdminNavGroupWithAccess = AdminNavGroup;

export function filterAdminNav(
  permissions: readonly PermissionKey[],
  access?: MembershipAccessContext,
): readonly AdminNavGroupWithAccess[] {
  const granted = new Set(permissions);
  const groups: AdminNavGroupWithAccess[] = [];

  for (const group of ADMIN_NAV_GROUPS) {
    const items: AdminNavItem[] = [];
    for (const item of group.items) {
      if (item.kind === 'soon') continue;
      if (canAccessAppPath(item.href, granted, access)) items.push(item);
    }
    if (items.length > 0) {
      groups.push({ ...group, items });
    }
  }

  return groups;
}
