import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { GetOrgRoleDeletionImpactQuery } from './get-org-role-deletion-impact.query.js';

@Injectable()
export class GetOrgRoleDeletionImpactHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(query: GetOrgRoleDeletionImpactQuery) {
    return this.repository.getRoleDeletionImpact(query.organizationId, query.roleId);
  }
}
