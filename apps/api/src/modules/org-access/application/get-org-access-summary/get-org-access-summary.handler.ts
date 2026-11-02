import { Inject, Injectable } from '@nestjs/common';
import type { OrgAccessSummary } from '../../domain/repositories/org-access.repository.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { GetOrgAccessSummaryQuery } from './get-org-access-summary.query.js';

@Injectable()
export class GetOrgAccessSummaryHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(query: GetOrgAccessSummaryQuery): Promise<OrgAccessSummary> {
    return this.repository.getSummary(query.organizationId);
  }
}
