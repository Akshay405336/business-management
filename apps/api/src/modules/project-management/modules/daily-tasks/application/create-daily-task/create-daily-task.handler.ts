import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../../../org-access/index.js';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { CreateDailyTaskCommand } from './create-daily-task.command.js';

@Injectable()
export class CreateDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
  ) {}

  async execute(command: CreateDailyTaskCommand): Promise<DailyTaskDetail> {
    await this.permissions.requirePermissions(command.accessActor, ['tasks.assign']);
    return this.repository.createTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.input,
    );
  }
}
