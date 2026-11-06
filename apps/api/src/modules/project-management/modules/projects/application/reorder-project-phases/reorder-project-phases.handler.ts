import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { ReorderProjectPhasesCommand } from './reorder-project-phases.command.js';

@Injectable()
export class ReorderProjectPhasesHandler {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(PROJECT_TASK_REPOSITORY) private readonly tasks: ProjectTaskRepository,
  ) {}

  async execute(command: ReorderProjectPhasesCommand) {
    await this.projects.reorderProjectPhases(
      command.actor.organizationId,
      command.projectId,
      command.body.orderedPhaseIds,
      { adminId: command.actor.adminId },
    );
    return this.tasks.getProjectBoard(command.actor.organizationId, command.projectId);
  }
}
