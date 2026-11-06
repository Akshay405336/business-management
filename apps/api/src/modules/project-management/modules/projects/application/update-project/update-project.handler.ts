import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { UpdateProjectCommand } from './update-project.command.js';
import type { UpdateProjectResult } from './update-project.result.js';

@Injectable()
export class UpdateProjectHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(command: UpdateProjectCommand): Promise<UpdateProjectResult> {
    return this.repository.updateProject(
      command.actor.organizationId,
      command.projectId,
      command.input,
      { adminId: command.actor.adminId },
    );
  }
}
