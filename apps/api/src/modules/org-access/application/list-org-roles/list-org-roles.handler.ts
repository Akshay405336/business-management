import { Inject, Injectable } from '@nestjs/common';
import type { OrgRoleRecord } from '../../domain/repositories/org-access.repository.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { ListOrgRolesQuery } from './list-org-roles.query.js';

@Injectable()
export class ListOrgRolesHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(query: ListOrgRolesQuery): Promise<readonly OrgRoleRecord[]> {
    return this.repository.listRoles(query.organizationId);
  }
}
