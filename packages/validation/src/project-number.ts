export const PROJECT_NUMBER_PREFIX = 'TECH-PRJ';

export function formatProjectNumber(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error('Project sequence number must be a positive integer.');
  }
  return `${PROJECT_NUMBER_PREFIX}-${String(sequenceNumber).padStart(4, '0')}`;
}
