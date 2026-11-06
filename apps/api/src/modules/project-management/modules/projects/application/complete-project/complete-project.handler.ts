import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { CompleteProjectCommand } from './complete-project.command.js';

@Injectable()
export class CompleteProjectHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(command: CompleteProjectCommand) {
    return this.repository.completeProject(command.actor.organizationId, command.projectId, {
      adminId: command.actor.adminId,
    });
  }
}
