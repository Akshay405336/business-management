import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import { MemberAccountService } from '../services/member-account.service.js';
import type { ProvisionMemberCommand } from './provision-member.command.js';

@Injectable()
export class ProvisionMemberHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(MemberAccountService) private readonly memberAccounts: MemberAccountService,
  ) {}

  async execute(command: ProvisionMemberCommand) {
    const account = await this.memberAccounts.prepareNewAccount({
      organizationId: command.organizationId,
      actorAdminId: command.actorAdminId,
      email: command.email,
      password: command.password,
      roleIds: command.roleIds,
    });
    return this.repository.provisionMember(
      command.organizationId,
      { displayName: command.displayName, phone: command.phone, account },
      command.actorAdminId,
    );
  }
}
