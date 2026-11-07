import { SYSTEM_ROLE_KEYS, type MyOrganizationRole } from '@techwin/contracts';

/**
 * Lower numbers appear first. Job-specific roles outrank generic workspace roles so the
 * header never prefers "Admin" when Project Manager (or another job role) is also assigned.
 */
const ROLE_LABEL_ORDER: Readonly<Record<string, number>> = {
  [SYSTEM_ROLE_KEYS.owner]: 0,
  [SYSTEM_ROLE_KEYS.projectManager]: 10,
  [SYSTEM_ROLE_KEYS.projectManagement]: 11,
  [SYSTEM_ROLE_KEYS.sales]: 20,
  [SYSTEM_ROLE_KEYS.financial]: 30,
  [SYSTEM_ROLE_KEYS.employee]: 70,
  [SYSTEM_ROLE_KEYS.member]: 85,
  [SYSTEM_ROLE_KEYS.admin]: 90,
};

function humanizeRoleKey(key: string): string {
  return key
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function organizationRoleDisplayName(role: MyOrganizationRole): string {
  const named = role.name?.trim();
  if (named) return named;
  return humanizeRoleKey(role.key);
}

export function sortOrganizationRolesForDisplay(
  roles: readonly MyOrganizationRole[],
): readonly MyOrganizationRole[] {
  return [...roles].sort((left, right) => {
    const leftOrder = ROLE_LABEL_ORDER[left.key] ?? 50;
    const rightOrder = ROLE_LABEL_ORDER[right.key] ?? 50;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return organizationRoleDisplayName(left).localeCompare(organizationRoleDisplayName(right));
  });
}

/** Single role shown in the header — never invents Admin/Member when resolution is empty. */
export function primaryOrganizationRole(
  roles: readonly MyOrganizationRole[],
): MyOrganizationRole | null {
  const sorted = sortOrganizationRolesForDisplay(roles);
  return sorted[0] ?? null;
}

export function formatOrganizationRoleLabel(roles: readonly MyOrganizationRole[]): string {
  if (roles.length === 0) return '';
  return sortOrganizationRolesForDisplay(roles)
    .map((role) => organizationRoleDisplayName(role))
    .filter(Boolean)
    .join(', ');
}

export function formatPrimaryOrganizationRoleLabel(roles: readonly MyOrganizationRole[]): string {
  const primary = primaryOrganizationRole(roles);
  return primary ? organizationRoleDisplayName(primary) : '';
}
