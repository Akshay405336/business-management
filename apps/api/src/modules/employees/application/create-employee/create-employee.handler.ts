import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MemberAccountService,
  OrgAccessConflictError,
  PermissionCheckerService,
} from '../../../org-access/index.js';
import { StoredFileService } from '../../../media/index.js';
import { EmployeeValidationError } from '../../domain/errors/employee.errors.js';
import {
  EMPLOYEE_REPOSITORY,
  type CreateEmployeeInput,
  type EmployeeRecord,
  type EmployeeRepository,
  type NewEmployeeLoginAccount,
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
    const { organizationId, adminId } = command.actor;
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

    let loginAccount: NewEmployeeLoginAccount | null = null;
    let platformAdminId: string | null = null;
    if (command.login) {
      await this.memberAccounts.assertCanCreateAccounts(command.accessActor);
      try {
        loginAccount = await this.memberAccounts.prepareEmployeeAccount({
          organizationId,
          actorAdminId: adminId,
          email: workEmail,
          password: command.login.password,
        });
      } catch (error) {
        if (error instanceof OrgAccessConflictError) {
          const linkable = await this.memberAccounts.findLinkableMemberAdminId(
            organizationId,
            workEmail,
          );
          const message = linkable
            ? 'This email already has a sign-in account in this organization. Turn off "Allow sign-in" to link the employee to that account; its password and role stay unchanged.'
            : error.message;
          throw new EmployeeValidationError(message, [{ path: 'workEmail', message }]);
        }
        throw error;
      }
    } else {
      platformAdminId = await this.memberAccounts.findLinkableMemberAdminId(
        organizationId,
        workEmail,
      );
    }

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
      adminId,
      loginAccount,
    );
  }
}
