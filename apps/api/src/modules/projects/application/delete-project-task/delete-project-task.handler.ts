import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

@Injectable()
export class DeleteProjectTaskHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(actor: ProjectActor, projectId: string, taskId: string) {
    return this.repository.deleteTask(actor.organizationId, projectId, taskId);
  }
}
