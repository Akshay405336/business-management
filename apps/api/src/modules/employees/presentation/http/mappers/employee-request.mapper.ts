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
    jobTitle: body.jobTitle,
    department: body.department,
    employmentType: body.employmentType,
    employmentStatus: body.employmentStatus,
    dateOfJoining: body.dateOfJoining,
    probationEndDate: body.probationEndDate ?? null,
    employmentEndDate: body.employmentEndDate ?? null,
    workLocation: body.workLocation ?? null,
    reportingManagerId: body.reportingManagerId ?? null,
    notes: body.notes ?? '',
    platformAdminId: body.platformAdminId ?? null,
  };
}

export function toUpdateEmployeeInput(body: UpdateEmployeeRequest): UpdateEmployeeInput {
  return {
    ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
    ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
    ...(body.workEmail !== undefined ? { workEmail: body.workEmail } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.alternatePhone !== undefined ? { alternatePhone: body.alternatePhone } : {}),
    ...(body.profileImageUrl !== undefined ? { profileImageUrl: body.profileImageUrl } : {}),
    ...(body.jobTitle !== undefined ? { jobTitle: body.jobTitle } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(body.employmentType !== undefined ? { employmentType: body.employmentType } : {}),
    ...(body.dateOfJoining !== undefined ? { dateOfJoining: body.dateOfJoining } : {}),
    ...(body.probationEndDate !== undefined ? { probationEndDate: body.probationEndDate } : {}),
    ...(body.employmentEndDate !== undefined ? { employmentEndDate: body.employmentEndDate } : {}),
    ...(body.workLocation !== undefined ? { workLocation: body.workLocation } : {}),
    ...(body.reportingManagerId !== undefined ? { reportingManagerId: body.reportingManagerId } : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
    ...(body.platformAdminId !== undefined ? { platformAdminId: body.platformAdminId } : {}),
  };
}
