import type {
  AssignableEmployee,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeSalaryStructure,
} from '@techwin/contracts';
import { computeEmployeeSalaryTotals } from '@techwin/validation';
import type {
  AssignableEmployeeRecord,
  EmployeeRecord,
} from '../../../domain/repositories/employee.repository.js';

function toSalaryStructure(
  record: EmployeeRecord['salaryStructure'],
): EmployeeSalaryStructure | null {
  if (!record) return null;
  const totals = computeEmployeeSalaryTotals(record);
  return { ...record, ...totals };
}

export function toEmployeeListItem(record: EmployeeRecord): EmployeeListItem {
  return {
    id: record.id,
    employeeCode: record.employeeCode,
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: record.displayName,
    workEmail: record.workEmail,
    phone: record.phone,
    jobTitle: record.jobTitle,
    department: record.department,
    employmentType: record.employmentType,
    employmentStatus: record.employmentStatus,
    dateOfJoining: record.dateOfJoining,
    profileImageUrl: record.profileImageUrl,
    platformAdminId: record.platformAdminId,
    loginAccess: record.loginAccess,
  };
}

export function toEmployeeDetail(
  record: EmployeeRecord,
  options?: { readonly includeCompensation?: boolean },
): EmployeeDetail {
  const includeCompensation = options?.includeCompensation ?? false;
  return {
    ...toEmployeeListItem(record),
    alternatePhone: record.alternatePhone,
    profileImageUrl: record.profileImageUrl,
    probationEndDate: record.probationEndDate,
    employmentEndDate: record.employmentEndDate,
    workLocation: record.workLocation,
    notes: record.notes,
    platformAdminId: record.platformAdminId,
    deactivatedAt: record.deactivatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    salaryStructure: includeCompensation ? toSalaryStructure(record.salaryStructure) : null,
  };
}

export function toAssignableEmployee(record: AssignableEmployeeRecord): AssignableEmployee {
  return {
    id: record.id,
    employeeCode: record.employeeCode,
    displayName: record.displayName,
    jobTitle: record.jobTitle,
    profileImageUrl: record.profileImageUrl,
    platformAdminId: record.platformAdminId,
  };
}
