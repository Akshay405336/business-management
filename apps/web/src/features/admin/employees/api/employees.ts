import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type {
  ChangeEmployeeStatusRequest,
  CreateEmployeeRequest,
  EmployeeCodePreviewResponse,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeManagerOptionsResponse,
  UpdateEmployeeRequest,
} from '../types';

export function listEmployees(
  query: Partial<EmployeeListQuery> = {},
  signal?: AbortSignal,
): Promise<EmployeeListResponse> {
  return apiRequest<EmployeeListResponse>(`${EMPLOYEE_ROUTES.employees}${buildQueryString(query)}`, {
    auth: true,
    signal,
  });
}

export function previewEmployeeCode(signal?: AbortSignal): Promise<EmployeeCodePreviewResponse> {
  return apiRequest<EmployeeCodePreviewResponse>(EMPLOYEE_ROUTES.employeeCodePreview, {
    auth: true,
    signal,
  });
}

export function listEmployeeManagerOptions(
  excludeEmployeeId?: string,
  signal?: AbortSignal,
): Promise<EmployeeManagerOptionsResponse> {
  const query = excludeEmployeeId ? buildQueryString({ excludeEmployeeId }) : '';
  return apiRequest<EmployeeManagerOptionsResponse>(
    `${EMPLOYEE_ROUTES.employeeManagerOptions}${query}`,
    { auth: true, signal },
  );
}

export function getEmployee(id: string, signal?: AbortSignal): Promise<EmployeeDetail> {
  return apiRequest<EmployeeDetail>(EMPLOYEE_ROUTES.employee(id), { auth: true, signal });
}

export function createEmployee(body: CreateEmployeeRequest): Promise<EmployeeDetail> {
  return apiRequest<EmployeeDetail>(EMPLOYEE_ROUTES.employees, { method: 'POST', auth: true, body });
}

export function updateEmployee(id: string, body: UpdateEmployeeRequest): Promise<EmployeeDetail> {
  return apiRequest<EmployeeDetail>(EMPLOYEE_ROUTES.employee(id), { method: 'PATCH', auth: true, body });
}

export function changeEmployeeStatus(
  id: string,
  body: ChangeEmployeeStatusRequest,
): Promise<EmployeeDetail> {
  return apiRequest<EmployeeDetail>(EMPLOYEE_ROUTES.employeeStatus(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteEmployee(id: string): Promise<void> {
  return apiRequest<void>(EMPLOYEE_ROUTES.employee(id), { method: 'DELETE', auth: true });
}
