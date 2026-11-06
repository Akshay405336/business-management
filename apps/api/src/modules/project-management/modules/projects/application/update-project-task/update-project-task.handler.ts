import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../../../org-access/index.js';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { UpdateProjectTaskCommand } from './update-project-task.command.js';

@Injectable()
export class UpdateProjectTaskHandler {
  constructor(
    @Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async execute(command: UpdateProjectTaskCommand) {
    if (command.input.assigneeAdminId !== undefined) {
      const current = await this.repository.getTask(
        command.actor.organizationId,
        command.projectId,
        command.taskId,
      );
      if ((current?.assigneeAdminId ?? null) !== command.input.assigneeAdminId) {
        await this.permissions.requirePermissions(command.accessActor, ['tasks.assign']);
      }
    }
    return this.repository.updateTask(
      command.actor.organizationId,
      command.projectId,
      command.taskId,
      command.input,
    );
  }
}
