import type { OrgMemberListQuery } from '@techwin/validation';
import { normalizeListPage, normalizeListPageSize } from '../../../../shared/pagination/index.js';
import type { OrgMemberListFilters } from '../../domain/repositories/org-access.repository.js';

export function toOrgMemberListFilters(query: OrgMemberListQuery): OrgMemberListFilters {
  return {
    page: normalizeListPage(query.page),
    pageSize: normalizeListPageSize(query.pageSize),
    search: query.search?.trim() || undefined,
    status: query.status,
    roleId: query.roleId,
    sortBy: query.sortBy ?? 'displayName',
    sortDir: query.sortDir ?? 'asc',
  };
}
