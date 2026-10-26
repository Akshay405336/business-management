import { Prisma } from '../../../../../generated/prisma/client.js';
import { EmployeeValidationError } from '../../../domain/errors/employee.errors.js';

export function rethrowEmployeeUniqueViolation(error: unknown): never {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    throw error;
  }
  const target = error.meta?.target;
  const targets = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];
  const text = targets.join(' ').toLowerCase();
  const conflicts: { path: string; message: string }[] = [];
  if (text.includes('work_email') || text.includes('email')) {
    conflicts.push({
      path: 'workEmail',
      message: 'An employee with this work email already exists.',
    });
  }
  if (text.includes('phone')) {
    conflicts.push({
      path: 'phone',
      message: 'An employee with this phone number already exists.',
    });
  }
  if (conflicts.length > 0) {
    throw new EmployeeValidationError(
      conflicts[0]!.message,
      conflicts,
    );
  }
  throw error;
}
