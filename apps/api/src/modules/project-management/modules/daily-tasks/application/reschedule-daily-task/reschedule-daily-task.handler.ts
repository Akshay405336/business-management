import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { RescheduleDailyTaskCommand } from './reschedule-daily-task.command.js';

@Injectable()
export class RescheduleDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(command: RescheduleDailyTaskCommand): Promise<DailyTaskDetail> {
    await this.authz.assertCanReadTask(command.accessActor, command.taskId);
    return this.repository.rescheduleTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
  }
}
