import type { ProjectStatus } from '../types';

export type ProjectTimelineIndicatorVariant =
  | 'upcoming'
  | 'ongoing'
  | 'overdue'
  | 'completed'
  | 'neutral';

export type ProjectTimelineIndicator = {
  readonly label: string;
  readonly variant: ProjectTimelineIndicatorVariant;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date as `YYYY-MM-DD` (matches date inputs and displayed dates). */
export function localDateOnlyIso(reference = new Date()): string {
  const y = reference.getFullYear();
  const m = reference.getMonth() + 1;
  const d = reference.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Inclusive calendar-day difference: `toIso` minus `fromIso` in whole days. */
export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const fromParts = fromIso.split('-').map(Number);
  const toParts = toIso.split('-').map(Number);
  const fromUtc = Date.UTC(fromParts[0] ?? 0, (fromParts[1] ?? 1) - 1, fromParts[2] ?? 1);
  const toUtc = Date.UTC(toParts[0] ?? 0, (toParts[1] ?? 1) - 1, toParts[2] ?? 1);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

function isValidDateOnly(value: string | undefined | null): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value);
}

export function getProjectTimelineIndicator(
  input: {
    readonly startDate: string;
    readonly expectedEndDate: string;
    readonly status: ProjectStatus;
  },
  todayIso: string = localDateOnlyIso(),
): ProjectTimelineIndicator | null {
  const { startDate, expectedEndDate, status } = input;

  if (status === 'COMPLETED') {
    return { label: 'Completed', variant: 'completed' };
  }

  if (status === 'CANCELLED') {
    return null;
  }

  if (!isValidDateOnly(startDate) || !isValidDateOnly(expectedEndDate)) {
    return null;
  }

  if (expectedEndDate < startDate) {
    return null;
  }

  if (todayIso < startDate) {
    const daysUntil = calendarDaysBetween(todayIso, startDate);
    if (daysUntil <= 0) {
      return { label: 'Starts today', variant: 'upcoming' };
    }
    if (daysUntil === 1) {
      return { label: 'Starts in 1 day', variant: 'upcoming' };
    }
    return { label: `Starts in ${daysUntil} days`, variant: 'upcoming' };
  }

  if (todayIso > expectedEndDate) {
    const overdueDays = calendarDaysBetween(expectedEndDate, todayIso);
    if (overdueDays <= 0) {
      return { label: 'Overdue', variant: 'overdue' };
    }
    if (overdueDays === 1) {
      return { label: '1 day overdue', variant: 'overdue' };
    }
    return { label: `${overdueDays} days overdue`, variant: 'overdue' };
  }

  if (todayIso === expectedEndDate) {
    return { label: 'Ends today', variant: 'ongoing' };
  }

  const projectDay = calendarDaysBetween(startDate, todayIso) + 1;
  if (projectDay <= 1) {
    return { label: 'Day 1 of project', variant: 'ongoing' };
  }
  return { label: `Day ${projectDay} of project`, variant: 'ongoing' };
}

export const projectTimelineIndicatorClass: Record<ProjectTimelineIndicatorVariant, string> = {
  upcoming: 'border-sky-200 bg-sky-50 text-sky-900',
  ongoing: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  overdue: 'border-red-200 bg-red-50 text-red-900',
  completed: 'border-slate-200 bg-slate-50 text-slate-700',
  neutral: 'border-border bg-muted text-muted-foreground',
};
