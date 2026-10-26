import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  assertEmployeeContactAvailable,
  normalizeEmployeeContact,
} from '../employee-contact-uniqueness.js';
import { assertReportingManagerValid } from '../employee-reporting-validation.js';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type CreateEmployeeInput,
  type EmployeeRecord,
  type EmployeeRepository,
} from '../../domain/repositories/employee.repository.js';

export type CreateEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly input: CreateEmployeeInput;
};

@Injectable()
export class CreateEmployeeHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  async execute(command: CreateEmployeeCommand): Promise<EmployeeRecord> {
    const { organizationId, adminId } = command.actor;
    const normalized = normalizeEmployeeContact(command.input);
    const input: CreateEmployeeInput = {
      ...command.input,
      workEmail: normalized.workEmail ?? command.input.workEmail,
      phone: normalized.phone ?? command.input.phone,
      ...(normalized.alternatePhone !== undefined
        ? { alternatePhone: normalized.alternatePhone }
        : {}),
    };
    await assertEmployeeContactAvailable(this.repository, organizationId, input);
    const employeeId = randomUUID();
    await assertReportingManagerValid(
      this.repository,
      organizationId,
      employeeId,
      input.reportingManagerId,
    );
    return this.repository.createEmployee(organizationId, employeeId, input, adminId);
  }
}
