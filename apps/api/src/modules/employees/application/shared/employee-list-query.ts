import type { EmployeeListQuery } from '@techwin/validation';
import type { EmployeeListFilters } from '../../domain/repositories/employee.repository.js';

export function toEmployeeListFilters(query: EmployeeListQuery): EmployeeListFilters {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    search: query.search?.trim() || undefined,
    status: query.status,
    employmentType: query.employmentType,
    sortBy: query.sortBy ?? 'displayName',
    sortDir: query.sortDir ?? 'asc',
  };
}
