import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../../../infrastructure/security/security.contracts.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';

export type ResetMemberPasswordCommand = {
  readonly organizationId: string;
  readonly membershipId: string;
  readonly actorAdminId: string;
  readonly password: string;
};

@Injectable()
export class ResetMemberPasswordHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: ResetMemberPasswordCommand): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(command.password);
    await this.repository.resetMemberPassword(
      command.organizationId,
      command.membershipId,
      passwordHash,
      command.actorAdminId,
    );
  }
}
