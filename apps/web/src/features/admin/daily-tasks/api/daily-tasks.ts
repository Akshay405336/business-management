import { DAILY_TASK_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type {
  CreateDailyTaskRequest,
  DailyTaskBoardQuery,
  DailyTaskListQuery,
  MoveDailyTaskStageRequest,
  MyDailyTasksQuery,
  RescheduleDailyTaskRequest,
  UpdateDailyTaskRequest,
  UpdateDailyTaskWorkflowStagesRequest,
} from '@techwin/validation';
import type {
  DailyTaskBoardResponse,
  DailyTaskDetail,
  DailyTaskListResponse,
  DailyTaskWorkflowStagesResponse,
} from '../types';

export function fetchDailyTaskBoard(
  query: DailyTaskBoardQuery & { clientToday?: string },
  signal?: AbortSignal,
): Promise<DailyTaskBoardResponse> {
  return apiRequest<DailyTaskBoardResponse>(
    `${DAILY_TASK_ROUTES.board}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function listDailyTasks(
  query: Partial<DailyTaskListQuery> & { clientToday?: string },
  signal?: AbortSignal,
): Promise<DailyTaskListResponse> {
  return apiRequest<DailyTaskListResponse>(
    `${DAILY_TASK_ROUTES.tasks}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function listMyDailyTasks(
  query: Partial<MyDailyTasksQuery> & { clientToday?: string },
  signal?: AbortSignal,
): Promise<DailyTaskListResponse> {
  return apiRequest<DailyTaskListResponse>(
    `${DAILY_TASK_ROUTES.myTasks}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function fetchDailyTaskWorkflowStages(signal?: AbortSignal): Promise<DailyTaskWorkflowStagesResponse> {
  return apiRequest<DailyTaskWorkflowStagesResponse>(DAILY_TASK_ROUTES.workflowStages, {
    auth: true,
    signal,
  });
}

export function createDailyTask(body: CreateDailyTaskRequest): Promise<DailyTaskDetail> {
  return apiRequest<DailyTaskDetail>(DAILY_TASK_ROUTES.tasks, {
    method: 'POST',
    auth: true,
    body,
  });
}

export function updateDailyTask(id: string, body: UpdateDailyTaskRequest): Promise<DailyTaskDetail> {
  return apiRequest<DailyTaskDetail>(DAILY_TASK_ROUTES.task(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function moveDailyTaskStage(id: string, body: MoveDailyTaskStageRequest): Promise<DailyTaskDetail> {
  return apiRequest<DailyTaskDetail>(DAILY_TASK_ROUTES.moveStage(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function rescheduleDailyTask(id: string, body: RescheduleDailyTaskRequest): Promise<DailyTaskDetail> {
  return apiRequest<DailyTaskDetail>(DAILY_TASK_ROUTES.reschedule(id), {
    method: 'PATCH',
    auth: true,
    body,
  });
}

export function deleteDailyTask(id: string): Promise<void> {
  return apiRequest<void>(DAILY_TASK_ROUTES.task(id), { method: 'DELETE', auth: true });
}

export function fetchDailyTask(id: string, signal?: AbortSignal): Promise<DailyTaskDetail> {
  return apiRequest<DailyTaskDetail>(DAILY_TASK_ROUTES.task(id), { auth: true, signal });
}

export function updateDailyTaskWorkflowStages(
  body: UpdateDailyTaskWorkflowStagesRequest,
): Promise<DailyTaskWorkflowStagesResponse> {
  return apiRequest<DailyTaskWorkflowStagesResponse>(DAILY_TASK_ROUTES.workflowStages, {
    method: 'PATCH',
    auth: true,
    body,
  });
}
