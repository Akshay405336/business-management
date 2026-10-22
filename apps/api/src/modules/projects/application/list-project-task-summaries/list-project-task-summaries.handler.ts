import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import { toProjectListFilters } from '../shared/project-list-query.js';
import type { ListProjectTaskSummariesQuery } from './list-project-task-summaries.query.js';

@Injectable()
export class ListProjectTaskSummariesHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(query: ListProjectTaskSummariesQuery) {
    const filters = toProjectListFilters(query.listQuery);
    return this.repository.listProjectSummaries(query.actor.organizationId, {
      ...filters,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 12,
    });
  }
}
