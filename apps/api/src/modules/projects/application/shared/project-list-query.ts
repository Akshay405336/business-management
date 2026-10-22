import type { ProjectListQuery } from '@techwin/validation';
import type { ProjectListFilters } from '../../domain/repositories/project.repository.js';

export function toProjectListFilters(query: ProjectListQuery): ProjectListFilters {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    search: query.search?.trim() || undefined,
    status: query.status,
    priority: query.priority,
    lifecycleTab: query.lifecycleTab,
  };
}
