import type { ProjectListQuery } from '@techwin/validation';
import { normalizeListPage, normalizeListPageSize } from '../../../../shared/application/list-page.js';
import type { ProjectListFilters } from '../../domain/repositories/project.repository.js';

export function toProjectListFilters(query: ProjectListQuery): ProjectListFilters {
  return {
    page: normalizeListPage(query.page),
    pageSize: normalizeListPageSize(query.pageSize),
    search: query.search?.trim() || undefined,
    status: query.status,
    priority: query.priority,
    lifecycleTab: query.lifecycleTab,
  };
}
