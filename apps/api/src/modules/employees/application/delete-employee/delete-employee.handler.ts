import { Inject, Injectable } from '@nestjs/common';
import { MemberAccountService, OrgAccessConflictError } from '../../../org-access/index.js';
import { StoredFileService } from '../../../media/index.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import {
  EmployeeConflictError,
  EmployeeHasPendingTasksError,
  EmployeeNotFoundError,
} from '../../domain/errors/employee.errors.js';
import { EmployeeDeletionPolicy } from '../../domain/policies/employee-deletion.policy.js';
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
    const existing = await this.repository.getEmployee(organizationId, command.employeeId);
    if (!existing) throw new EmployeeNotFoundError();
    Employee.reconstitute(existing).assertDeletableBy(adminId);
    const target = await this.repository.getDeletionTarget(organizationId, command.employeeId);
    if (!target) throw new EmployeeNotFoundError();
    if (target.platformAdminId && target.ownsLoginAccount) {
      await this.memberAccounts.assertCanDeleteAccount(command.accessActor, target.platformAdminId);
    }

    const impact = await this.repository.getDailyTaskDeletionImpact(
      organizationId,
      command.employeeId,
    );
    EmployeeDeletionPolicy.assertNoPendingDailyTasks(impact);

    let result: EmployeeDeletionResult;
    try {
      result = await this.repository.deleteEmployee(organizationId, command.employeeId, adminId);
    } catch (error) {
      if (error instanceof EmployeeHasPendingTasksError) throw error;
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
