import { EmployeeValidationError } from '../errors/employee.errors.js';

export function assertNoReportingCycle(
  employeeId: string,
  proposedManagerId: string | null | undefined,
  resolveManagerId: (id: string) => Promise<string | null>,
): Promise<void> {
  if (!proposedManagerId) return Promise.resolve();
  if (proposedManagerId === employeeId) {
    throw new EmployeeValidationError('An employee cannot report to themselves.', [
      { path: 'reportingManagerId', message: 'An employee cannot report to themselves.' },
    ]);
  }
  return walkManagerChain(proposedManagerId, employeeId, resolveManagerId);
}

async function walkManagerChain(
  currentManagerId: string,
  employeeId: string,
  resolveManagerId: (id: string) => Promise<string | null>,
): Promise<void> {
  let cursor: string | null = currentManagerId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === employeeId) {
      throw new EmployeeValidationError('Reporting manager assignment would create a cycle.', [
        {
          path: 'reportingManagerId',
          message: 'Reporting manager assignment would create a cycle.',
        },
      ]);
    }
    if (visited.has(cursor)) break;
    visited.add(cursor);
    cursor = await resolveManagerId(cursor);
  }
}
