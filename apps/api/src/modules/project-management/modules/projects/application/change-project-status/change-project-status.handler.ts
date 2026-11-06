import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { ChangeProjectStatusCommand } from './change-project-status.command.js';
import type { ChangeProjectStatusResult } from './change-project-status.result.js';

@Injectable()
export class ChangeProjectStatusHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(command: ChangeProjectStatusCommand): Promise<ChangeProjectStatusResult> {
    return this.repository.changeProjectStatus(
      command.actor.organizationId,
      command.projectId,
      command.status,
      { adminId: command.actor.adminId },
    );
  }
}
