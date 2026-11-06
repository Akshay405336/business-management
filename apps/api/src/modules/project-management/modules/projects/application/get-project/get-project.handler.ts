import { Inject, Injectable } from '@nestjs/common';
import { ProjectNotFoundError } from '../../domain/errors/project.errors.js';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { GetProjectQuery } from './get-project.query.js';
import type { GetProjectResult } from './get-project.result.js';

@Injectable()
export class GetProjectHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  async execute(query: GetProjectQuery): Promise<GetProjectResult> {
    const project = await this.repository.getProject(query.actor.organizationId, query.projectId);
    if (!project) throw new ProjectNotFoundError('Project');
    return project;
  }
}
