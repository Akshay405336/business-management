import type { OrgCalendarDayKind, OrgCalendarMonthDay } from '@techwin/contracts';
import { ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES } from '../policies/org-calendar-classification-events.policy.js';

export type OrgCalendarMonthSummary = {
  readonly monthKey: string;
  readonly totalCalendarDays: number;
  readonly totalWorkingDays: number;
  readonly totalHolidays: number;
  readonly totalWeeklyOffs: number;
  readonly totalNonWorkingDays: number;
  readonly publicHolidays: number;
  readonly companyHolidays: number;
};

function isHolidayKind(kind: OrgCalendarDayKind): boolean {
  return kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE';
}

function holidayCategory(day: OrgCalendarMonthDay): 'public' | 'company' | 'other' {
  const types = day.events
    .filter((e) => ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES.includes(e.eventType))
    .map((e) => e.eventType);
  if (
    types.includes('PUBLIC_HOLIDAY') ||
    types.includes('FESTIVAL_REGIONAL') ||
    types.includes('OPTIONAL_HOLIDAY')
  ) {
    return 'public';
  }
  if (types.includes('COMPANY_HOLIDAY') || types.includes('OFFICE_CLOSURE')) {
    return 'company';
  }
  return 'other';
}

function daysInCalendarMonth(monthKey: string): number {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function computeOrgCalendarMonthSummary(input: {
  monthKey: string;
  days: readonly OrgCalendarMonthDay[];
}): OrgCalendarMonthSummary {
  const { monthKey, days } = input;
  const totalCalendarDays = daysInCalendarMonth(monthKey);
  const monthDays = days.filter((day) => day.date.startsWith(`${monthKey}-`));

  let totalWorkingDays = 0;
  let totalHolidays = 0;
  let totalWeeklyOffs = 0;
  let totalNonWorkingDays = 0;
  let publicHolidays = 0;
  let companyHolidays = 0;

  for (const day of monthDays) {
    const kind = day.dayKind;
    if (kind === 'WORKING' || kind === 'SPECIAL_WORKING' || kind === 'HALF_DAY') {
      totalWorkingDays += 1;
    } else if (kind === 'WEEKLY_OFF') {
      totalWeeklyOffs += 1;
    } else if (kind === 'NON_WORKING') {
      totalNonWorkingDays += 1;
    } else if (isHolidayKind(kind)) {
      totalHolidays += 1;
      const category = holidayCategory(day);
      if (category === 'public') publicHolidays += 1;
      else if (category === 'company') companyHolidays += 1;
      else publicHolidays += 1;
    }
  }

  return {
    monthKey,
    totalCalendarDays,
    totalWorkingDays,
    totalHolidays,
    totalWeeklyOffs,
    totalNonWorkingDays,
    publicHolidays,
    companyHolidays,
  };
}
