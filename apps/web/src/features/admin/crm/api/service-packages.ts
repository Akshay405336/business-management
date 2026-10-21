import { CRM_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type {
  CreateServicePackageRequest,
  CrmServicePackage,
  CrmServicePackageListResponse,
  ServicePackageCodePreviewResponse,
  UpdateServicePackageRequest,
} from '../types';

export function listServicePackages(signal?: AbortSignal): Promise<CrmServicePackageListResponse> {
  return apiRequest<CrmServicePackageListResponse>(CRM_ROUTES.servicePackages, { auth: true, signal });
}

export function getServicePackage(id: string, signal?: AbortSignal): Promise<CrmServicePackage> {
  return apiRequest<CrmServicePackage>(CRM_ROUTES.servicePackage(id), { auth: true, signal });
}

export function previewServicePackageCode(
  signal?: AbortSignal,
): Promise<ServicePackageCodePreviewResponse> {
  return apiRequest<ServicePackageCodePreviewResponse>(CRM_ROUTES.servicePackageCodePreview, {
    auth: true,
    signal,
  });
}

export function createServicePackage(body: CreateServicePackageRequest): Promise<CrmServicePackage> {
  return apiRequest<CrmServicePackage>(CRM_ROUTES.servicePackages, {
    method: 'POST',
    auth: true,
    body,
  });
}

export function updateServicePackage(
  id: string,
  body: UpdateServicePackageRequest,
): Promise<CrmServicePackage> {
  return apiRequest<CrmServicePackage>(CRM_ROUTES.servicePackage(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function changeServicePackageStatus(
  id: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<CrmServicePackage> {
  return apiRequest<CrmServicePackage>(CRM_ROUTES.servicePackageStatus(id), {
    method: 'PATCH',
    auth: true,
    body: { status },
  });
}

export function deleteServicePackage(id: string): Promise<void> {
  return apiRequest<void>(CRM_ROUTES.servicePackage(id), {
    method: 'DELETE',
    auth: true,
  });
}
