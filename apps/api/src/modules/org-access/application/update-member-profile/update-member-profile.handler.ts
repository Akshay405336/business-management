import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { UpdateMemberProfileCommand } from './update-member-profile.command.js';

@Injectable()
export class UpdateMemberProfileHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: UpdateMemberProfileCommand) {
    return this.repository.updateMemberProfile(
      command.organizationId,
      command.membershipId,
      {
        ...(command.displayName !== undefined ? { displayName: command.displayName } : {}),
        ...(command.phone !== undefined ? { phone: command.phone } : {}),
      },
      command.actorAdminId,
    );
  }
}
