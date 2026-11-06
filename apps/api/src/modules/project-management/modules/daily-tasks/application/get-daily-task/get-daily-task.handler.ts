import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { GetDailyTaskQuery } from './get-daily-task.query.js';

@Injectable()
export class GetDailyTaskHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(query: GetDailyTaskQuery): Promise<DailyTaskDetail> {
    await this.authz.assertCanReadTask(query.accessActor, query.taskId);
    return this.repository.getTask(query.actor.organizationId, query.taskId);
  }
}
