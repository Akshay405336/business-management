import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { GetDailyTaskQuery } from './get-daily-task.query.js';

@Injectable()
export class GetDailyTaskHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(query: GetDailyTaskQuery): Promise<DailyTaskDetail> {
    return this.repository.getTask(query.actor.organizationId, query.taskId);
  }
}
