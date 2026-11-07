import { LEAVE_ROUTES, type LeaveTypeItem, type LeaveTypeListResponse } from '@techwin/contracts';
import type {
  ChangeLeaveTypeStatusRequest,
  CreateLeaveTypeRequest,
  LeaveTypeListQuery,
  UpdateLeaveTypeRequest,
} from '@techwin/validation';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';

export type { LeaveTypeListQuery };

export function listLeaveTypes(
  query?: LeaveTypeListQuery,
  signal?: AbortSignal,
): Promise<LeaveTypeListResponse> {
  return apiRequest<LeaveTypeListResponse>(
    `${LEAVE_ROUTES.types}${buildQueryString(query ?? {})}`,
    { auth: true, signal },
  );
}

export function getLeaveType(id: string, signal?: AbortSignal): Promise<LeaveTypeItem> {
  return apiRequest<LeaveTypeItem>(LEAVE_ROUTES.type(id), { auth: true, signal });
}

export function createLeaveType(body: CreateLeaveTypeRequest): Promise<LeaveTypeItem> {
  return apiRequest<LeaveTypeItem>(LEAVE_ROUTES.types, { auth: true, method: 'POST', body });
}

export function updateLeaveType(id: string, body: UpdateLeaveTypeRequest): Promise<LeaveTypeItem> {
  return apiRequest<LeaveTypeItem>(LEAVE_ROUTES.type(id), { auth: true, method: 'PATCH', body });
}

export function changeLeaveTypeStatus(
  id: string,
  body: ChangeLeaveTypeStatusRequest,
): Promise<LeaveTypeItem> {
  return apiRequest<LeaveTypeItem>(LEAVE_ROUTES.typeStatus(id), {
    auth: true,
    method: 'PATCH',
    body,
  });
}

export function deleteLeaveType(id: string): Promise<void> {
  return apiRequest<void>(LEAVE_ROUTES.type(id), { auth: true, method: 'DELETE' });
}
