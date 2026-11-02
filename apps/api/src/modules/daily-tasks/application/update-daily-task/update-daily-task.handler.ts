import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../org-access/index.js';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { sameEmployeeIds } from '../shared/assignee-ids.js';
import type { UpdateDailyTaskCommand } from './update-daily-task.command.js';

@Injectable()
export class UpdateDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async execute(command: UpdateDailyTaskCommand): Promise<DailyTaskDetail> {
    if (command.input.employeeIds) {
      const current = await this.repository.getTask(
        command.actor.organizationId,
        command.taskId,
      );
      const currentIds = current.assignees.map((assignee) => assignee.employeeId);
      if (!sameEmployeeIds(currentIds, command.input.employeeIds)) {
        await this.permissions.requirePermissions(command.accessActor, ['tasks.assign']);
      }
    }
    return this.repository.updateTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
  }
}
