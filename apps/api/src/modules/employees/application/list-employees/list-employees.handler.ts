import { Inject, Injectable } from '@nestjs/common';
import { toEmployeeListFilters } from '../shared/employee-list-query.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRepository,
  type PaginatedEmployees,
} from '../../domain/repositories/employee.repository.js';
import type { ListEmployeesQuery } from './list-employees.query.js';

@Injectable()
export class ListEmployeesHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  execute(query: ListEmployeesQuery): Promise<PaginatedEmployees> {
    return this.repository.listEmployees(
      query.actor.organizationId,
      toEmployeeListFilters(query.listQuery),
    );
  }
}
