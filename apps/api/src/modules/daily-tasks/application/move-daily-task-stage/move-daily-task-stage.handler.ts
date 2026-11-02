import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { MoveDailyTaskStageCommand } from './move-daily-task-stage.command.js';

@Injectable()
export class MoveDailyTaskStageHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(command: MoveDailyTaskStageCommand): Promise<DailyTaskDetail> {
    return this.repository.moveTaskStage(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
  }
}
