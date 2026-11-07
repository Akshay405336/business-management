import {
  LEAVE_ROUTES,
  type EmployeeLeaveBalanceItem,
  type EmployeeLeaveBalanceListResponse,
  type GenerateEmployeeBalancesResponse,
  type LeavePreviewDaysResponse,
  type LeaveRequestItem,
  type LeaveRequestListResponse,
  type LeaveYearAllocationItem,
  type LeaveYearAllocationListResponse,
  type LeaveYearConfigurationItem,
} from '@techwin/contracts';
import type {
  AdjustEmployeeLeaveBalanceRequest,
  ApplyLeaveRequest,
  CancelLeaveRequestRequest,
  CreateLeaveYearAllocationRequest,
  CreateLeaveBalanceConfigurationRequest,
  CreateLeaveYearConfigurationRequest,
  UpdateLeaveBalanceConfigurationRequest,
  EmployeeLeaveBalanceListQuery,
  LeaveAllocationListQuery,
  LeaveBalanceTransactionListQuery,
  LeaveRequestListQuery,
  LeaveYearConfigurationQuery,
  PreviewLeaveDaysQuery,
  RejectLeaveRequestRequest,
  UpdateLeaveYearAllocationRequest,
  UpdateLeaveYearConfigurationRequest,
  UpdateLeaveYearConfigurationStatusRequest,
} from '@techwin/validation';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';

export {
  listLeaveTypes,
  getLeaveType,
} from '@/features/leave-types/api/leave-type.api';

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

export function listLeaveYearConfigurations(
  signal?: AbortSignal,
): Promise<readonly LeaveYearConfigurationItem[]> {
  return apiRequest<readonly LeaveYearConfigurationItem[]>(LEAVE_ROUTES.yearConfigurations, {
    auth: true,
    signal,
  });
}

