import type { EmployeeListQuery } from '@techwin/validation';
import { normalizeListPage, normalizeListPageSize } from '../../../../shared/pagination/index.js';
import type { EmployeeListFilters } from '../../domain/repositories/employee.repository.js';

export function toEmployeeListFilters(query: EmployeeListQuery): EmployeeListFilters {
  return {
    page: normalizeListPage(query.page),
    pageSize: normalizeListPageSize(query.pageSize),
    search: query.search?.trim() || undefined,
    status: query.status,
    employmentType: query.employmentType,
    sortBy: query.sortBy ?? 'displayName',
    sortDir: query.sortDir ?? 'asc',
    accountLinkable:
      query.accountLinkable === true || query.accountLinkable === 'true' ? true : undefined,
  };
}
