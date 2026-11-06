import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { MoveProjectTaskCommand } from './move-project-task.command.js';

@Injectable()
export class MoveProjectTaskHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(command: MoveProjectTaskCommand) {
    return this.repository.moveTask(
      command.actor.organizationId,
      command.projectId,
      command.taskId,
      command.input.phaseId,
      command.input.beforeTaskId,
    );
  }
}
