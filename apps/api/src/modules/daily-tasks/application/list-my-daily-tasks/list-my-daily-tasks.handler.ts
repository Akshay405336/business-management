import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskListResponse } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { ListMyDailyTasksQuery } from './list-my-daily-tasks.query.js';

@Injectable()
export class ListMyDailyTasksHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(query: ListMyDailyTasksQuery): Promise<DailyTaskListResponse> {
    const noteAttach = await this.authz.resolveNoteAttach(query.accessActor);
    return this.repository.listMyTasks(
      query.actor.organizationId,
      query.actor.adminId,
      query.query,
      query.clientToday,
      noteAttach,
    );
  }
}
