import type { OrganizationMembershipStatus } from '../../domain/types/org-access.types.js';

export type ChangeMemberStatusCommand = {
  readonly organizationId: string;
  readonly membershipId: string;
  readonly actorAdminId: string;
  readonly status: OrganizationMembershipStatus;
};
