import { Inject, Injectable } from '@nestjs/common';
import { EmployeeNotFoundError } from '../../domain/errors/employee.errors.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import type { GetEmployeeQuery } from './get-employee.query.js';

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
