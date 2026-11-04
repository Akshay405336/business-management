import type {
  OrgCalendarEventListResponse,
  OrgCalendarMonthDay,
  OrgCalendarMonthResponse,
  OrgCalendarEventItem,
} from '@techwin/contracts';
import type {
  OrgCalendarEventWriteInput,
  OrgCalendarHolidaysQuery,
  OrgCalendarListQuery,
  OrgCalendarMonthQuery,
} from '../types/org-calendar.types.js';
import type { ScheduleDayFlags } from '../services/org-calendar-classification.service.js';

export const ORG_CALENDAR_REPOSITORY = Symbol('ORG_CALENDAR_REPOSITORY');

export interface OrgCalendarRepository {
  listEvents(
    organizationId: string,
    query: OrgCalendarListQuery,
  ): Promise<OrgCalendarEventListResponse>;

  getMonth(organizationId: string, query: OrgCalendarMonthQuery): Promise<OrgCalendarMonthResponse>;

  getEmployeeMonth(
    organizationId: string,
    employeeId: string,
    query: OrgCalendarMonthQuery,
  ): Promise<OrgCalendarMonthResponse>;

  getEvent(organizationId: string, eventId: string): Promise<OrgCalendarEventItem>;

  createEvent(
    organizationId: string,
    adminId: string,
    input: OrgCalendarEventWriteInput,
  ): Promise<OrgCalendarEventItem>;

  updateEvent(
    organizationId: string,
    eventId: string,
    adminId: string,
    input: OrgCalendarEventWriteInput,
  ): Promise<OrgCalendarEventItem>;

  deleteEvent(organizationId: string, eventId: string): Promise<void>;

  listHolidays(
    organizationId: string,
    query: OrgCalendarHolidaysQuery,
  ): Promise<OrgCalendarEventListResponse>;

  duplicateHolidaysToYear(
    organizationId: string,
    adminId: string,
    sourceYear: number,
    targetYear: number,
    eventTypes?: readonly OrgCalendarEventItem['eventType'][],
  ): Promise<{ created: number }>;

  exportEvents(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<readonly OrgCalendarEventItem[]>;

  resolveAttendanceDayKind(
    organizationId: string,
    attendanceDate: string,
    schedule: ScheduleDayFlags,
    employeeId?: string,
  ): Promise<'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY'>;

  classifyDateForOrganization(
    organizationId: string,
    attendanceDate: string,
    employeeId?: string,
  ): Promise<'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY'>;

  getDaysInRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<readonly OrgCalendarMonthDay[]>;
}
