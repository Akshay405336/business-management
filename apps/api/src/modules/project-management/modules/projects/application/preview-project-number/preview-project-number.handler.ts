import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { PreviewProjectNumberQuery } from './preview-project-number.query.js';
import type { PreviewProjectNumberResult } from './preview-project-number.result.js';

@Injectable()
export class PreviewProjectNumberHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  async execute(query: PreviewProjectNumberQuery): Promise<PreviewProjectNumberResult> {
    const projectNumber = await this.repository.previewProjectNumber(query.actor.organizationId);
    return { projectNumber };
  }
}
