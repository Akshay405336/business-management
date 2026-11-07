import { EmployeeContactUniquenessPolicy } from '../../domain/policies/employee-contact-uniqueness.policy.js';
import type { EmployeeRepository } from '../../domain/repositories/employee.repository.js';
import { EmployeeEmail } from '../../domain/value-objects/employee-email.vo.js';
import { EmployeePhone } from '../../domain/value-objects/employee-phone.vo.js';

export async function assertEmployeeContactAvailable(
  repository: EmployeeRepository,
  organizationId: string,
  contact: { workEmail?: string | null; phone?: string | null },
  options?: { excludeEmployeeId?: string },
): Promise<void> {
  const email = EmployeeEmail.normalize(contact.workEmail);
  const phone = EmployeePhone.normalize(contact.phone);
  const excludeEmployeeId = options?.excludeEmployeeId;
  const emailTaken = email
    ? Boolean(await repository.findEmployeeIdByWorkEmail(organizationId, email, excludeEmployeeId))
    : false;
  const phoneTaken = phone
    ? Boolean(await repository.findEmployeeIdByPhone(organizationId, phone, excludeEmployeeId))
    : false;
  EmployeeContactUniquenessPolicy.assertAvailable({ emailTaken, phoneTaken });
}
