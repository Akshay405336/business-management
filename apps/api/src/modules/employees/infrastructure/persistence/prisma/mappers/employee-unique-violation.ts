import { Prisma } from '../../../../../../generated/prisma/client.js';
import { EmployeeValidationError } from '../../../../domain/errors/employee.errors.js';
import { EmployeeContactUniquenessPolicy } from '../../../../domain/policies/employee-contact-uniqueness.policy.js';

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
      message: EmployeeContactUniquenessPolicy.duplicateEmailMessage(),
    });
  }
  if (text.includes('phone')) {
    conflicts.push({
      path: 'phone',
      message: EmployeeContactUniquenessPolicy.duplicatePhoneMessage(),
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
