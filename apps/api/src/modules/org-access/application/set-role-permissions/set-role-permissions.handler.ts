import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { SetRolePermissionsCommand } from './set-role-permissions.command.js';

@Injectable()
export class SetRolePermissionsHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: SetRolePermissionsCommand) {
    return this.repository.setRolePermissions(
      command.organizationId,
      command.roleId,
      command.permissionKeys,
      command.actorAdminId,
    );
  }
}
