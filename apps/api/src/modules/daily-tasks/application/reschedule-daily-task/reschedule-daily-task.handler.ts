import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { RescheduleDailyTaskCommand } from './reschedule-daily-task.command.js';

@Injectable()
export class RescheduleDailyTaskHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(command: RescheduleDailyTaskCommand): Promise<DailyTaskDetail> {
    return this.repository.rescheduleTask(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
  }
}
