import { TASK_CALENDAR_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import type { TaskCalendarFiltersResponse, TaskCalendarResponse } from '@techwin/contracts';
import type { TaskCalendarRequestQuery } from '../types/task-calendar.types';

export function fetchTaskCalendar(
  query: TaskCalendarRequestQuery,
  signal?: AbortSignal,
): Promise<TaskCalendarResponse> {
  const qs = buildQueryString(query);
  return apiRequest<TaskCalendarResponse>(`${TASK_CALENDAR_ROUTES.tasks}${qs}`, {
    auth: true,
    signal,
  });
}

export function fetchTaskCalendarFilters(signal?: AbortSignal): Promise<TaskCalendarFiltersResponse> {
  return apiRequest<TaskCalendarFiltersResponse>(TASK_CALENDAR_ROUTES.filters, { auth: true, signal });
}