export function getLeaveYearConfigurationByYear(
  calendarYear: number,
  signal?: AbortSignal,
): Promise<LeaveYearConfigurationItem> {
  const query: LeaveYearConfigurationQuery = { calendarYear };
  return apiRequest<LeaveYearConfigurationItem>(
    `${LEAVE_ROUTES.yearConfigurations}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function getLeaveYearConfiguration(
  id: string,
  signal?: AbortSignal,
): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfiguration(id), {
    auth: true,
    signal,
  });
}

export function createLeaveBalanceConfiguration(
  body: CreateLeaveBalanceConfigurationRequest,
): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfigurationWithAllocations, {
    auth: true,
    method: 'POST',
    body,
  });
}

export function updateLeaveBalanceConfiguration(
  id: string,
  body: UpdateLeaveBalanceConfigurationRequest,
): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(
    LEAVE_ROUTES.yearConfigurationWithAllocationsById(id),
    { auth: true, method: 'PATCH', body },
  );
}

export function deleteLeaveYearConfiguration(id: string): Promise<void> {
  return apiRequest<void>(LEAVE_ROUTES.yearConfiguration(id), { auth: true, method: 'DELETE' });
}

export function createLeaveYearConfiguration(
  body: CreateLeaveYearConfigurationRequest,
): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfigurations, {
    auth: true,
    method: 'POST',
    body,
  });
}

export function updateLeaveYearConfiguration(
  id: string,
  body: UpdateLeaveYearConfigurationRequest,
): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfiguration(id), {
    auth: true,
    method: 'PATCH',
    body,
  });
}

export function updateLeaveYearConfigurationStatus(
  id: string,
  body: UpdateLeaveYearConfigurationStatusRequest,
): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfigurationStatus(id), {
    auth: true,
    method: 'PATCH',
    body,
  });
}

export function activateLeaveYearConfiguration(id: string): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfigurationActivate(id), {
    auth: true,
    method: 'POST',
  });
}

export function closeLeaveYearConfiguration(id: string): Promise<LeaveYearConfigurationItem> {
  return apiRequest<LeaveYearConfigurationItem>(LEAVE_ROUTES.yearConfigurationClose(id), {
    auth: true,
    method: 'POST',
  });
}

export function generateLeaveYearBalances(id: string): Promise<GenerateEmployeeBalancesResponse> {
  return apiRequest<GenerateEmployeeBalancesResponse>(
    LEAVE_ROUTES.yearConfigurationGenerateBalances(id),
    { auth: true, method: 'POST' },
  );
}

export function listLeaveAllocations(
  query: LeaveAllocationListQuery,
  signal?: AbortSignal,
): Promise<LeaveYearAllocationListResponse> {
  return apiRequest<LeaveYearAllocationListResponse>(
    `${LEAVE_ROUTES.allocations}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function createLeaveAllocation(
  body: CreateLeaveYearAllocationRequest,
): Promise<LeaveYearAllocationItem> {
  return apiRequest<LeaveYearAllocationItem>(LEAVE_ROUTES.allocations, {
    auth: true,
    method: 'POST',
    body,
  });
}

export function updateLeaveAllocation(
  id: string,
  body: UpdateLeaveYearAllocationRequest,
): Promise<LeaveYearAllocationItem> {
  return apiRequest<LeaveYearAllocationItem>(LEAVE_ROUTES.allocation(id), {
    auth: true,
    method: 'PATCH',
    body,
  });
}

export function listEmployeeLeaveBalances(
  query?: EmployeeLeaveBalanceListQuery,
  signal?: AbortSignal,
): Promise<EmployeeLeaveBalanceListResponse> {
  return apiRequest<EmployeeLeaveBalanceListResponse>(
    `${LEAVE_ROUTES.employeeBalances}${buildQueryString(query ?? {})}`,
    { auth: true, signal },
  );
}

export function getEmployeeLeaveBalance(
  id: string,
  signal?: AbortSignal,
): Promise<EmployeeLeaveBalanceItem> {
  return apiRequest<EmployeeLeaveBalanceItem>(LEAVE_ROUTES.employeeBalance(id), {
    auth: true,
    signal,
  });
}

export function adjustEmployeeLeaveBalance(
  id: string,
  body: AdjustEmployeeLeaveBalanceRequest,
): Promise<EmployeeLeaveBalanceItem> {
  return apiRequest<EmployeeLeaveBalanceItem>(LEAVE_ROUTES.employeeBalanceAdjust(id), {
    auth: true,
    method: 'POST',
    body,
  });
}

export function listLeaveBalanceTransactions(
  query?: LeaveBalanceTransactionListQuery,
  signal?: AbortSignal,
): Promise<LeaveBalanceTransactionListResponse> {
  return apiRequest<LeaveBalanceTransactionListResponse>(
    `${LEAVE_ROUTES.balanceTransactions}${buildQueryString(query ?? {})}`,
    { auth: true, signal },
  );
}

export function listLeaveRequests(
  query?: LeaveRequestListQuery,
  signal?: AbortSignal,
): Promise<LeaveRequestListResponse> {
  return apiRequest<LeaveRequestListResponse>(
    `${LEAVE_ROUTES.requests}${buildQueryString(query ?? {})}`,
    { auth: true, signal },
  );
}

export function getLeaveRequest(id: string, signal?: AbortSignal): Promise<LeaveRequestItem> {
  return apiRequest<LeaveRequestItem>(LEAVE_ROUTES.request(id), { auth: true, signal });
}

export function approveLeaveRequest(id: string): Promise<LeaveRequestItem> {
  return apiRequest<LeaveRequestItem>(LEAVE_ROUTES.requestApprove(id), {
    auth: true,
    method: 'POST',
  });
}

export function rejectLeaveRequest(
  id: string,
  body: RejectLeaveRequestRequest,
): Promise<LeaveRequestItem> {
  return apiRequest<LeaveRequestItem>(LEAVE_ROUTES.requestReject(id), {
    auth: true,
    method: 'POST',
    body,
  });
}

export function cancelLeaveRequest(
  id: string,
  body?: CancelLeaveRequestRequest,
): Promise<LeaveRequestItem> {
  return apiRequest<LeaveRequestItem>(LEAVE_ROUTES.requestCancel(id), {
    auth: true,
    method: 'POST',
    body: body ?? { reason: '' },
  });
}

export function fetchMyLeaveBalances(
  query?: EmployeeLeaveBalanceListQuery,
  signal?: AbortSignal,
): Promise<EmployeeLeaveBalanceListResponse> {
  return apiRequest<EmployeeLeaveBalanceListResponse>(
    `${LEAVE_ROUTES.myBalances}${buildQueryString(query ?? {})}`,
    { auth: true, signal },
  );
}

export function listMyLeaveRequests(
  query?: LeaveRequestListQuery,
  signal?: AbortSignal,
): Promise<LeaveRequestListResponse> {
  return apiRequest<LeaveRequestListResponse>(
    `${LEAVE_ROUTES.myRequests}${buildQueryString(query ?? {})}`,
    { auth: true, signal },
  );
}

export function getMyLeaveRequest(id: string, signal?: AbortSignal): Promise<LeaveRequestItem> {
  return apiRequest<LeaveRequestItem>(LEAVE_ROUTES.myRequest(id), { auth: true, signal });
}

export function applyForLeave(body: ApplyLeaveRequest): Promise<LeaveRequestItem> {
  return apiRequest<LeaveRequestItem>(LEAVE_ROUTES.apply, { auth: true, method: 'POST', body });
}

export function previewLeaveDays(
  query: PreviewLeaveDaysQuery,
  signal?: AbortSignal,
): Promise<LeavePreviewDaysResponse> {
  return apiRequest<LeavePreviewDaysResponse>(
    `${LEAVE_ROUTES.previewDays}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}
