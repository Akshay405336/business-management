import type { OrgMemberListQuery } from '@techwin/validation';
import type { OrgMemberListFilters } from '../../domain/repositories/org-access.repository.js';

export function toOrgMemberListFilters(query: OrgMemberListQuery): OrgMemberListFilters {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    search: query.search?.trim() || undefined,
    status: query.status,
    roleId: query.roleId,
    sortBy: query.sortBy ?? 'displayName',
    sortDir: query.sortDir ?? 'asc',
  };
}
