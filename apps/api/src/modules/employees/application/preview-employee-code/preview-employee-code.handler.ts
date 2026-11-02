import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';
import type { PreviewEmployeeCodeQuery } from './preview-employee-code.query.js';

@Injectable()
export class PreviewEmployeeCodeHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  async execute(query: PreviewEmployeeCodeQuery): Promise<{ employeeCode: string }> {
    const employeeCode = await this.repository.previewEmployeeCode(query.actor.organizationId);
    return { employeeCode };
  }
}
