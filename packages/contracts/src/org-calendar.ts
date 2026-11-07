import { API_PREFIX } from './http.js';

export const ORG_CALENDAR_ROUTES = {
  events: `${API_PREFIX}/organization-calendar/events`,
  event: (id: string) => `${API_PREFIX}/organization-calendar/events/${id}`,
  month: `${API_PREFIX}/organization-calendar/month`,
  holidays: `${API_PREFIX}/organization-calendar/holidays`,
  holidaysDuplicate: `${API_PREFIX}/organization-calendar/holidays/duplicate`,
  export: `${API_PREFIX}/organization-calendar/export`,
  classify: `${API_PREFIX}/organization-calendar/classify`,
  employeeMonth: `${API_PREFIX}/organization-calendar/employee/month`,
  replaceDateClassification: `${API_PREFIX}/organization-calendar/dates/classification`,
} as const;

export type OrgCalendarEventType =
  | 'PUBLIC_HOLIDAY'
  | 'COMPANY_HOLIDAY'
  | 'FESTIVAL_REGIONAL'
  | 'WEEKLY_OFF'
  | 'SPECIAL_WORKING_DAY'
  | 'HALF_WORKING_DAY'
  | 'OFFICE_CLOSURE'
  | 'COMPANY_EVENT'
  | 'OPTIONAL_HOLIDAY'
  | 'CUSTOM';

export type OrgCalendarRecurrence = 'NONE' | 'ANNUAL';

export type OrgCalendarDayKind =
  | 'WORKING'
  | 'WEEKLY_OFF'
  | 'NON_WORKING'
  | 'HOLIDAY'
  | 'HALF_DAY'
  | 'SPECIAL_WORKING'
  | 'OFFICE_CLOSURE';

export interface OrgCalendarEventItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly eventType: OrgCalendarEventType;
  readonly startDate: string;
  readonly endDate: string;
  readonly isFullDay: boolean;
  readonly startTimeMinutes: number | null;
  readonly endTimeMinutes: number | null;
  readonly color: string;
  readonly isActive: boolean;
  readonly appliesToAllEmployees: boolean;
  readonly employeeIds: readonly string[];
  readonly recurrence: OrgCalendarRecurrence;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrgCalendarMonthDay {
  readonly date: string;
  readonly dayKind: OrgCalendarDayKind;
  readonly events: readonly OrgCalendarEventItem[];
}

export interface OrgCalendarMonthResponse {
  readonly from: string;
  readonly to: string;
  readonly days: readonly OrgCalendarMonthDay[];
}

export interface OrgCalendarEventListResponse {
  readonly items: readonly OrgCalendarEventItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
