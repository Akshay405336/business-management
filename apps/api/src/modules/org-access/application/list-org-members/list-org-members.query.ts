import type { OrgMemberListFilters } from '../../domain/repositories/org-access.repository.js';

export type ListOrgMembersQuery = {
  readonly organizationId: string;
  readonly filters: OrgMemberListFilters;
};
