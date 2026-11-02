import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskListResponse } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { ListDailyTasksQuery } from './list-daily-tasks.query.js';

@Injectable()
export class ListDailyTasksHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(query: ListDailyTasksQuery): Promise<DailyTaskListResponse> {
    return this.repository.listTasks(
      query.actor.organizationId,
      query.query,
      query.clientToday,
    );
  }
}
