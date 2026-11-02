import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { InviteMemberCommand } from './invite-member.command.js';

@Injectable()
export class InviteMemberHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: InviteMemberCommand) {
    return this.repository.createInvitation(
      command.organizationId,
      { email: command.email, roleIds: command.roleIds },
      command.actorAdminId,
    );
  }
}
