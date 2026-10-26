export const EMPLOYEE_CODE_PREFIX = 'TECH-EMP';

export function formatEmployeeCode(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Employee sequence number must be a positive integer.');
  }
  return `${EMPLOYEE_CODE_PREFIX}-${String(sequenceNumber).padStart(4, '0')}`;
}
