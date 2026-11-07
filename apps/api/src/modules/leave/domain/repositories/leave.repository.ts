import type {
  EmployeeLeaveBalanceItem,
  EmployeeLeaveBalanceListResponse,
  GenerateEmployeeBalancesResponse,
  LeaveRequestItem,
  LeaveRequestListResponse,
  LeaveYearAllocationItem,
  LeaveYearAllocationListResponse,
  LeaveYearConfigurationItem,
} from '@techwin/contracts';
import type {
  AdjustEmployeeLeaveBalanceRequest,
  ApplyLeaveRequest,
  CreateLeaveYearAllocationRequest,
  CreateLeaveBalanceConfigurationRequest,
  CreateLeaveYearConfigurationRequest,
  UpdateLeaveBalanceConfigurationRequest,
  EmployeeLeaveBalanceListQuery,
  LeaveAllocationListQuery,
  LeaveBalanceTransactionListQuery,
  LeaveRequestListQuery,
  UpdateLeaveYearAllocationRequest,
  UpdateLeaveYearConfigurationRequest,
  UpdateLeaveYearConfigurationStatusRequest,
} from '@techwin/validation';

export const LEAVE_REPOSITORY = Symbol('LEAVE_REPOSITORY');

export type LeaveBalanceTransactionItem = {
  readonly id: string;
  readonly employeeId: string;
  readonly leaveTypeId: string;
  readonly employeeLeaveBalanceId: string;
  readonly calendarYear: number;
  readonly transactionType: string;
  readonly days: string;
  readonly balanceBeforeDays: string;
  readonly balanceAfterDays: string;
  readonly leaveRequestId: string | null;
  readonly reason: string;
  readonly performedByAdminId: string;
  readonly createdAt: string;
};

export type LeaveBalanceTransactionListResponse = {
  readonly items: readonly LeaveBalanceTransactionItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export interface LeaveRepository {
  resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null>;

  getActiveLeavePolicyWindow(
    organizationId: string,
    asOfDateKey: string,
  ): Promise<{ yearStartDate: string; yearEndDate: string } | null>;

  listYearConfigurations(organizationId: string): Promise<readonly LeaveYearConfigurationItem[]>;
  getYearConfiguration(organizationId: string, id: string): Promise<LeaveYearConfigurationItem>;
  getYearConfigurationByYear(
    organizationId: string,
    calendarYear: number,
  ): Promise<LeaveYearConfigurationItem | null>;
  createYearConfiguration(
    organizationId: string,
    adminId: string,
    input: CreateLeaveYearConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem>;
  createLeaveBalanceConfiguration(
    organizationId: string,
    adminId: string,
    input: CreateLeaveBalanceConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem>;
  updateLeaveBalanceConfiguration(
    organizationId: string,
    id: string,
    adminId: string,
    input: UpdateLeaveBalanceConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem>;
  deleteYearConfiguration(organizationId: string, id: string): Promise<void>;
  updateYearConfiguration(
    organizationId: string,
    id: string,
    adminId: string,
    input: UpdateLeaveYearConfigurationRequest,
  ): Promise<LeaveYearConfigurationItem>;
  setYearConfigurationStatus(
    organizationId: string,
    id: string,
    adminId: string,
    input: UpdateLeaveYearConfigurationStatusRequest,
  ): Promise<LeaveYearConfigurationItem>;
  activateYearConfiguration(
    organizationId: string,
    id: string,
    adminId: string,
  ): Promise<LeaveYearConfigurationItem>;
  closeYearConfiguration(
    organizationId: string,
    id: string,
    adminId: string,
  ): Promise<LeaveYearConfigurationItem>;
  generateEmployeeBalances(
    organizationId: string,
    yearConfigurationId: string,
    adminId: string,
  ): Promise<GenerateEmployeeBalancesResponse>;

  listAllocations(
    organizationId: string,
    query: LeaveAllocationListQuery,
  ): Promise<LeaveYearAllocationListResponse>;
  createAllocation(
    organizationId: string,
    adminId: string,
    input: CreateLeaveYearAllocationRequest,
  ): Promise<LeaveYearAllocationItem>;
  updateAllocation(
    organizationId: string,
    allocationId: string,
    adminId: string,
    input: UpdateLeaveYearAllocationRequest,
  ): Promise<LeaveYearAllocationItem>;

  listEmployeeBalances(
    organizationId: string,
    query: EmployeeLeaveBalanceListQuery,
  ): Promise<EmployeeLeaveBalanceListResponse>;
  listMyEmployeeLeaveBalances(
    organizationId: string,
    employeeId: string,
    performedByAdminId: string,
    query: EmployeeLeaveBalanceListQuery,
  ): Promise<EmployeeLeaveBalanceListResponse>;
  getEmployeeBalance(organizationId: string, balanceId: string): Promise<EmployeeLeaveBalanceItem>;
  adjustEmployeeBalance(
    organizationId: string,
    balanceId: string,
    adminId: string,
    input: AdjustEmployeeLeaveBalanceRequest,
  ): Promise<EmployeeLeaveBalanceItem>;

  listBalanceTransactions(
    organizationId: string,
    query: LeaveBalanceTransactionListQuery,
  ): Promise<LeaveBalanceTransactionListResponse>;

  listLeaveRequests(
    organizationId: string,
    query: LeaveRequestListQuery,
    scope: { employeeId?: string },
  ): Promise<LeaveRequestListResponse>;
  getLeaveRequest(
    organizationId: string,
    requestId: string,
    scope: { employeeId?: string },
  ): Promise<LeaveRequestItem>;
  applyForLeave(
    organizationId: string,
    employeeId: string,
    adminId: string,
    input: ApplyLeaveRequest,
    computedTotalDays: string,
  ): Promise<LeaveRequestItem>;
  cancelLeaveRequest(
    organizationId: string,
    requestId: string,
    adminId: string,
    reason: string,
    scope: { employeeId?: string },
  ): Promise<LeaveRequestItem>;
  approveLeaveRequest(
    organizationId: string,
    requestId: string,
    adminId: string,
  ): Promise<LeaveRequestItem>;
  rejectLeaveRequest(
    organizationId: string,
    requestId: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<LeaveRequestItem>;
}
