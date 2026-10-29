import { API_PREFIX } from './http.js';

export const EMPLOYEE_ROUTES = {
  employees: `${API_PREFIX}/employees`,
  employee: (id: string) => `${API_PREFIX}/employees/${id}`,
  employeeStatus: (id: string) => `${API_PREFIX}/employees/${id}/status`,
  employeeCodePreview: `${API_PREFIX}/employees/code-preview`,
  employeeManagerOptions: `${API_PREFIX}/employees/manager-options`,
} as const;

export type EmployeeEmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type EmployeeEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface EmployeeManagerSummary {
  readonly id: string;
  readonly displayName: string;
  readonly employeeCode: string;
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
  readonly department: string;
  readonly employmentType: EmployeeEmploymentType;
  readonly employmentStatus: EmployeeEmploymentStatus;
  readonly dateOfJoining: string;
  readonly reportingManager: EmployeeManagerSummary | null;
  /** Linked platform admin account used for task assignment and login. */
  readonly platformAdminId: string | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  readonly alternatePhone: string | null;
  readonly profileImageUrl: string | null;
  readonly probationEndDate: string | null;
  readonly employmentEndDate: string | null;
  readonly workLocation: string | null;
  readonly notes: string;
  readonly platformAdminId: string | null;
  readonly deactivatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
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

export interface EmployeeManagerOptionsResponse {
  readonly managers: readonly EmployeeManagerSummary[];
}
