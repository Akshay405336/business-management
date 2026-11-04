import {
  ORG_CALENDAR_ROUTES,
  type OrgCalendarEventItem,
  type OrgCalendarEventListResponse,
  type OrgCalendarMonthResponse,
} from '@techwin/contracts';
import type {
  CreateOrgCalendarEventRequest,
  DuplicateOrgCalendarHolidaysRequest,
  UpdateOrgCalendarEventRequest,
} from '@techwin/validation';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import { notifyOrgCalendarChanged } from '../lib/org-calendar-sync';

export function fetchEmployeeOrgCalendarMonth(
  query: { year: number; month: number },
  signal?: AbortSignal,
): Promise<OrgCalendarMonthResponse> {
  return apiRequest<OrgCalendarMonthResponse>(
    `${ORG_CALENDAR_ROUTES.employeeMonth}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function fetchOrgCalendarMonth(
  query: { year: number; month: number; eventTypes?: string; search?: string },
  signal?: AbortSignal,
): Promise<OrgCalendarMonthResponse> {
  return apiRequest<OrgCalendarMonthResponse>(
    `${ORG_CALENDAR_ROUTES.month}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function fetchOrgCalendarEvents(
  query: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<OrgCalendarEventListResponse> {
  return apiRequest<OrgCalendarEventListResponse>(
    `${ORG_CALENDAR_ROUTES.events}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function fetchOrgCalendarHolidays(
  query: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<OrgCalendarEventListResponse> {
  return apiRequest<OrgCalendarEventListResponse>(
    `${ORG_CALENDAR_ROUTES.holidays}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export async function createOrgCalendarEvent(
  body: CreateOrgCalendarEventRequest,
): Promise<OrgCalendarEventItem> {
  const item = await apiRequest<OrgCalendarEventItem>(ORG_CALENDAR_ROUTES.events, {
    auth: true,
    method: 'POST',
    body,
  });
  notifyOrgCalendarChanged();
  return item;
}

export async function updateOrgCalendarEvent(
  id: string,
  body: UpdateOrgCalendarEventRequest,
): Promise<OrgCalendarEventItem> {
  const item = await apiRequest<OrgCalendarEventItem>(ORG_CALENDAR_ROUTES.event(id), {
    auth: true,
    method: 'PATCH',
    body,
  });
  notifyOrgCalendarChanged();
  return item;
}

export async function deleteOrgCalendarEvent(id: string): Promise<void> {
  await apiRequest<void>(ORG_CALENDAR_ROUTES.event(id), { auth: true, method: 'DELETE' });
  notifyOrgCalendarChanged();
}

export async function duplicateOrgCalendarHolidays(
  body: DuplicateOrgCalendarHolidaysRequest,
): Promise<{ created: number }> {
  const result = await apiRequest<{ created: number }>(ORG_CALENDAR_ROUTES.holidaysDuplicate, {
    auth: true,
    method: 'POST',
    body,
  });
  notifyOrgCalendarChanged();
  return result;
}

export function classifyOrgCalendarDate(
  date: string,
  signal?: AbortSignal,
): Promise<{ date: string; dayKind: 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY' }> {
  return apiRequest(`${ORG_CALENDAR_ROUTES.classify}${buildQueryString({ date })}`, {
    auth: true,
    signal,
  });
}

export function exportOrgCalendar(from: string, to: string): Promise<readonly OrgCalendarEventItem[]> {
  return apiRequest<readonly OrgCalendarEventItem[]>(
    `${ORG_CALENDAR_ROUTES.export}${buildQueryString({ from, to })}`,
    { auth: true },
  );
}
