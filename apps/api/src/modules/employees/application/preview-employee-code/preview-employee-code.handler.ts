import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export type PreviewEmployeeCodeQuery = {
  readonly actor: EmployeeActor;
};

@Injectable()
export class PreviewEmployeeCodeHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  async execute(query: PreviewEmployeeCodeQuery): Promise<{ employeeCode: string }> {
    const employeeCode = await this.repository.previewEmployeeCode(query.actor.organizationId);
    return { employeeCode };
  }
}
