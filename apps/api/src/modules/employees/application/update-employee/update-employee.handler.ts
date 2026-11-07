import { Inject, Injectable } from '@nestjs/common';
import { PermissionCheckerService } from '../../../org-access/index.js';
import { StoredFileService } from '../../../media/index.js';
import { EmployeeNotFoundError } from '../../domain/errors/employee.errors.js';
import { EmployeeUpdatePolicy } from '../../domain/policies/employee-update.policy.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import { assertCanManageEmployeeCompensation } from '../access/employee-compensation-access.js';
import { assertEmployeeContactAvailable } from '../shared/employee-contact-uniqueness.js';
import { validateProfileImageAssignment } from '../shared/employee-profile-image.js';
import type { UpdateEmployeeCommand } from './update-employee.command.js';

@Injectable()
export class UpdateEmployeeHandler {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository,
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
    @Inject(StoredFileService) private readonly storedFiles: StoredFileService,
  ) {}

  async execute(command: UpdateEmployeeCommand): Promise<EmployeeRecord> {
    const { organizationId, adminId } = command.actor;
    const existing = await this.repository.getEmployee(organizationId, command.employeeId);
    if (!existing) throw new EmployeeNotFoundError();
    if (command.input.salaryStructure !== undefined) {
      await assertCanManageEmployeeCompensation(this.permissionChecker, command.accessActor);
    }
    const input = EmployeeUpdatePolicy.validate(command.input);
    await assertEmployeeContactAvailable(this.repository, organizationId, input, {
      excludeEmployeeId: command.employeeId,
    });
    if (input.profileImageStoredObjectId !== undefined) {
      await validateProfileImageAssignment(
        this.storedFiles,
        organizationId,
        input.profileImageStoredObjectId,
        command.employeeId,
      );
    }
    let previousObjectId: string | null = null;
    if (input.profileImageStoredObjectId !== undefined) {
      previousObjectId = await this.repository.getProfileImageStoredObjectId(
        organizationId,
        command.employeeId,
      );
    }
    const updated = await this.repository.updateEmployee(
      organizationId,
      command.employeeId,
      input,
      adminId,
    );
    if (
      input.profileImageStoredObjectId !== undefined &&
      previousObjectId &&
      previousObjectId !== input.profileImageStoredObjectId
    ) {
      await this.storedFiles.scheduleOrphanCleanup(organizationId, previousObjectId);
    }
    return updated;
  }
}
