import { Inject, Injectable } from '@nestjs/common';
import type { CreateProjectTaskRequest } from '@techwin/validation';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

@Injectable()
export class CreateProjectTaskHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(actor: ProjectActor, projectId: string, input: CreateProjectTaskRequest) {
    return this.repository.createTask(actor.organizationId, projectId, input);
  }
}
