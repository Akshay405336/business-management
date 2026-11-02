import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { StartProjectProductionCommand } from './start-project-production.command.js';

@Injectable()
export class StartProjectProductionHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(command: StartProjectProductionCommand) {
    return this.repository.startProduction(command.actor.organizationId, command.projectId, {
      adminId: command.actor.adminId,
    });
  }
}
