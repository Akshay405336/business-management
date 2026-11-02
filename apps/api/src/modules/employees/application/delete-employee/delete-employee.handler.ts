import { Inject, Injectable } from '@nestjs/common';
import {
  MemberAccountService,
  OrgAccessConflictError,
} from '../../../org-access/index.js';
import { StoredFileService } from '../../../media/index.js';
import {
  EmployeeConflictError,
  EmployeeNotFoundError,
} from '../../domain/errors/employee.errors.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeDeletionResult,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import type { DeleteEmployeeCommand } from './delete-employee.command.js';

@Injectable()
export class DeleteEmployeeHandler {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository,
    @Inject(MemberAccountService) private readonly memberAccounts: MemberAccountService,
    @Inject(StoredFileService) private readonly storedFiles: StoredFileService,
  ) {}

  async execute(command: DeleteEmployeeCommand): Promise<EmployeeDeletionResult> {
    const { organizationId, adminId } = command.actor;
    const target = await this.repository.getDeletionTarget(organizationId, command.employeeId);
    if (!target) throw new EmployeeNotFoundError();
    if (target.platformAdminId === adminId) {
      throw new EmployeeConflictError('You cannot delete your own employee record.');
    }
    if (target.platformAdminId && target.ownsLoginAccount) {
      await this.memberAccounts.assertCanDeleteAccount(command.accessActor, target.platformAdminId);
    }

    let result: EmployeeDeletionResult;
    try {
      result = await this.repository.deleteEmployee(organizationId, command.employeeId, adminId);
    } catch (error) {
      if (error instanceof OrgAccessConflictError) {
        throw new EmployeeConflictError(error.message);
      }
      throw error;
    }

    if (result.platformAdminId && result.loginAccount !== 'ACCOUNT_PRESERVED') {
      await this.memberAccounts.invalidateAccess(organizationId, result.platformAdminId);
    }
    await this.storedFiles.scheduleOrphanCleanup(organizationId, result.profileImageStoredObjectId);
    return result;
  }
}
