import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedOrgMembers } from '../../domain/repositories/org-access.repository.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { ListOrgMembersQuery } from './list-org-members.query.js';

@Injectable()
export class ListOrgMembersHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(query: ListOrgMembersQuery): Promise<PaginatedOrgMembers> {
    return this.repository.listMembers(query.organizationId, query.filters);
  }
}
