import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MemberAccountService, PermissionCheckerService } from '../../../org-access/index.js';
import { StoredFileService } from '../../../media/index.js';
import {
  EMPLOYEE_REPOSITORY,
  type CreateEmployeeInput,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import { assertCanManageEmployeeCompensation } from '../services/employee-compensation-access.js';
import {
  assertEmployeeContactAvailable,
  normalizeEmployeeContact,
} from '../shared/employee-contact-uniqueness.js';
import { validateProfileImageAssignment } from '../shared/employee-profile-image.js';
import type { CreateEmployeeCommand } from './create-employee.command.js';

@Injectable()
export class CreateEmployeeHandler {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository,
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(MemberAccountService) private readonly memberAccounts: MemberAccountService,
    @Inject(StoredFileService) private readonly storedFiles: StoredFileService,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<EmployeeRecord> {
    const { organizationId } = command.actor;
    if (command.input.salaryStructure) {
      await assertCanManageEmployeeCompensation(this.permissionChecker, command.accessActor);
    }
    const normalized = normalizeEmployeeContact(command.input);
    const workEmail = normalized.workEmail ?? command.input.workEmail;
    const baseInput: CreateEmployeeInput = {
      ...command.input,
      workEmail,
      phone: normalized.phone ?? command.input.phone,
      ...(normalized.alternatePhone !== undefined
        ? { alternatePhone: normalized.alternatePhone }
        : {}),
    };
    await assertEmployeeContactAvailable(this.repository, organizationId, baseInput);

    const platformAdminId = await this.memberAccounts.findLinkableMemberAdminId(
      organizationId,
      workEmail,
    );

    const employeeId = randomUUID();
    await validateProfileImageAssignment(
      this.storedFiles,
      organizationId,
      baseInput.profileImageStoredObjectId,
      employeeId,
    );
    return this.repository.createEmployee(
      organizationId,
      employeeId,
      { ...baseInput, platformAdminId },
      command.actor.adminId,
      null,
    );
  }
}
