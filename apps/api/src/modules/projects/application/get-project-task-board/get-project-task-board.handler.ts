import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_TASK_REPOSITORY,
  type ProjectTaskRepository,
} from '../../domain/repositories/project-task.repository.js';
import type { GetProjectTaskBoardQuery } from './get-project-task-board.query.js';

@Injectable()
export class GetProjectTaskBoardHandler {
  constructor(@Inject(PROJECT_TASK_REPOSITORY) private readonly repository: ProjectTaskRepository) {}

  execute(query: GetProjectTaskBoardQuery) {
    return this.repository.getProjectBoard(query.actor.organizationId, query.projectId, {
      planBaselineOnly: query.planBaselineOnly,
    });
  }
}
