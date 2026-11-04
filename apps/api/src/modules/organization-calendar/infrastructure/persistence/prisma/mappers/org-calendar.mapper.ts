import type { OrganizationCalendarEvent } from '../../../../../../generated/prisma/client.js';
import type { OrgCalendarEventItem, OrgCalendarEventType } from '@techwin/contracts';

const DEFAULT_COLORS: Record<OrgCalendarEventType, string> = {
  PUBLIC_HOLIDAY: '#dc2626',
  COMPANY_HOLIDAY: '#dc2626',
  FESTIVAL_REGIONAL: '#e11d48',
  WEEKLY_OFF: '#64748b',
  SPECIAL_WORKING_DAY: '#ea580c',
  HALF_WORKING_DAY: '#9333ea',
  OFFICE_CLOSURE: '#b91c1c',
  COMPANY_EVENT: '#2563eb',
  OPTIONAL_HOLIDAY: '#f59e0b',
  CUSTOM: '#0d9488',
};

function readEmployeeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function defaultColorForType(type: OrgCalendarEventType): string {
  return DEFAULT_COLORS[type] ?? '#64748b';
}

export function toOrgCalendarEventItem(row: OrganizationCalendarEvent): OrgCalendarEventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eventType: row.eventType as OrgCalendarEventItem['eventType'],
    startDate: formatDateOnly(row.startDate),
    endDate: formatDateOnly(row.endDate),
    isFullDay: row.isFullDay,
    startTimeMinutes: row.startTimeMinutes,
    endTimeMinutes: row.endTimeMinutes,
    color: row.color || defaultColorForType(row.eventType as OrgCalendarEventType),
    isActive: row.isActive,
    appliesToAllEmployees: row.appliesToAllEmployees,
    employeeIds: readEmployeeIds(row.employeeIds),
    recurrence: row.recurrence as OrgCalendarEventItem['recurrence'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Noon UTC anchor so org-timezone weekday matches the calendar date key. */
export function calendarDateAnchor(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function dateKeyFromUtcParts(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** Full 6×7 board range (42 days) for month grids, Monday-first, UTC date keys. */
export function monthBoardDateRange(year: number, month: number): { from: string; to: string } {
  const monthIndex = month - 1;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const startPad = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: string[] = [];

  const prevMonthEnd = new Date(Date.UTC(year, monthIndex, 0));
  const prevYear = prevMonthEnd.getUTCFullYear();
  const prevMonthIndex = prevMonthEnd.getUTCMonth();
  const prevMonthDays = prevMonthEnd.getUTCDate();

  for (let i = startPad - 1; i >= 0; i -= 1) {
    cells.push(dateKeyFromUtcParts(prevYear, prevMonthIndex, prevMonthDays - i));
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(dateKeyFromUtcParts(year, monthIndex, day));
  }

  let nextDay = 1;
  let nextMonthIndex = monthIndex + 1;
  let nextYear = year;
  if (nextMonthIndex > 11) {
    nextMonthIndex = 0;
    nextYear += 1;
  }

  while (cells.length < 42) {
    const daysInNext = new Date(Date.UTC(nextYear, nextMonthIndex + 1, 0)).getUTCDate();
    cells.push(dateKeyFromUtcParts(nextYear, nextMonthIndex, nextDay));
    nextDay += 1;
    if (nextDay > daysInNext) {
      nextDay = 1;
      nextMonthIndex += 1;
      if (nextMonthIndex > 11) {
        nextMonthIndex = 0;
        nextYear += 1;
      }
    }
  }

  return { from: cells[0]!, to: cells[cells.length - 1]! };
}

export function monthDateRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function expandAnnualOccurrences(
  items: readonly OrgCalendarEventItem[],
  from: string,
  to: string,
): OrgCalendarEventItem[] {
  const fromYear = Number(from.slice(0, 4));
  const toYear = Number(to.slice(0, 4));
  const expanded: OrgCalendarEventItem[] = [...items];
  for (const item of items) {
    if (item.recurrence !== 'ANNUAL') continue;
    const startMd = item.startDate.slice(5);
    const endMd = item.endDate.slice(5);
    const spanYears = item.startDate.slice(0, 4) !== item.endDate.slice(0, 4);
    for (let y = fromYear; y <= toYear; y += 1) {
      const occStart = `${y}-${startMd}`;
      let occEnd = spanYears ? `${y + 1}-${endMd}` : `${y}-${endMd}`;
      if (occEnd < occStart) occEnd = occStart;
      if (occEnd < from || occStart > to) continue;
      if (occStart === item.startDate && occEnd === item.endDate) continue;
      expanded.push({
        ...item,
        startDate: occStart,
        endDate: occEnd,
      });
    }
  }
  return expanded;
}
