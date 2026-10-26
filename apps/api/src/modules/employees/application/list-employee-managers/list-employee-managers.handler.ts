import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeManagerSummary,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export type ListEmployeeManagersQuery = {
  readonly actor: EmployeeActor;
  readonly excludeEmployeeId?: string;
};

@Injectable()
export class ListEmployeeManagersHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  execute(query: ListEmployeeManagersQuery): Promise<{ managers: readonly EmployeeManagerSummary[] }> {
    return this.repository
      .listManagerOptions(query.actor.organizationId, query.excludeEmployeeId)
      .then((managers) => ({ managers }));
  }
}
