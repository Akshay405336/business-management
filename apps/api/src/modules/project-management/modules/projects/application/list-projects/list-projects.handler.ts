import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import { toProjectListFilters } from '../shared/project-list-query.js';
import type { ListProjectsQuery } from './list-projects.query.js';
import type { ListProjectsResult } from './list-projects.result.js';

@Injectable()
export class ListProjectsHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(query: ListProjectsQuery): Promise<ListProjectsResult> {
    return this.repository.listProjects(
      query.actor.organizationId,
      toProjectListFilters(query.listQuery),
    );
  }
}
