import { API_PREFIX } from './http.js';

export const LEAVE_ROUTES = {
  types: `${API_PREFIX}/leave/types`,
  type: (id: string) => `${API_PREFIX}/leave/types/${id}`,
  typeStatus: (id: string) => `${API_PREFIX}/leave/types/${id}/status`,
  yearConfigurations: `${API_PREFIX}/leave/year-configurations`,
  yearConfiguration: (id: string) => `${API_PREFIX}/leave/year-configurations/${id}`,
  yearConfigurationWithAllocations: `${API_PREFIX}/leave/year-configurations/with-allocations`,
  yearConfigurationWithAllocationsById: (id: string) =>
    `${API_PREFIX}/leave/year-configurations/${id}/with-allocations`,
  yearConfigurationActivate: (id: string) =>
    `${API_PREFIX}/leave/year-configurations/${id}/activate`,
  yearConfigurationClose: (id: string) =>
    `${API_PREFIX}/leave/year-configurations/${id}/close`,
  yearConfigurationStatus: (id: string) =>
    `${API_PREFIX}/leave/year-configurations/${id}/status`,
  yearConfigurationGenerateBalances: (id: string) =>
    `${API_PREFIX}/leave/year-configurations/${id}/generate-balances`,
  yearConfigurationEmployeeLeaveRecords: (id: string) =>
    `${API_PREFIX}/leave/year-configurations/${id}/employee-leave-records`,
  allocations: `${API_PREFIX}/leave/allocations`,
  allocation: (id: string) => `${API_PREFIX}/leave/allocations/${id}`,
  employeeBalances: `${API_PREFIX}/leave/employee-balances`,
  employeeBalance: (id: string) => `${API_PREFIX}/leave/employee-balances/${id}`,
  employeeBalanceAdjust: (id: string) => `${API_PREFIX}/leave/employee-balances/${id}/adjust`,
  balanceTransactions: `${API_PREFIX}/leave/balance-transactions`,
  requests: `${API_PREFIX}/leave/requests`,
  request: (id: string) => `${API_PREFIX}/leave/requests/${id}`,
  requestApprove: (id: string) => `${API_PREFIX}/leave/requests/${id}/approve`,
  requestReject: (id: string) => `${API_PREFIX}/leave/requests/${id}/reject`,
  requestCancel: (id: string) => `${API_PREFIX}/leave/requests/${id}/cancel`,
  myBalances: `${API_PREFIX}/leave/my/balances`,
  myRequests: `${API_PREFIX}/leave/my/requests`,
  myRequest: (id: string) => `${API_PREFIX}/leave/my/requests/${id}`,
  apply: `${API_PREFIX}/leave/my/apply`,
  previewDays: `${API_PREFIX}/leave/my/preview-days`,
} as const;

export type LeaveTypeStatus = 'ACTIVE' | 'INACTIVE';
export type LeaveTypeKind = 'PAID' | 'UNPAID';
export type LeaveAccrualMethod = 'ANNUAL_FULL' | 'MONTHLY' | 'PRORATED_JOIN' | 'NONE';
export type LeaveYearConfigurationStatus = 'ACTIVE' | 'INACTIVE';
export type LeaveAllocationEligibility =
  | 'ALL_EMPLOYEES'
  | 'SELECTED_EMPLOYEES'
  | 'SELECTED_DEPARTMENTS'
  | 'SELECTED_EMPLOYMENT_TYPES';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaveHalfDaySession = 'FIRST_HALF' | 'SECOND_HALF';

