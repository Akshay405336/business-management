import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectClientOptionRecord,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { ListProjectClientOptionsQuery } from './list-project-client-options.query.js';

/** Client choices for the project form, so project roles do not need CRM access. */
@Injectable()
export class ListProjectClientOptionsHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(query: ListProjectClientOptionsQuery): Promise<readonly ProjectClientOptionRecord[]> {
    return this.repository.listClientOptions(query.actor.organizationId);
  }
}
