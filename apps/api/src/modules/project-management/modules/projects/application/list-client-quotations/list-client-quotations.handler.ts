import { Inject, Injectable } from '@nestjs/common';
import {
  PROJECT_REPOSITORY,
  type ProjectRepository,
} from '../../domain/repositories/project.repository.js';
import type { ListClientQuotationsQuery } from './list-client-quotations.query.js';
import type { ListClientQuotationsResult } from './list-client-quotations.result.js';

@Injectable()
export class ListClientQuotationsHandler {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repository: ProjectRepository) {}

  async execute(query: ListClientQuotationsQuery): Promise<ListClientQuotationsResult> {
    const quotations = await this.repository.listClientQuotations(
      query.actor.organizationId,
      query.clientId,
    );
    return { quotations };
  }
}
