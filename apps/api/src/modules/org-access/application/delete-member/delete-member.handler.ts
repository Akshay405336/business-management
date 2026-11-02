import { Inject, Injectable } from '@nestjs/common';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import type { DeleteMemberCommand } from './delete-member.command.js';

@Injectable()
export class DeleteMemberHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
  ) {}

  execute(command: DeleteMemberCommand): Promise<void> {
    return this.repository.deleteMember(
      command.organizationId,
      command.membershipId,
      command.actorAdminId,
    );
  }
}
