import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { UpdateOrgRoleCommand } from './update-org-role.command.js';

@Injectable()
export class UpdateOrgRoleHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: UpdateOrgRoleCommand) {
    return this.repository.updateRole(
      command.organizationId,
      command.roleId,
      {
        ...(command.name !== undefined ? { name: command.name } : {}),
        ...(command.description !== undefined ? { description: command.description } : {}),
        ...(command.status !== undefined ? { status: command.status } : {}),
      },
      command.actorAdminId,
    );
  }
}
