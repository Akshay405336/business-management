import type { OrgCalendarDayKind, OrgCalendarMonthDay } from '@techwin/contracts';
import { monthBounds } from '@/features/admin/attendance/utils/calendar-month';
import { ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES } from '../constants/org-calendar-mark-as';

export type OrgCalendarMonthSummary = {
  monthKey: string;
  monthLabel: string;
  totalCalendarDays: number;
  totalWorkingDays: number;
  totalHolidays: number;
  totalWeeklyOffs: number;
  totalNonWorkingDays: number;
  publicHolidays: number;
  companyHolidays: number;
};

function isHolidayKind(kind: OrgCalendarDayKind): boolean {
  return kind === 'HOLIDAY' || kind === 'OFFICE_CLOSURE';
}

function inMonthDays(days: readonly OrgCalendarMonthDay[], monthKey: string): OrgCalendarMonthDay[] {
  return days.filter((day) => day.date.startsWith(`${monthKey}-`));
}

function holidayCategory(day: OrgCalendarMonthDay): 'public' | 'company' | 'other' {
  const types = day.events
    .filter((e) => ORG_CALENDAR_CLASSIFICATION_EVENT_TYPES.includes(e.eventType))
    .map((e) => e.eventType);
  if (types.includes('PUBLIC_HOLIDAY') || types.includes('FESTIVAL_REGIONAL') || types.includes('OPTIONAL_HOLIDAY')) {
    return 'public';
  }
  if (types.includes('COMPANY_HOLIDAY') || types.includes('OFFICE_CLOSURE')) {
    return 'company';
  }
  return 'other';
}

export function computeOrgCalendarMonthSummary(input: {
  monthKey: string;
  days: readonly OrgCalendarMonthDay[];
}): OrgCalendarMonthSummary {
  const { monthKey, days } = input;
  const { year, monthIndex } = monthBounds(monthKey);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const totalCalendarDays = lastDay;

  const monthDays = inMonthDays(days, monthKey);

  let totalWorkingDays = 0;
  let totalHolidays = 0;
  let totalWeeklyOffs = 0;
  let totalNonWorkingDays = 0;
  let publicHolidays = 0;
  let companyHolidays = 0;

  for (const day of monthDays) {
    const kind = day.dayKind;
    if (kind === 'WORKING') {
      totalWorkingDays += 1;
    } else if (kind === 'SPECIAL_WORKING' || kind === 'HALF_DAY') {
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
    monthLabel,
    totalCalendarDays,
    totalWorkingDays,
    totalHolidays,
    totalWeeklyOffs,
    totalNonWorkingDays,
    publicHolidays,
    companyHolidays,
  };
}
