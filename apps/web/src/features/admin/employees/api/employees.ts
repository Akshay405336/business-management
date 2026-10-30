import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type { EmployeeProfileImageUploadResponse } from '@techwin/contracts';
import type {
  ChangeEmployeeStatusRequest,
  CreateEmployeeRequest,
  EmployeeCodePreviewResponse,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeListResponse,
  UpdateEmployeeRequest,
} from '../types';
import { accessTokenStore } from '@/shared/api/api-client';
import { apiConfig } from '@/shared/api/api-config';
import { readCookie } from '@/shared/lib/cookies';

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

export async function uploadEmployeeProfileImage(
  file: File,
): Promise<EmployeeProfileImageUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const headers = new Headers();
  const token = accessTokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const csrf = readCookie(apiConfig.csrfCookie);
  if (csrf) headers.set(apiConfig.csrfHeader, csrf);
  const url = `${apiConfig.baseUrl}${EMPLOYEE_ROUTES.employeeProfileImageUpload}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    throw new Error('Profile image upload failed.');
  }
  return (await response.json()) as EmployeeProfileImageUploadResponse;
}
