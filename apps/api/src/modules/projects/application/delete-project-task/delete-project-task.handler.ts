import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { DeleteProjectTaskCommand } from './delete-project-task.command.js';

@Injectable()
export class DeleteProjectTaskHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(command: DeleteProjectTaskCommand) {
    return this.repository.deleteTask(
      command.actor.organizationId,
      command.projectId,
      command.taskId,
    );
  }
}
