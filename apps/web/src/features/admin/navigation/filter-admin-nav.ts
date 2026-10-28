import type { PermissionKey } from '@techwin/contracts';
import {
  ADMIN_NAV_GROUPS,
  type AdminNavGroup,
  type AdminNavItem,
} from './admin-nav-config';

export type AdminNavGroupWithAccess = AdminNavGroup;

function itemAllowed(
  required: readonly PermissionKey[],
  granted: ReadonlySet<PermissionKey>,
): boolean {
  if (required.length === 0) return true;
  return required.some((key) => granted.has(key));
}

export function filterAdminNav(
  permissions: readonly PermissionKey[],
): readonly AdminNavGroupWithAccess[] {
  const granted = new Set(permissions);
  const groups: AdminNavGroupWithAccess[] = [];

  for (const group of ADMIN_NAV_GROUPS) {
    const items: AdminNavItem[] = [];
    for (const item of group.items) {
      if (item.kind === 'soon') continue;
      if (itemAllowed(item.requiredPermissions, granted)) items.push(item);
    }
    if (items.length > 0) {
      groups.push({ ...group, items });
    }
  }

  return groups;
}
