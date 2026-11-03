import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import type { OrgRoleListItem } from '../types';

export function employeeSystemRoleIds(roles: readonly OrgRoleListItem[]): readonly string[] {
  return roles.filter((role) => role.key === SYSTEM_ROLE_KEYS.employee).map((role) => role.id);
}

export function roleSelectionIncludesEmployeeRole(
  roleIds: readonly string[],
  roles: readonly OrgRoleListItem[],
): boolean {
  const employeeIds = new Set(employeeSystemRoleIds(roles));
  return roleIds.some((id) => employeeIds.has(id));
}

export function roleSelectionIsEmployeeRole(
  roleId: string,
  roles: readonly OrgRoleListItem[],
): boolean {
  if (!roleId) return false;
  const employeeIds = new Set(employeeSystemRoleIds(roles));
  return employeeIds.has(roleId);
}
