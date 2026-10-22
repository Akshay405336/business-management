import {
  calendarDaysBetween,
  localDateOnlyIso,
} from '@/features/admin/project-tasks/utils/project-timeline-indicator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export type GanttZoom = 'day' | 'week' | 'month';

export function isValidDateOnly(value: string | undefined | null): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

export function addCalendarDays(iso: string, days: number): string {
  const parts = iso.split('-').map(Number);
  const utc = Date.UTC(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const next = new Date(utc + days * 86_400_000);
  return localDateOnlyIso(next);
}

export function defaultDaySpan(zoom: GanttZoom): number {
  if (zoom === 'day') return 28;
  if (zoom === 'week') return 84;
  return 180;
}

export function pxPerDayForZoom(zoom: GanttZoom): number {
  if (zoom === 'day') return 28;
  if (zoom === 'week') return 12;
  return 4;
}

export function navigationStepDays(zoom: GanttZoom, daySpan: number): number {
  if (zoom === 'day') return Math.max(7, Math.floor(daySpan / 2));
  if (zoom === 'week') return Math.max(28, Math.floor(daySpan / 2));
  return Math.max(60, Math.floor(daySpan / 2));
}

export type GanttBarPlacement = {
  leftPx: number;
  widthPx: number;
};

/** Inclusive calendar-day bar placement on the timeline. */
export function placementForRange(
  rangeStartIso: string,
  startIso: string,
  endIso: string,
  pxPerDay: number,
): GanttBarPlacement | null {
  if (!isValidDateOnly(startIso) || !isValidDateOnly(endIso)) return null;
  const startOffset = calendarDaysBetween(rangeStartIso, startIso);
  const endOffset = calendarDaysBetween(rangeStartIso, endIso);
  if (endOffset < 0 || startOffset > endOffset) return null;
  const visibleStart = Math.max(0, startOffset);
  const visibleEnd = Math.max(visibleStart, endOffset);
  const inclusiveDays = visibleEnd - visibleStart + 1;
  return {
    leftPx: visibleStart * pxPerDay,
    widthPx: Math.max(pxPerDay * 0.65, inclusiveDays * pxPerDay),
  };
}

export type GanttTimelineTick = {
  iso: string;
  label: string;
  major: boolean;
};

export function buildTimelineTicks(
  rangeStartIso: string,
  daySpan: number,
  zoom: GanttZoom,
): GanttTimelineTick[] {
  const ticks: GanttTimelineTick[] = [];
  const rangeEndIso = addCalendarDays(rangeStartIso, daySpan - 1);

  if (zoom === 'day') {
    for (let offset = 0; offset < daySpan; offset += 1) {
      const iso = addCalendarDays(rangeStartIso, offset);
      const parts = iso.split('-').map(Number);
      const major = parts[2] === 1 || offset === 0;
      ticks.push({
        iso,
        label: major
          ? new Date(parts[0]!, parts[1]! - 1, parts[2]).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
          : String(parts[2]),
        major,
      });
    }
    return ticks;
  }

  if (zoom === 'week') {
    let cursor = rangeStartIso;
    while (calendarDaysBetween(cursor, rangeEndIso) >= 0) {
      const parts = cursor.split('-').map(Number);
      ticks.push({
        iso: cursor,
        label: new Date(parts[0]!, parts[1]! - 1, parts[2]).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        major: true,
      });
      cursor = addCalendarDays(cursor, 7);
    }
    return ticks;
  }

  let cursor = rangeStartIso.slice(0, 8) + '01';
  if (calendarDaysBetween(cursor, rangeStartIso) < 0) {
    const parts = cursor.split('-').map(Number);
    const monthIndex = (parts[1] ?? 1) - 1;
    const nextMonth = new Date(Date.UTC(parts[0] ?? 0, monthIndex + 1, 1));
    cursor = localDateOnlyIso(nextMonth);
  }
  while (calendarDaysBetween(cursor, rangeEndIso) <= daySpan + 31) {
    if (calendarDaysBetween(cursor, rangeEndIso) >= 0 || calendarDaysBetween(rangeStartIso, cursor) >= 0) {
      const parts = cursor.split('-').map(Number);
      ticks.push({
        iso: cursor,
        label: new Date(parts[0]!, (parts[1] ?? 1) - 1, 1).toLocaleDateString(undefined, {
          month: 'short',
          year: '2-digit',
        }),
        major: true,
      });
    }
    const parts = cursor.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(parts[0] ?? 0, (parts[1] ?? 1), 1));
    cursor = localDateOnlyIso(nextMonth);
    if (ticks.length > 24) break;
  }
  return ticks;
}

export function collectTimelineBounds(
  projects: readonly {
    startDate: string;
    expectedEndDate: string;
    phases?: readonly { startDate: string; expectedEndDate: string }[];
  }[],
): { min: string; max: string } | null {
  let min: string | null = null;
  let max: string | null = null;
  const consider = (start: string, end: string) => {
    if (!isValidDateOnly(start) || !isValidDateOnly(end)) return;
    if (!min || start < min) min = start;
    if (!max || end > max) max = end;
  };
  for (const project of projects) {
    consider(project.startDate, project.expectedEndDate);
    for (const phase of project.phases ?? []) {
      consider(phase.startDate, phase.expectedEndDate);
    }
  }
  if (!min || !max) return null;
  return { min, max };
}

export function todayOffsetPx(rangeStartIso: string, pxPerDay: number, daySpan: number): number | null {
  const today = localDateOnlyIso();
  const offset = calendarDaysBetween(rangeStartIso, today);
  if (offset < 0 || offset >= daySpan) return null;
  return offset * pxPerDay + pxPerDay / 2;
}
