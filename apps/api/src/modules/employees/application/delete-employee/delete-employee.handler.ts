import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export type DeleteEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly employeeId: string;
};

@Injectable()
export class DeleteEmployeeHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  execute(command: DeleteEmployeeCommand): Promise<void> {
    return this.repository.deleteEmployee(command.actor.organizationId, command.employeeId);
  }
}
