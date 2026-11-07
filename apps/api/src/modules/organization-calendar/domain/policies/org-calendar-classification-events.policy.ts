import type { OrgCalendarEventType } from '@techwin/contracts';
import type { ScheduleDayFlags } from '../services/org-calendar-classification.service.js';
import type { OrgCalendarEventWriteInput } from '../types/org-calendar.types.js';

export const ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES: readonly OrgCalendarEventType[] = [
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'WEEKLY_OFF',
  'SPECIAL_WORKING_DAY',
  'HALF_WORKING_DAY',
  'OFFICE_CLOSURE',
  'OPTIONAL_HOLIDAY',
];

export function scheduleRequiresWorkingDayOverride(schedule: ScheduleDayFlags): boolean {
  return schedule.scheduleWeeklyOff || schedule.scheduleNonWorking;
}

export function buildScheduleWorkingDayOverride(dateKey: string): OrgCalendarEventWriteInput {
  return {
    title: 'Working day',
    description: '',
    eventType: 'SPECIAL_WORKING_DAY',
    startDate: dateKey,
    endDate: dateKey,
    isFullDay: true,
    startTimeMinutes: null,
    endTimeMinutes: null,
    color: '#64748b',
    isActive: true,
    appliesToAllEmployees: true,
    employeeIds: [],
    recurrence: 'NONE',
  };
}
