import { Inject, Injectable } from '@nestjs/common';
import type { UpdateProjectTaskRequest } from '@techwin/validation';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

@Injectable()
export class UpdateProjectTaskHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(
    actor: ProjectActor,
    projectId: string,
    taskId: string,
    input: UpdateProjectTaskRequest,
  ) {
    return this.repository.updateTask(actor.organizationId, projectId, taskId, input);
  }
}
