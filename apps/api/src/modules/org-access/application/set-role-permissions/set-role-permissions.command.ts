import type { PermissionKey } from '../../domain/types/org-access.types.js';

export type SetRolePermissionsCommand = {
  readonly organizationId: string;
  readonly roleId: string;
  readonly actorAdminId: string;
  readonly permissionKeys: readonly PermissionKey[];
};
