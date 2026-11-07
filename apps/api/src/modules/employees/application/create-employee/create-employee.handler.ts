import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MemberAccountService, PermissionCheckerService } from '../../../org-access/index.js';
import { StoredFileService } from '../../../media/index.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import { assertCanManageEmployeeCompensation } from '../access/employee-compensation-access.js';
import { assertEmployeeContactAvailable } from '../shared/employee-contact-uniqueness.js';
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
    const draft = Employee.validateCreate(command.input);
    await assertEmployeeContactAvailable(this.repository, organizationId, draft);

    const platformAdminId = await this.memberAccounts.findLinkableMemberAdminId(
      organizationId,
      draft.workEmail,
    );

    const employeeId = randomUUID();
    await validateProfileImageAssignment(
      this.storedFiles,
      organizationId,
      draft.profileImageStoredObjectId,
      employeeId,
    );
    const created = await this.repository.createEmployee(
      organizationId,
      employeeId,
      { ...draft, platformAdminId },
      command.actor.adminId,
      null,
    );
    return created;
  }
}
