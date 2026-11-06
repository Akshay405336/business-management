import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { CreateProjectCommand } from './create-project.command.js';
import type { CreateProjectResult } from './create-project.result.js';

@Injectable()
export class CreateProjectHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  execute(command: CreateProjectCommand): Promise<CreateProjectResult> {
    return this.repository.createProject(command.actor.organizationId, command.input, {
      adminId: command.actor.adminId,
    });
  }
}
