import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../org-access/application/services/permission-checker.service.js';
import type { OrgAccessActor } from '../../../org-access/application/access/org-access-actor.js';
import { assertCanManageEmployeeCompensation } from '../compensation/employee-compensation-access.js';
import { randomUUID } from 'node:crypto';
import {
  assertEmployeeContactAvailable,
  normalizeEmployeeContact,
} from '../employee-contact-uniqueness.js';
import type { EmployeeActor } from '../access/employee-actor.js';
import { StoredFileService } from '../../../media/application/stored-file.service.js';
import {
  EMPLOYEE_REPOSITORY,
  type CreateEmployeeInput,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import { validateProfileImageAssignment } from '../employee-profile-image.js';

export type CreateEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly accessActor: OrgAccessActor;
  readonly input: CreateEmployeeInput;
};

@Injectable()
export class CreateEmployeeHandler {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository,
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(StoredFileService) private readonly storedFiles: StoredFileService,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<EmployeeRecord> {
    const { organizationId, adminId } = command.actor;
    if (command.input.salaryStructure) {
      await assertCanManageEmployeeCompensation(this.permissionChecker, command.accessActor);
    }
    const normalized = normalizeEmployeeContact(command.input);
    const input: CreateEmployeeInput = {
      ...command.input,
      workEmail: normalized.workEmail ?? command.input.workEmail,
      phone: normalized.phone ?? command.input.phone,
      ...(normalized.alternatePhone !== undefined
        ? { alternatePhone: normalized.alternatePhone }
        : {}),
    };
    await assertEmployeeContactAvailable(this.repository, organizationId, input);
    const employeeId = randomUUID();
    await validateProfileImageAssignment(
      this.storedFiles,
      organizationId,
      input.profileImageStoredObjectId,
      employeeId,
    );
    return this.repository.createEmployee(organizationId, employeeId, input, adminId);
  }
}
