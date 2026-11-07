import { Inject, Injectable } from '@nestjs/common';
import { MemberAccountService } from '../../../org-access/index.js';
import { Employee } from '../../domain/entities/employee.entity.js';
import { EmployeeNotFoundError } from '../../domain/errors/employee.errors.js';
import { EmployeeStatusPolicy } from '../../domain/policies/employee-status.policy.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import type { ChangeEmployeeStatusCommand } from './change-employee-status.command.js';

@Injectable()
export class ChangeEmployeeStatusHandler {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository,
    @Inject(MemberAccountService) private readonly memberAccounts: MemberAccountService,
  ) {}

  async execute(command: ChangeEmployeeStatusCommand): Promise<EmployeeRecord> {
    const { organizationId, adminId } = command.actor;
    const existing = await this.repository.getEmployee(organizationId, command.employeeId);
    if (!existing) throw new EmployeeNotFoundError();

    const employee = Employee.reconstitute(existing).withStatus(command.status);
    const keepsAccess = EmployeeStatusPolicy.retainsSignInAccess(employee.employmentStatus);
    // Sign-in access is revoked before the HR record changes so a protected member
    // (owner, more privileged account, or the caller) blocks the whole operation.
    if (existing.platformAdminId && !keepsAccess) {
      await this.memberAccounts.syncEmployeeAccountAccess({
        actor: command.accessActor,
        adminId: existing.platformAdminId,
        active: false,
      });
    }
    const updated = await this.repository.changeEmployeeStatus(
      organizationId,
      command.employeeId,
      employee.employmentStatus,
      adminId,
    );
    if (existing.platformAdminId && keepsAccess) {
      await this.memberAccounts.syncEmployeeAccountAccess({
        actor: command.accessActor,
        adminId: existing.platformAdminId,
        active: true,
      });
      return (await this.repository.getEmployee(organizationId, command.employeeId)) ?? updated;
    }
    return updated;
  }
}
