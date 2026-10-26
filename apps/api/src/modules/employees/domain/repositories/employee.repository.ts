export type EmployeeEmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type EmployeeEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface EmployeeManagerSummary {
  readonly id: string;
  readonly displayName: string;
  readonly employeeCode: string;
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
  readonly department: string;
  readonly employmentType: EmployeeEmploymentType;
  readonly employmentStatus: EmployeeEmploymentStatus;
  readonly dateOfJoining: string;
  readonly probationEndDate: string | null;
  readonly employmentEndDate: string | null;
  readonly workLocation: string | null;
  readonly reportingManager: EmployeeManagerSummary | null;
  readonly notes: string;
  readonly platformAdminId: string | null;
  readonly deactivatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EmployeeListFilters {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: EmployeeEmploymentStatus;
  readonly department?: string;
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
  readonly jobTitle: string;
  readonly department: string;
  readonly employmentType: EmployeeEmploymentType;
  readonly employmentStatus?: EmployeeEmploymentStatus;
  readonly dateOfJoining: string;
  readonly probationEndDate?: string | null;
  readonly employmentEndDate?: string | null;
  readonly workLocation?: string | null;
  readonly reportingManagerId?: string | null;
  readonly notes?: string;
  readonly platformAdminId?: string | null;
}

export interface UpdateEmployeeInput {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly workEmail?: string;
  readonly phone?: string;
  readonly alternatePhone?: string | null;
  readonly profileImageUrl?: string | null;
  readonly jobTitle?: string;
  readonly department?: string;
  readonly employmentType?: EmployeeEmploymentType;
  readonly dateOfJoining?: string;
  readonly probationEndDate?: string | null;
  readonly employmentEndDate?: string | null;
  readonly workLocation?: string | null;
  readonly reportingManagerId?: string | null;
  readonly notes?: string;
  readonly platformAdminId?: string | null;
}

export interface EmployeeRepository {
  listEmployees(organizationId: string, filters: EmployeeListFilters): Promise<PaginatedEmployees>;
  getEmployee(organizationId: string, employeeId: string): Promise<EmployeeRecord | null>;
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
  getReportingManagerId(organizationId: string, employeeId: string): Promise<string | null>;
  countDirectReports(organizationId: string, employeeId: string): Promise<number>;
  listManagerOptions(
    organizationId: string,
    excludeEmployeeId?: string,
  ): Promise<readonly EmployeeManagerSummary[]>;
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
