import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { DeleteProjectCommand } from './delete-project.command.js';

@Injectable()
export class DeleteProjectHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(command: DeleteProjectCommand): Promise<void> {
    return this.repository.deleteProject(command.actor.organizationId, command.projectId, {
      adminId: command.actor.adminId,
    });
  }
}
