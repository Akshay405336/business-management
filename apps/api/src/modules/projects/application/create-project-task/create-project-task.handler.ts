import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../org-access/index.js';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { CreateProjectTaskCommand } from './create-project-task.command.js';

@Injectable()
export class CreateProjectTaskHandler {
  constructor(
    @Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async execute(command: CreateProjectTaskCommand) {
    if (command.input.assigneeAdminId) {
      await this.permissions.requirePermissions(command.accessActor, ['tasks.assign']);
    }
    return this.repository.createTask(
      command.actor.organizationId,
      command.projectId,
      command.input,
    );
  }
}
