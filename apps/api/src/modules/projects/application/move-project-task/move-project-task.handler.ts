import { Inject, Injectable } from '@nestjs/common';
import type { MoveProjectTaskRequest } from '@techwin/validation';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

@Injectable()
export class MoveProjectTaskHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(
    actor: ProjectActor,
    projectId: string,
    taskId: string,
    input: MoveProjectTaskRequest,
  ) {
    return this.repository.moveTask(
      actor.organizationId,
      projectId,
      taskId,
      input.phaseId,
      input.beforeTaskId,
    );
  }
}
