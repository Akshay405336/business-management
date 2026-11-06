import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../../../org-access/index.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { DeleteDailyTaskCommand } from './delete-daily-task.command.js';

@Injectable()
export class DeleteDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async execute(command: DeleteDailyTaskCommand): Promise<void> {
    await this.authz.assertCanReadTask(command.accessActor, command.taskId);
    await this.permissions.requirePermissions(command.accessActor, ['tasks.delete']);
    return this.repository.deleteTask(command.actor.organizationId, command.taskId);
  }
}
