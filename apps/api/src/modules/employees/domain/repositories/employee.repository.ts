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
  readonly employmentType: EmployeeEmploymentType;
  readonly employmentStatus: EmployeeEmploymentStatus;
  readonly dateOfJoining: string;
  readonly probationEndDate: string | null;
  readonly employmentEndDate: string | null;
  readonly workLocation: string | null;
  readonly notes: string;
  readonly platformAdminId: string | null;
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
  readonly employmentType: EmployeeEmploymentType;
  readonly dateOfJoining: string;
  readonly probationEndDate?: string | null;
  readonly employmentEndDate?: string | null;
  readonly workLocation?: string | null;
  readonly notes?: string;
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
  readonly employmentType?: EmployeeEmploymentType;
  readonly dateOfJoining?: string;
  readonly probationEndDate?: string | null;
  readonly employmentEndDate?: string | null;
  readonly workLocation?: string | null;
  readonly notes?: string;
  readonly platformAdminId?: string | null;
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
  createEmployee(
    organizationId: string,
    employeeId: string,
    input: CreateEmployeeInput,
    adminId: string,
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
  deleteEmployee(organizationId: string, employeeId: string): Promise<void>;
}

export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');
