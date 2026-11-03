import { Inject, Injectable } from '@nestjs/common';
import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import { OrgAccessValidationError } from '../../domain/errors/org-access.errors.js';
import {
  ORG_ACCESS_REPOSITORY,
  type OrgAccessRepository,
} from '../../domain/repositories/org-access.repository.js';
import { MemberAccountService } from '../services/member-account.service.js';
import type { ProvisionMemberCommand } from './provision-member.command.js';

@Injectable()
export class ProvisionMemberHandler {
  constructor(
    @Inject(ORG_ACCESS_REPOSITORY) private readonly repository: OrgAccessRepository,
    @Inject(MemberAccountService) private readonly memberAccounts: MemberAccountService,
  ) {}

  async execute(command: ProvisionMemberCommand) {
    const employeeRoleId = await this.repository.resolveSystemRoleId(
      command.organizationId,
      SYSTEM_ROLE_KEYS.employee,
    );
    const includesEmployeeRole = command.roleIds.includes(employeeRoleId);

    if (includesEmployeeRole && !command.employeeId) {
      throw new OrgAccessValidationError('Select an employee to link with this account.', [
        { path: 'employeeId', message: 'Select an employee.' },
      ]);
    }
    if (command.employeeId && !includesEmployeeRole) {
      throw new OrgAccessValidationError(
        'Employee linking is only allowed when the Employee role is assigned.',
        [{ path: 'employeeId', message: 'Remove the employee selection or assign the Employee role.' }],
      );
    }

    const account = await this.memberAccounts.prepareNewAccount({
      organizationId: command.organizationId,
      actorAdminId: command.actorAdminId,
      email: command.email,
      password: command.password,
      roleIds: command.roleIds,
    });
    return this.repository.provisionMember(
      command.organizationId,
      {
        displayName: command.displayName,
        phone: command.phone,
        account,
        employeeId: command.employeeId,
      },
      command.actorAdminId,
    );
  }
}
