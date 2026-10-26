import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeListQuery } from '@techwin/validation';
import type { EmployeeActor } from '../access/employee-actor.js';
import { toEmployeeListFilters } from '../shared/employee-list-query.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRepository,
  type PaginatedEmployees,
} from '../../domain/repositories/employee.repository.js';

export type ListEmployeesQuery = {
  readonly actor: EmployeeActor;
  readonly listQuery: EmployeeListQuery;
};

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
