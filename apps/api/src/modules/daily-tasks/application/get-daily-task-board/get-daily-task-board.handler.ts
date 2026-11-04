import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskBoardResponse } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { GetDailyTaskBoardQuery } from './get-daily-task-board.query.js';

@Injectable()
export class GetDailyTaskBoardHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(query: GetDailyTaskBoardQuery): Promise<DailyTaskBoardResponse> {
    await this.authz.assertOrganizationTaskAccess(query.accessActor);
    const noteAttach = await this.authz.resolveNoteAttach(query.accessActor);
    return this.repository.getBoard(
      query.actor.organizationId,
      query.query,
      query.query.clientToday,
      noteAttach,
    );
  }
}
