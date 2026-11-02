import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { RevokeInvitationCommand } from './revoke-invitation.command.js';

@Injectable()
export class RevokeInvitationHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: RevokeInvitationCommand): Promise<void> {
    return this.repository.revokeInvitation(
      command.organizationId,
      command.invitationId,
      command.actorAdminId,
    );
  }
}
