import type { EmployeeEmploymentStatus } from '../enums/employee-employment-status.enum.js';
import type { EmployeeEmploymentType } from '../enums/employee-employment-type.enum.js';
import type { EmployeeSalaryFrequency } from '../enums/employee-salary-frequency.enum.js';

export type { EmployeeEmploymentStatus, EmployeeEmploymentType, EmployeeSalaryFrequency };

export interface EmployeeSalaryRecord {
  readonly currency: string;
  readonly frequency: EmployeeSalaryFrequency;
  readonly basicSalary: number;
  readonly houseRentAllowance: number;
  readonly otherAllowances: number;
  readonly bonus: number;
  readonly otherEarnings: number;
  readonly providentFund: number;
  readonly professionalTax: number;
  readonly otherDeductions: number;
}

export type EmployeeLoginStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';

/** Linked sign-in access as seen from HR; credentials are never loaded. */
export interface EmployeeLoginAccessRecord {
  readonly membershipId: string;
  readonly status: EmployeeLoginStatus;
  readonly isOwner: boolean;
  /** Created together with the employee, so deleting the employee deletes the account. */
  readonly ownsAccount: boolean;
  readonly roles: readonly { readonly id: string; readonly key: string; readonly name: string }[];
  readonly lastLoginAt: string | null;
}

/** Prepared by the organization access service: hashes only, never plaintext. */
export interface NewEmployeeLoginAccount {
  readonly adminId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly totpSecretCiphertext: string;
  readonly roleIds: readonly string[];
  readonly isOwner: boolean;
}

export interface EmployeeDeletionTarget {
  readonly platformAdminId: string | null;
  readonly ownsLoginAccount: boolean;
  readonly profileImageStoredObjectId: string | null;
}

/** NONE: no linked account; ACCOUNT_PRESERVED: linked account was not created for the employee. */
export type EmployeeLoginDeletionOutcome =
  | 'NONE'
  | 'ACCOUNT_DELETED'
  | 'MEMBERSHIP_REMOVED'
  | 'ACCOUNT_PRESERVED';

export interface EmployeeDeletionResult {
  readonly loginAccount: EmployeeLoginDeletionOutcome;
  readonly platformAdminId: string | null;
  readonly profileImageStoredObjectId: string | null;
}

/** `status` is the daily-task workflow stage key. A task is finished only when that stage is completed. */
export interface EmployeePendingDailyTask {
  readonly id: string;
  readonly title: string;
  readonly status: string;
}

export interface EmployeeDailyTaskDeletionImpact {
  readonly pendingTaskCount: number;
  readonly completedTaskCount: number;
  readonly tasks: readonly EmployeePendingDailyTask[];
}

export interface AssignableEmployeeRecord {
  readonly id: string;
  readonly employeeCode: string;
  readonly displayName: string;
  readonly jobTitle: string;
  readonly profileImageUrl: string | null;
  readonly platformAdminId: string | null;
}

export interface EmployeeRecord {
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly workEmail: string;
  readonly phone: string;
  readonly alternatePhone: string | null;
  readonly profileImageUrl: string | null;
  readonly jobTitle: string;
  readonly department: string | null;
  readonly employmentType: EmployeeEmploymentType;
  readonly employmentStatus: EmployeeEmploymentStatus;
  readonly dateOfJoining: string;
  readonly probationEndDate: string | null;
  readonly employmentEndDate: string | null;
  readonly workLocation: string | null;
  readonly notes: string;
  readonly platformAdminId: string | null;
  readonly loginAccess: EmployeeLoginAccessRecord | null;
  readonly deactivatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly salaryStructure: EmployeeSalaryRecord | null;
}

export interface EmployeeListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: EmployeeEmploymentStatus;
  readonly employmentType?: EmployeeEmploymentType;
  readonly sortBy: 'displayName' | 'employeeCode' | 'dateOfJoining' | 'updatedAt';
  readonly sortDir: 'asc' | 'desc';
  /** Unlinked profiles eligible for sign-in account creation (Users module). */
  readonly accountLinkable?: boolean;
}

export interface PaginatedEmployees {
  readonly items: readonly EmployeeRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CreateEmployeeInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly workEmail: string;
  readonly phone: string;
  readonly alternatePhone?: string | null;
  readonly profileImageUrl?: string | null;
  readonly profileImageStoredObjectId?: string | null;
  readonly jobTitle: string;
  readonly department?: string | null;
  readonly employmentType: EmployeeEmploymentType;
  readonly dateOfJoining: string;
  readonly probationEndDate?: string | null;
  readonly employmentEndDate?: string | null;
  readonly workLocation?: string | null;
  readonly notes?: string;
  /** Set by the server only (account linking); never taken from the request body. */
  readonly platformAdminId?: string | null;
  readonly salaryStructure?: EmployeeSalaryRecord | null;
}

export interface UpdateEmployeeInput {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly workEmail?: string;
  readonly phone?: string;
  readonly alternatePhone?: string | null;
  readonly profileImageUrl?: string | null;
  readonly profileImageStoredObjectId?: string | null;
  readonly jobTitle?: string;
  readonly department?: string | null;
  readonly employmentType?: EmployeeEmploymentType;
  readonly dateOfJoining?: string;
  readonly probationEndDate?: string | null;
  readonly employmentEndDate?: string | null;
  readonly workLocation?: string | null;
  readonly notes?: string;
  readonly salaryStructure?: EmployeeSalaryRecord | null;
}

export interface EmployeeContactLookup {
  readonly workEmail?: string | null;
  readonly phone?: string | null;
}
