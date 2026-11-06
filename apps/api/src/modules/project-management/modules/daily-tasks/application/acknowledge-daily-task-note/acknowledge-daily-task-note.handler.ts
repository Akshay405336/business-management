import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskNoteItem } from '../../domain/read-models/daily-task.models.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../domain/repositories/daily-task.repository.js';
import { DailyTaskAuthorizationService } from '../services/daily-task-authorization.service.js';
import type { AcknowledgeDailyTaskNoteCommand } from './acknowledge-daily-task-note.command.js';

@Injectable()
export class AcknowledgeDailyTaskNoteHandler {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly repository: DailyTaskRepository,
    @Inject(DailyTaskAuthorizationService) private readonly authz: DailyTaskAuthorizationService,
  ) {}

  async execute(command: AcknowledgeDailyTaskNoteCommand): Promise<DailyTaskNoteItem> {
    await this.authz.assertCanAcknowledgeTaskNote(command.accessActor, command.taskId);
    return this.repository.acknowledgeTaskNote(
      command.actor.organizationId,
      command.actor.adminId,
      command.taskId,
      command.noteId,
    );
  }
}
