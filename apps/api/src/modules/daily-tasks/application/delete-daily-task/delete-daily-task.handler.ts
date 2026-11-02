import { Inject, Injectable } from '@nestjs/common';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { DeleteDailyTaskCommand } from './delete-daily-task.command.js';

@Injectable()
export class DeleteDailyTaskHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(command: DeleteDailyTaskCommand): Promise<void> {
    return this.repository.deleteTask(command.actor.organizationId, command.taskId);
  }
}
