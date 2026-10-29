import { PROJECT_TASK_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type {
  CreateProjectTaskRequest,
  MoveProjectTaskRequest,
  ProjectListQuery,
  ReorderProjectPhasesRequest,
  UpdateProjectTaskRequest,
} from '@techwin/validation';
import type {
  ProjectTask,
  ProjectTaskBoardResponse,
  ProjectTaskSummaryListResponse,
} from '../types';

export function listProjectTaskSummaries(
  query: Partial<ProjectListQuery> = {},
  signal?: AbortSignal,
): Promise<ProjectTaskSummaryListResponse> {
  return apiRequest<ProjectTaskSummaryListResponse>(
    `${PROJECT_TASK_ROUTES.projectSummaries}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function getProjectTaskBoard(
  projectId: string,
  options?: { planBaseline?: boolean; signal?: AbortSignal },
): Promise<ProjectTaskBoardResponse> {
  const query =
    options?.planBaseline === true ? buildQueryString({ planBaseline: '1' }) : '';
  return apiRequest<ProjectTaskBoardResponse>(
    `${PROJECT_TASK_ROUTES.board(projectId)}${query}`,
    {
      auth: true,
      signal: options?.signal,
    },
  );
}

export function reorderProjectPhases(
  projectId: string,
  body: ReorderProjectPhasesRequest,
): Promise<ProjectTaskBoardResponse> {
  return apiRequest<ProjectTaskBoardResponse>(PROJECT_TASK_ROUTES.reorderPhases(projectId), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function createProjectTask(
  projectId: string,
  body: CreateProjectTaskRequest,
): Promise<ProjectTask> {
  return apiRequest<ProjectTask>(PROJECT_TASK_ROUTES.tasks(projectId), {
    method: 'POST',
    auth: true,
    body,
  });
}

export function updateProjectTask(
  projectId: string,
  taskId: string,
  body: UpdateProjectTaskRequest,
): Promise<ProjectTask> {
  return apiRequest<ProjectTask>(PROJECT_TASK_ROUTES.task(projectId, taskId), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function moveProjectTask(
  projectId: string,
  taskId: string,
  body: MoveProjectTaskRequest,
): Promise<ProjectTask> {
  return apiRequest<ProjectTask>(PROJECT_TASK_ROUTES.moveTask(projectId, taskId), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteProjectTask(projectId: string, taskId: string): Promise<void> {
  return apiRequest<void>(PROJECT_TASK_ROUTES.task(projectId, taskId), {
    method: 'DELETE',
    auth: true,
  });
}
