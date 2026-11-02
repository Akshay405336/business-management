import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { DeleteOrgRoleCommand } from './delete-org-role.command.js';

@Injectable()
export class DeleteOrgRoleHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: DeleteOrgRoleCommand): Promise<void> {
    return this.repository.deleteRole(
      command.organizationId,
      command.roleId,
      command.actorAdminId,
    );
  }
}
