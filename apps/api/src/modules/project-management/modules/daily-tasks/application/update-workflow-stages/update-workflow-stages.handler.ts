import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskWorkflowStage } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import type { UpdateWorkflowStagesCommand } from './update-workflow-stages.command.js';

@Injectable()
export class UpdateWorkflowStagesHandler {
  constructor(@Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository) {}

  execute(command: UpdateWorkflowStagesCommand): Promise<readonly DailyTaskWorkflowStage[]> {
    return this.repository.replaceWorkflowStages(command.actor.organizationId, command.stages);
  }
}
