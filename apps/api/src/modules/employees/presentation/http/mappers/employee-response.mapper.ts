import type { EmployeeDetail, EmployeeListItem } from '@techwin/contracts';
import type { EmployeeRecord } from '../../../domain/repositories/employee.repository.js';

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
    reportingManager: record.reportingManager,
  };
}

export function toEmployeeDetail(record: EmployeeRecord): EmployeeDetail {
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
  };
}
