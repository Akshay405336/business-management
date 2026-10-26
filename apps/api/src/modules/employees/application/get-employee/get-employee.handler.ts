import { Inject, Injectable } from '@nestjs/common';
import { EmployeeNotFoundError } from '../../domain/errors/employee.errors.js';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export type GetEmployeeQuery = {
  readonly actor: EmployeeActor;
  readonly employeeId: string;
};

@Injectable()
export class GetEmployeeHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  async execute(query: GetEmployeeQuery): Promise<EmployeeRecord> {
    const employee = await this.repository.getEmployee(
      query.actor.organizationId,
      query.employeeId,
    );
    if (!employee) throw new EmployeeNotFoundError();
    return employee;
  }
}
