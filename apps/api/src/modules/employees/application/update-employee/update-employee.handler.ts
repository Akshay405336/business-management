import { Inject, Injectable } from '@nestjs/common';
import {
  assertEmployeeContactAvailable,
  normalizeEmployeeContact,
} from '../employee-contact-uniqueness.js';
import { assertReportingManagerValid } from '../employee-reporting-validation.js';
import type { EmployeeActor } from '../access/employee-actor.js';
import {
  EMPLOYEE_REPOSITORY,
  type EmployeeRecord,
  type EmployeeRepository,
  type UpdateEmployeeInput,
} from '../../domain/repositories/employee.repository.js';

export type UpdateEmployeeCommand = {
  readonly actor: EmployeeActor;
  readonly employeeId: string;
  readonly input: UpdateEmployeeInput;
};

@Injectable()
export class UpdateEmployeeHandler {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repository: EmployeeRepository) {}

  async execute(command: UpdateEmployeeCommand): Promise<EmployeeRecord> {
    const { organizationId, adminId } = command.actor;
    const normalized = normalizeEmployeeContact(command.input);
    const input: UpdateEmployeeInput = {
      ...command.input,
      ...(normalized.workEmail !== undefined && normalized.workEmail !== null
        ? { workEmail: normalized.workEmail }
        : {}),
      ...(normalized.phone !== undefined && normalized.phone !== null
        ? { phone: normalized.phone }
        : {}),
      ...(normalized.alternatePhone !== undefined ? { alternatePhone: normalized.alternatePhone } : {}),
    };
    await assertEmployeeContactAvailable(this.repository, organizationId, input, {
      excludeEmployeeId: command.employeeId,
    });
    if (input.reportingManagerId !== undefined) {
      await assertReportingManagerValid(
        this.repository,
        organizationId,
        command.employeeId,
        input.reportingManagerId,
      );
    }
    return this.repository.updateEmployee(organizationId, command.employeeId, input, adminId);
  }
}
