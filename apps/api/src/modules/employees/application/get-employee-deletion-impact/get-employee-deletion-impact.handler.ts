import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeDailyTaskDeletionImpact,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import type { GetEmployeeDeletionImpactQuery } from './get-employee-deletion-impact.query.js';

@Injectable()
export class GetEmployeeDeletionImpactHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  execute(query: GetEmployeeDeletionImpactQuery): Promise<EmployeeDailyTaskDeletionImpact> {
    return this.repository.getDailyTaskDeletionImpact(query.organizationId, query.employeeId);
  }
}
