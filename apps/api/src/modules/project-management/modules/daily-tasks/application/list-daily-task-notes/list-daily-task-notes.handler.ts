import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskNoteItem } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { ListDailyTaskNotesQuery } from './list-daily-task-notes.query.js';

@Injectable()
export class ListDailyTaskNotesHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(query: ListDailyTaskNotesQuery): Promise<readonly DailyTaskNoteItem[]> {
    const viewAll = await this.authz.assertCanListTaskNotes(query.accessActor, query.taskId);
    return this.repository.listTaskNotes(
      query.actor.organizationId,
      query.actor.adminId,
      query.taskId,
      viewAll,
    );
  }
}
