import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { ListProjectManagersQuery } from './list-project-managers.query.js';
import type { ListProjectManagersResult } from './list-project-managers.result.js';

@Injectable()
export class ListProjectManagersHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  async execute(query: ListProjectManagersQuery): Promise<ListProjectManagersResult> {
    const managers = await this.repository.listProjectManagers(query.actor.organizationId);
    return { managers };
  }
}
