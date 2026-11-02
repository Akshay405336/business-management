import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  type AssignableEmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import type { ListAssignableEmployeesQuery } from './list-assignable-employees.query.js';

/** Active employees reduced to the fields task assignment pickers need. */
@Injectable()
export class ListAssignableEmployeesHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  execute(query: ListAssignableEmployeesQuery): Promise<readonly AssignableEmployeeRecord[]> {
    return this.repository.listAssignableEmployees(query.actor.organizationId, query.search);
  }
}
