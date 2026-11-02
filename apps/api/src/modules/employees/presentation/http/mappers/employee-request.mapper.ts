import type { CreateEmployeeRequest, UpdateEmployeeRequest } from '@techwin/validation';
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../../../domain/repositories/employee.repository.js';

export function toCreateEmployeeInput(body: CreateEmployeeRequest): CreateEmployeeInput {
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    workEmail: body.workEmail,
    phone: body.phone,
    alternatePhone: body.alternatePhone ?? null,
    profileImageUrl: body.profileImageUrl ?? null,
    profileImageStoredObjectId: body.profileImageStoredObjectId ?? null,
    jobTitle: body.jobTitle,
    department: body.department ?? null,
    employmentType: body.employmentType,
    ...(body.employmentStatus !== undefined ? { employmentStatus: body.employmentStatus } : {}),
    dateOfJoining: body.dateOfJoining,
    probationEndDate: body.probationEndDate ?? null,
    employmentEndDate: body.employmentEndDate ?? null,
    workLocation: body.workLocation ?? null,
    notes: body.notes ?? '',
    ...(body.salaryStructure !== undefined
      ? {
          salaryStructure: {
            currency: body.salaryStructure.currency,
            frequency: body.salaryStructure.frequency,
            basicSalary: body.salaryStructure.basicSalary,
            houseRentAllowance: body.salaryStructure.houseRentAllowance,
            otherAllowances: body.salaryStructure.otherAllowances,
            bonus: body.salaryStructure.bonus,
            otherEarnings: body.salaryStructure.otherEarnings,
            providentFund: body.salaryStructure.providentFund,
            professionalTax: body.salaryStructure.professionalTax,
            otherDeductions: body.salaryStructure.otherDeductions,
          },
        }
      : {}),
  };
}

/** Login credentials stay out of the employee record and go only to account creation. */
export function toCreateEmployeeLogin(
  body: CreateEmployeeRequest,
): { password: string } | null {
  if (!body.loginEnabled || !body.password) return null;
  return { password: body.password };
}

export function toUpdateEmployeeInput(body: UpdateEmployeeRequest): UpdateEmployeeInput {
  return {
    ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
    ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
    ...(body.workEmail !== undefined ? { workEmail: body.workEmail } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.alternatePhone !== undefined ? { alternatePhone: body.alternatePhone } : {}),
    ...(body.profileImageUrl !== undefined ? { profileImageUrl: body.profileImageUrl } : {}),
    ...(body.profileImageStoredObjectId !== undefined
      ? { profileImageStoredObjectId: body.profileImageStoredObjectId }
      : {}),
    ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
    ...(body.dateOfJoining !== undefined ? { dateOfJoining: body.dateOfJoining } : {}),
    ...(body.probationEndDate !== undefined ? { probationEndDate: body.probationEndDate } : {}),
    ...(body.employmentEndDate !== undefined ? { employmentEndDate: body.employmentEndDate } : {}),
    ...(body.workLocation !== undefined ? { workLocation: body.workLocation } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
    ...(body.salaryStructure !== undefined
      ? {
          salaryStructure: {
            currency: body.salaryStructure.currency,
            frequency: body.salaryStructure.frequency,
            basicSalary: body.salaryStructure.basicSalary,
            houseRentAllowance: body.salaryStructure.houseRentAllowance,
            otherAllowances: body.salaryStructure.otherAllowances,
            bonus: body.salaryStructure.bonus,
            otherEarnings: body.salaryStructure.otherEarnings,
            providentFund: body.salaryStructure.providentFund,
            professionalTax: body.salaryStructure.professionalTax,
            otherDeductions: body.salaryStructure.otherDeductions,
          },
        }
      : {}),
  };
}
