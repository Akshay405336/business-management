import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskDetail } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { AddDailyTaskCommentCommand } from './add-daily-task-comment.command.js';

@Injectable()
export class AddDailyTaskCommentHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(command: AddDailyTaskCommentCommand): Promise<DailyTaskDetail> {
    await this.authz.assertCanAddComment(
      command.accessActor,
      command.taskId,
      command.input.scope,
    );
    return this.repository.addTaskComment(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.input,
    );
  }
}
