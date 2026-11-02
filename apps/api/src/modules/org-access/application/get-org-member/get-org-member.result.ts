import type { OrgMemberRecord } from '../../domain/repositories/org-access.repository.js';
import type { PermissionKey } from '../../domain/types/org-access.types.js';

export type GetOrgMemberResult = {
  readonly member: OrgMemberRecord;
  readonly effectivePermissions: readonly PermissionKey[];
};
