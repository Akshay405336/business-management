import { Inject, Injectable } from '@nestjs/common';
import { OrgAccessNotFoundError } from '../../domain/errors/org-access.errors.js';
import type { OrgRoleRecord } from '../../domain/repositories/org-access.repository.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { GetOrgRoleQuery } from './get-org-role.query.js';

@Injectable()
export class GetOrgRoleHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  async execute(query: GetOrgRoleQuery): Promise<OrgRoleRecord> {
    const role = await this.repository.getRole(query.organizationId, query.roleId);
    if (!role) throw new OrgAccessNotFoundError('Role');
    return role;
  }
}
