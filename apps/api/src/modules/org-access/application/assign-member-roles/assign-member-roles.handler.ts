import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { AssignMemberRolesCommand } from './assign-member-roles.command.js';

@Injectable()
export class AssignMemberRolesHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: AssignMemberRolesCommand) {
    return this.repository.assignMemberRoles(
      command.organizationId,
      command.membershipId,
      command.roleIds,
      command.actorAdminId,
    );
  }
}
