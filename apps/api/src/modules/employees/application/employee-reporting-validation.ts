import { EmployeeValidationError } from '../domain/errors/employee.errors.js';
import type { EmployeeRepository } from '../domain/repositories/employee.repository.js';
import { assertNoReportingCycle } from '../domain/services/employee-reporting.policy.js';

export async function assertReportingManagerValid(
  repository: EmployeeRepository,
  organizationId: string,
  employeeId: string,
  reportingManagerId: string | null | undefined,
): Promise<void> {
  if (!reportingManagerId) return;
  const manager = await repository.getEmployee(organizationId, reportingManagerId);
  if (!manager) {
    throw new EmployeeValidationError('Reporting manager was not found.', [
      { path: 'reportingManagerId', message: 'Select a valid reporting manager.' },
    ]);
  }
  await assertNoReportingCycle(employeeId, reportingManagerId, (id) =>
    repository.getReportingManagerId(organizationId, id),
  );
}
