import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { MoveDailyTaskStageCommand } from './move-daily-task-stage.command.js';

@Injectable()
export class MoveDailyTaskStageHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(command: MoveDailyTaskStageCommand): Promise<DailyTaskDetail> {
    await this.authz.assertCanUpdateTaskProgress(command.accessActor, command.taskId);
    return this.repository.moveTaskStage(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
  }
}
