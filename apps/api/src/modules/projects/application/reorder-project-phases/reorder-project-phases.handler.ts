import { Inject, Injectable } from '@nestjs/common';
import type { ReorderProjectPhasesRequest } from '@techwin/validation';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

@Injectable()
export class ReorderProjectPhasesHandler {
  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(PROJECT_TASK_REPOSITORY) private readonly tasks: ProjectTaskRepository,
  ) {}

  async execute(actor: ProjectActor, projectId: string, body: ReorderProjectPhasesRequest) {
    await this.projects.reorderProjectPhases(
      actor.organizationId,
      projectId,
      body.orderedPhaseIds,
      { adminId: actor.adminId },
    );
    return this.tasks.getProjectBoard(actor.organizationId, projectId);
  }
}
