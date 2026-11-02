import { API_PREFIX } from './http.js';

export const EMPLOYEE_ROUTES = {
  employees: `${API_PREFIX}/employees`,
  employee: (id: string) => `${API_PREFIX}/employees/${id}`,
  employeeStatus: (id: string) => `${API_PREFIX}/employees/${id}/status`,
  employeeCodePreview: `${API_PREFIX}/employees/code-preview`,
  assignableEmployees: `${API_PREFIX}/employees/assignable`,
  employeeProfileImageUpload: `${API_PREFIX}/employees/profile-image`,
  employeeStoredProfileImageContent: (storedObjectId: string) =>
    `${API_PREFIX}/employees/profile-stored-objects/${storedObjectId}/content`,
  employeeProfileImage: (organizationId: string, fileName: string) =>
    `${API_PREFIX}/employees/profile-images/${organizationId}/${fileName}`,
} as const;

export type EmployeeEmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type EmployeeEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export type EmployeeSalaryFrequency = 'MONTHLY' | 'ANNUAL';

export interface EmployeeSalaryStructure {
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
  readonly totalEarnings: number;
  readonly totalDeductions: number;
  readonly estimatedNetSalary: number;
}

export type EmployeeLoginStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';

export interface EmployeeLoginRole {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

/** Sign-in account linked to the employee; never includes credentials. */
export interface EmployeeLoginAccess {
  readonly membershipId: string;
  readonly status: EmployeeLoginStatus;
  readonly isOwner: boolean;
  /** Created together with the employee, so deleting the employee deletes the account. */
  readonly ownsAccount: boolean;
  readonly roles: readonly EmployeeLoginRole[];
  readonly lastLoginAt: string | null;
}

export interface EmployeeListItem {
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly workEmail: string;
  readonly phone: string;
  readonly jobTitle: string;
  readonly department: string | null;
  readonly employmentType: EmployeeEmploymentType;
  readonly employmentStatus: EmployeeEmploymentStatus;
  readonly dateOfJoining: string;
  readonly profileImageUrl: string | null;
  /** Linked platform admin account used for task assignment and login. */
  readonly platformAdminId: string | null;
  readonly loginAccess: EmployeeLoginAccess | null;
}

/** Minimal employee projection for task assignment pickers. */
export interface AssignableEmployee {
  readonly id: string;
  readonly employeeCode: string;
  readonly displayName: string;
  readonly jobTitle: string;
  readonly profileImageUrl: string | null;
  readonly platformAdminId: string | null;
}

export interface AssignableEmployeeListResponse {
  readonly items: readonly AssignableEmployee[];
}

/**
 * What happened to the employee's sign-in account on permanent deletion. NONE: no linked
 * account; ACCOUNT_PRESERVED: the linked account was not created for this employee.
 */
export type EmployeeDeletionLoginOutcome =
  | 'NONE'
  | 'ACCOUNT_DELETED'
  | 'MEMBERSHIP_REMOVED'
  | 'ACCOUNT_PRESERVED';

export interface DeleteEmployeeResponse {
  readonly loginAccount: EmployeeDeletionLoginOutcome;
}

export interface EmployeeDetail extends EmployeeListItem {
  readonly alternatePhone: string | null;
  readonly probationEndDate: string | null;
  readonly employmentEndDate: string | null;
  readonly workLocation: string | null;
  readonly notes: string;
  readonly deactivatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly salaryStructure: EmployeeSalaryStructure | null;
}

export interface EmployeeProfileImageUploadResponse {
  readonly profileImageStoredObjectId: string;
  readonly profileImageUrl: string;
}

export interface EmployeeListResponse {
  readonly items: readonly EmployeeListItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface EmployeeCodePreviewResponse {
  readonly employeeCode: string;
  readonly isPreview: true;
}

