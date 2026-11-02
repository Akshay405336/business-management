import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskListResponse } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { ListMyDailyTasksQuery } from './list-my-daily-tasks.query.js';

@Injectable()
export class ListMyDailyTasksHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(query: ListMyDailyTasksQuery): Promise<DailyTaskListResponse> {
    return this.repository.listMyTasks(
      query.actor.organizationId,
      query.actor.adminId,
      query.query,
      query.clientToday,
    );
  }
}
