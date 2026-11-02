import type { OrganizationRoleStatus } from '../../domain/types/org-access.types.js';

export type UpdateOrgRoleCommand = {
  readonly organizationId: string;
  readonly roleId: string;
  readonly actorAdminId: string;
  readonly name?: string;
  readonly description?: string;
  readonly status?: OrganizationRoleStatus;
};
