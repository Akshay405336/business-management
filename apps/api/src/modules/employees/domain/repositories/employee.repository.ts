export type {
  AssignableEmployeeRecord,
  CreateEmployeeInput,
  EmployeeDailyTaskDeletionImpact,
  EmployeeDeletionResult,
  EmployeeDeletionTarget,
  EmployeeEmploymentStatus,
  EmployeeEmploymentType,
  EmployeeListFilters,
  EmployeeLoginAccessRecord,
  EmployeeLoginDeletionOutcome,
  EmployeeLoginStatus,
  EmployeeRecord,
  EmployeeSalaryFrequency,
  EmployeeSalaryRecord,
  NewEmployeeLoginAccount,
  PaginatedEmployees,
  UpdateEmployeeInput,
} from '../types/employee.types.js';

import type {
  AssignableEmployeeRecord,
  CreateEmployeeInput,
  EmployeeDailyTaskDeletionImpact,
  EmployeeDeletionResult,
  EmployeeDeletionTarget,
  EmployeeEmploymentStatus,
  EmployeeListFilters,
  EmployeeRecord,
  NewEmployeeLoginAccount,
  PaginatedEmployees,
  UpdateEmployeeInput,
} from '../types/employee.types.js';

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
  /** Organization-scoped count of assigned daily tasks that are not on a completed stage. */
  getDailyTaskDeletionImpact(
    organizationId: string,
    employeeId: string,
  ): Promise<EmployeeDailyTaskDeletionImpact>;
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
