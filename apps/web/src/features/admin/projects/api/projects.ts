import { PROJECT_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type {
  ChangeProjectStatusRequest,
  ClientQuotationListResponse,
  CreateProjectRequest,
  ProjectDetail,
  ProjectListQuery,
  ProjectListResponse,
  ProjectNumberPreviewResponse,
  UpdateProjectRequest,
} from '../types';

type ProjectManagersResponse = {
  readonly managers: readonly { id: string; displayName: string; email: string }[];
};

export function listProjects(
  query: Partial<ProjectListQuery> = {},
  signal?: AbortSignal,
): Promise<ProjectListResponse> {
  return apiRequest<ProjectListResponse>(`${PROJECT_ROUTES.projects}${buildQueryString(query)}`, {
    auth: true,
    signal,
  });
}

export function previewProjectNumber(signal?: AbortSignal): Promise<ProjectNumberPreviewResponse> {
  return apiRequest<ProjectNumberPreviewResponse>(PROJECT_ROUTES.projectNumberPreview, {
    auth: true,
    signal,
  });
}

export function listProjectManagers(signal?: AbortSignal): Promise<ProjectManagersResponse> {
  return apiRequest<ProjectManagersResponse>(PROJECT_ROUTES.projectManagers, { auth: true, signal });
}

export function listClientQuotations(
  clientId: string,
  signal?: AbortSignal,
): Promise<ClientQuotationListResponse> {
  return apiRequest<ClientQuotationListResponse>(PROJECT_ROUTES.clientQuotations(clientId), {
    auth: true,
    signal,
  });
}

export function getProject(id: string, signal?: AbortSignal): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>(PROJECT_ROUTES.project(id), { auth: true, signal });
}

export function createProject(body: CreateProjectRequest): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>(PROJECT_ROUTES.projects, { method: 'POST', auth: true, body });
}

export function updateProject(id: string, body: UpdateProjectRequest): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>(PROJECT_ROUTES.project(id), { method: 'PATCH', auth: true, body });
}

export function changeProjectStatus(
  id: string,
  body: ChangeProjectStatusRequest,
): Promise<ProjectDetail> {
  return apiRequest<ProjectDetail>(PROJECT_ROUTES.projectStatus(id), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function deleteProject(id: string): Promise<void> {
  return apiRequest<void>(PROJECT_ROUTES.project(id), { method: 'DELETE', auth: true });
}
