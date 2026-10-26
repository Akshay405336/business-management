import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

@Injectable()
export class CompleteProjectHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(actor: ProjectActor, projectId: string) {
    return this.repository.completeProject(actor.organizationId, projectId, {
      adminId: actor.adminId,
    });
  }
}
