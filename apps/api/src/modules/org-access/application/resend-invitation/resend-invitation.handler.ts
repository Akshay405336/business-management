import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { ResendInvitationCommand } from './resend-invitation.command.js';

@Injectable()
export class ResendInvitationHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: ResendInvitationCommand) {
    return this.repository.resendInvitation(
      command.organizationId,
      command.invitationId,
      command.actorAdminId,
    );
  }
}
