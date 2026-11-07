import type { CreateEmployeeInput, UpdateEmployeeInput } from '../types/employee.types.js';
import { EmployeeEmail } from '../value-objects/employee-email.vo.js';
import { EmployeeName } from '../value-objects/employee-name.vo.js';
import { EmployeePhone } from '../value-objects/employee-phone.vo.js';
import { EmployeeCompensationPolicy } from '../policies/employee-compensation.policy.js';
import { EmployeeProfileImagePolicy } from '../policies/employee-profile-image.policy.js';

export class EmployeeValidationService {
  static normalizeCreate(input: CreateEmployeeInput): CreateEmployeeInput {
    const name = EmployeeName.create(input.firstName, input.lastName);
    const workEmail = EmployeeEmail.normalize(input.workEmail) ?? input.workEmail;
    const phone = EmployeePhone.require(input.phone, 'phone');
    const image = EmployeeProfileImagePolicy.normalizeAssignment(input);
    const salary = input.salaryStructure
      ? EmployeeCompensationPolicy.assertValid(input.salaryStructure)
      : input.salaryStructure;
    return {
      ...input,
      firstName: name.firstName,
      lastName: name.lastName,
      workEmail,
      phone,
      ...(input.alternatePhone !== undefined
        ? { alternatePhone: EmployeePhone.optional(input.alternatePhone, 'alternatePhone') }
        : {}),
      jobTitle: input.jobTitle.trim(),
      department: input.department?.trim() || null,
      workLocation: input.workLocation?.trim() || null,
      notes: input.notes?.trim() ?? '',
      profileImageUrl: image.profileImageUrl,
      profileImageStoredObjectId: image.profileImageStoredObjectId,
      ...(salary !== undefined ? { salaryStructure: salary } : {}),
    };
  }

  static normalizeUpdate(input: UpdateEmployeeInput): UpdateEmployeeInput {
    const email = input.workEmail !== undefined ? EmployeeEmail.normalize(input.workEmail) : undefined;
    const phone = input.phone !== undefined ? EmployeePhone.require(input.phone, 'phone') : undefined;
    const image =
      input.profileImageStoredObjectId !== undefined || input.profileImageUrl !== undefined
        ? EmployeeProfileImagePolicy.normalizeAssignment({
            profileImageUrl: input.profileImageUrl,
            profileImageStoredObjectId: input.profileImageStoredObjectId,
          })
        : null;
    return {
      ...input,
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
      ...(email ? { workEmail: email } : {}),
      ...(phone ? { phone } : {}),
      ...(input.alternatePhone !== undefined
        ? { alternatePhone: EmployeePhone.optional(input.alternatePhone, 'alternatePhone') }
        : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle.trim() } : {}),
      ...(input.department !== undefined ? { department: input.department?.trim() || null } : {}),
      ...(input.workLocation !== undefined
        ? { workLocation: input.workLocation?.trim() || null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      ...(input.profileImageStoredObjectId !== undefined && image
        ? { profileImageStoredObjectId: image.profileImageStoredObjectId, profileImageUrl: null }
        : input.profileImageUrl !== undefined && image
          ? { profileImageUrl: image.profileImageUrl }
          : {}),
      ...(input.salaryStructure
        ? { salaryStructure: EmployeeCompensationPolicy.assertValid(input.salaryStructure) }
        : {}),
    };
  }
}
