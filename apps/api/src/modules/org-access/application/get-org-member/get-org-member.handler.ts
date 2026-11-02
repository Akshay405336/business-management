import { Inject, Injectable } from '@nestjs/common';
import { OrgAccessNotFoundError } from '../../domain/errors/org-access.errors.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { GetOrgMemberQuery } from './get-org-member.query.js';
import type { GetOrgMemberResult } from './get-org-member.result.js';

@Injectable()
export class GetOrgMemberHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  async execute(query: GetOrgMemberQuery): Promise<GetOrgMemberResult> {
    const member = await this.repository.getMember(query.organizationId, query.membershipId);
    if (!member) throw new OrgAccessNotFoundError('Member');
    const effectivePermissions = await this.repository.resolveEffectivePermissions(
      query.organizationId,
      member.adminId,
      false,
    );
    return { member, effectivePermissions };
  }
}
