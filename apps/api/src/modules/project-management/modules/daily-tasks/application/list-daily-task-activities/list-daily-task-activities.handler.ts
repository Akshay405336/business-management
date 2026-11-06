import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskActivityItem } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { ListDailyTaskActivitiesQuery } from './list-daily-task-activities.query.js';

@Injectable()
export class ListDailyTaskActivitiesHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(query: ListDailyTaskActivitiesQuery): Promise<readonly DailyTaskActivityItem[]> {
    await this.authz.assertCanReadTask(query.accessActor, query.taskId);
    return this.repository.listTaskActivities(query.actor.organizationId, query.taskId);
  }
}