export interface LeaveTypeItem {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string | null;
  readonly kind: LeaveTypeKind;
  readonly status: LeaveTypeStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeaveTypeListResponse {
  readonly items: readonly LeaveTypeItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface LeaveYearConfigurationAllocationSummary {
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly annualAllocationDays: string;
}

export interface LeaveYearConfigurationItem {
  readonly id: string;
  readonly name: string;
  readonly calendarYear: number;
  readonly yearStartDate: string;
  readonly yearEndDate: string;
  readonly status: LeaveYearConfigurationStatus;
  readonly balancesGeneratedAt: string | null;
  readonly activatedAt: string | null;
  readonly totalAllocatedDays: string;
  readonly allocations: readonly LeaveYearConfigurationAllocationSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeaveYearAllocationItem {
  readonly id: string;
  readonly leaveYearConfigurationId: string;
  readonly calendarYear: number;
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly leaveTypeCode: string;
  readonly isPaid: boolean;
  readonly annualAllocationDays: string;
  readonly accrualMethod: LeaveAccrualMethod;
  readonly carryForwardEnabled: boolean;
  readonly maxCarryForwardDays: string;
  readonly eligibility: LeaveAllocationEligibility;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly isActive: boolean;
}

export interface LeaveYearAllocationListResponse {
  readonly yearConfiguration: LeaveYearConfigurationItem;
  readonly items: readonly LeaveYearAllocationItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export type EmployeeLeaveBalanceAvailabilityReason =
  | 'READY'
  | 'NO_ACTIVE_POLICY'
  | 'POLICY_NOT_IN_EFFECT'
  | 'NO_ELIGIBLE_ALLOCATIONS'
  | 'EMPLOYEE_NOT_ACTIVE'
  | 'BALANCES_NOT_INITIALIZED'
  | 'EMPLOYEE_PROFILE_NOT_LINKED';

export interface EmployeeLeaveBalanceAvailability {
  readonly reason: EmployeeLeaveBalanceAvailabilityReason;
  readonly message: string;
  readonly policyName?: string;
}

export interface EmployeeLeaveBalanceItem {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeDisplayName: string;
  readonly employeeCode: string;
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly leaveTypeCode: string;
  readonly leaveTypeIsPaid: boolean;
  readonly calendarYear: number;
  readonly allocatedDays: string;
  readonly carryForwardDays: string;
  readonly adjustmentCreditDays: string;
  readonly adjustmentDebitDays: string;
  readonly usedApprovedDays: string;
  readonly reservedPendingDays: string;
  readonly availableDays: string;
}

export interface EmployeeLeaveBalanceListResponse {
  readonly items: readonly EmployeeLeaveBalanceItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly availability?: EmployeeLeaveBalanceAvailability;
}

export interface EmployeeLeaveRecordLeaveTypeBalance {
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly allocatedDays: string;
  readonly usedDays: string;
  readonly availableDays: string;
}

export interface EmployeeLeaveRecordRow {
  readonly employeeId: string;
  readonly employeeDisplayName: string;
  readonly employeeCode: string;
  readonly profileImageUrl: string | null;
  readonly leaveTypes: readonly EmployeeLeaveRecordLeaveTypeBalance[];
  readonly totalAllocatedDays: string;
  readonly totalUsedDays: string;
  readonly totalAvailableDays: string;
}

export interface EmployeeLeaveRecordsResponse {
  readonly configuration: LeaveYearConfigurationItem;
  readonly leaveTypeColumns: readonly {
    readonly leaveTypeId: string;
    readonly leaveTypeName: string;
  }[];
  readonly items: readonly EmployeeLeaveRecordRow[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface LeaveRequestItem {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeDisplayName: string;
  readonly employeeCode: string;
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly leaveTypeCode: string;
  readonly calendarYear: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly selectedDates: readonly string[];
  readonly isHalfDay: boolean;
  readonly halfDaySession: LeaveHalfDaySession | null;
  readonly halfDayDate: string | null;
  readonly totalDays: string;
  readonly reason: string;
  readonly notes: string;
  readonly attachmentStoredObjectId: string | null;
  readonly status: LeaveRequestStatus;
  readonly appliedAt: string;
  readonly decidedAt: string | null;
  readonly rejectionReason: string;
}

export interface LeaveRequestListResponse {
  readonly items: readonly LeaveRequestItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface LeavePreviewDaysResponse {
  readonly totalDays: string;
  readonly earliestEligibleStartDate: string;
  readonly policyYearStartDate: string | null;
  readonly policyYearEndDate: string | null;
  readonly hasWorkingLeaveDays: boolean;
}

export interface GenerateEmployeeBalancesResponse {
  readonly created: number;
  readonly skipped: number;
}
