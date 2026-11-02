export type EmployeeEmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type EmployeeEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export type EmployeeSalaryFrequency = 'MONTHLY' | 'ANNUAL';

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
  readonly employmentStatus?: EmployeeEmploymentStatus;
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

export interface EmployeeRepository {
  listEmployees(organizationId: string, filters: EmployeeListFilters): Promise<PaginatedEmployees>;
  getEmployee(organizationId: string, employeeId: string): Promise<EmployeeRecord | null>;
  getProfileImageStoredObjectId(
    organizationId: string,
    employeeId: string,
  ): Promise<string | null>;
  previewEmployeeCode(organizationId: string): Promise<string>;
  findEmployeeIdByWorkEmail(
    organizationId: string,
    workEmail: string,
    excludeEmployeeId?: string,
  ): Promise<string | null>;
  findEmployeeIdByPhone(
    organizationId: string,
    phone: string,
    excludeEmployeeId?: string,
  ): Promise<string | null>;
  listAssignableEmployees(
    organizationId: string,
    search?: string,
  ): Promise<readonly AssignableEmployeeRecord[]>;
  /**
   * Creates the employee and, when `loginAccount` is given, its sign-in account,
   * membership and role in the same transaction.
   */
  createEmployee(
    organizationId: string,
    employeeId: string,
    input: CreateEmployeeInput,
    adminId: string,
    loginAccount?: NewEmployeeLoginAccount | null,
  ): Promise<EmployeeRecord>;
  updateEmployee(
    organizationId: string,
    employeeId: string,
    input: UpdateEmployeeInput,
    adminId: string,
  ): Promise<EmployeeRecord>;
  changeEmployeeStatus(
    organizationId: string,
    employeeId: string,
    status: EmployeeEmploymentStatus,
    adminId: string,
  ): Promise<EmployeeRecord>;
  getDeletionTarget(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeDeletionTarget | null>;
  /**
   * Permanently deletes the employee and, in the same transaction, the sign-in account it
   * owns (see `EmployeeDeletionResult.loginAccount`), writing an EMPLOYEE_DELETED audit event.
   */
  deleteEmployee(
    organizationId: string,
    employeeId: string,
    adminId: string,
  ): Promise<EmployeeDeletionResult>;
}

export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');
