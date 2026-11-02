import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskBoardResponse } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { GetDailyTaskBoardQuery } from './get-daily-task-board.query.js';

@Injectable()
export class GetDailyTaskBoardHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(query: GetDailyTaskBoardQuery): Promise<DailyTaskBoardResponse> {
    return this.repository.getBoard(
      query.actor.organizationId,
      query.query,
      query.query.clientToday,
    );
  }
}
