import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { CreateOrgRoleCommand } from './create-org-role.command.js';

@Injectable()
export class CreateOrgRoleHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: CreateOrgRoleCommand) {
    return this.repository.createRole(
      command.organizationId,
      {
        key: command.key,
        name: command.name,
        description: command.description,
        permissionKeys: command.permissionKeys,
      },
      command.actorAdminId,
    );
  }
}
