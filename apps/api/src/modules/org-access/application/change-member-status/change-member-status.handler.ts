import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { ChangeMemberStatusCommand } from './change-member-status.command.js';

@Injectable()
export class ChangeMemberStatusHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: ChangeMemberStatusCommand) {
    return this.repository.changeMemberStatus(
      command.organizationId,
      command.membershipId,
      command.status,
      command.actorAdminId,
    );
  }
}
