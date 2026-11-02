import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskWorkflowStage } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { ListWorkflowStagesQuery } from './list-workflow-stages.query.js';

@Injectable()
export class ListWorkflowStagesHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(query: ListWorkflowStagesQuery): Promise<readonly DailyTaskWorkflowStage[]> {
    return this.repository.listWorkflowStages(query.actor.organizationId);
  }
}
