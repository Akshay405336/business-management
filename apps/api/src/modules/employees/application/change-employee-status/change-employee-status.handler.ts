import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeEmploymentStatus } from '../../domain/repositories/employee.repository.js';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export type ChangeEmployeeStatusCommand = {
  readonly actor: EmployeeActor;
  readonly employeeId: string;
  readonly status: EmployeeEmploymentStatus;
};

@Injectable()
export class ChangeEmployeeStatusHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  execute(command: ChangeEmployeeStatusCommand): Promise<EmployeeRecord> {
    return this.repository.changeEmployeeStatus(
      command.actor.organizationId,
      command.employeeId,
      command.status,
      command.actor.adminId,
    );
  }
}
