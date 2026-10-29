import type { ProjectExecutionLifecycle } from '@techwin/contracts';
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

export type ProjectCardTimelineTone = 'upcoming' | 'on-track' | 'delayed';

export type ProjectCardTimelineIndicator = {
  readonly label: string;
  readonly tone: ProjectCardTimelineTone;
};

function dateOnlyFromTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  return DATE_ONLY.test(day) ? day : null;
}

/** Minimal text-only timeline copy for project management grid cards. */
export function getProjectCardTimelineIndicator(
  input: {
    readonly executionLifecycle: ProjectExecutionLifecycle;
    readonly startDate: string;
    readonly actualProductionStartedAt: string | null;
    readonly actualCompletedAt: string | null;
  },
  todayIso: string = localDateOnlyIso(),
): ProjectCardTimelineIndicator | null {
  const expectedStart = input.startDate.slice(0, 10);
  if (!isValidDateOnly(expectedStart)) return null;

  const productionStart = dateOnlyFromTimestamp(input.actualProductionStartedAt);
  const completedAt = dateOnlyFromTimestamp(input.actualCompletedAt);
  const productionStarted =
    productionStart !== null &&
    (input.executionLifecycle === 'IN_PRODUCTION' || input.executionLifecycle === 'COMPLETED');

  if (input.executionLifecycle === 'COMPLETED' && productionStarted && completedAt) {
    const days = calendarDaysBetween(productionStart, completedAt) + 1;
    if (days < 1) return null;
    return {
      label: days === 1 ? 'Completed in 1 day' : `Completed in ${days} days`,
      tone: 'on-track',
    };
  }

  if (input.executionLifecycle === 'IN_PRODUCTION' && productionStarted) {
    const projectDay = calendarDaysBetween(productionStart, todayIso) + 1;
    if (projectDay < 1) return null;
    return {
      label: projectDay <= 1 ? 'Day 1 of project' : `Day ${projectDay} of project`,
      tone: 'on-track',
    };
  }

  if (input.executionLifecycle !== 'NOT_PLANNED' && input.executionLifecycle !== 'PLANNED') {
    return null;
  }

  if (todayIso < expectedStart) {
    const daysUntil = calendarDaysBetween(todayIso, expectedStart);
    if (daysUntil <= 0) {
      return { label: 'Starts today', tone: 'upcoming' };
    }
    if (daysUntil === 1) {
      return { label: 'Starts in 1 day', tone: 'upcoming' };
    }
    return { label: `Starts in ${daysUntil} days`, tone: 'upcoming' };
  }

  if (todayIso === expectedStart) {
    return { label: 'Starts today', tone: 'upcoming' };
  }

  const daysPassed = calendarDaysBetween(expectedStart, todayIso);
  if (daysPassed <= 0) {
    return { label: 'Starts today', tone: 'upcoming' };
  }
  if (daysPassed === 1) {
    return { label: 'Delayed by 1 day', tone: 'delayed' };
  }
  return { label: `Delayed by ${daysPassed} days`, tone: 'delayed' };
}

export const projectCardTimelineToneClass: Record<ProjectCardTimelineTone, string> = {
  upcoming: 'text-green-600 dark:text-green-500',
  'on-track': 'text-green-600 dark:text-green-500',
  delayed: 'text-red-600 dark:text-red-400',
};

export type ProjectDaysLeftTone = 'neutral' | 'soon' | 'overdue';

/** Days from today until expected end (for date row on cards). */
/** Countdown to expected start before start day; until expected end once started. */
export function getProjectRemainingTimeLabel(
  startDate: string,
  expectedEndDate: string,
  todayIso: string = localDateOnlyIso(),
): { readonly label: string; readonly tone: ProjectDaysLeftTone } | null {
  const start = startDate.slice(0, 10);
  if (!isValidDateOnly(start)) return null;

  if (todayIso < start) {
    const untilStart = calendarDaysBetween(todayIso, start);
    if (untilStart <= 0) {
      return { label: 'Starts today', tone: 'soon' };
    }
    if (untilStart === 1) {
      return { label: '1 day left', tone: 'soon' };
    }
    if (untilStart <= 7) {
      return { label: `${untilStart} days left`, tone: 'soon' };
    }
    return { label: `${untilStart} days left`, tone: 'neutral' };
  }

  return getProjectDaysLeftUntilEnd(expectedEndDate, todayIso);
}

export function getProjectDaysLeftUntilEnd(
  expectedEndDate: string,
  todayIso: string = localDateOnlyIso(),
): { readonly label: string; readonly tone: ProjectDaysLeftTone } | null {
  const end = expectedEndDate.slice(0, 10);
  if (!isValidDateOnly(end)) return null;

  if (todayIso > end) {
    const overdue = calendarDaysBetween(end, todayIso);
    if (overdue <= 0) {
      return { label: 'Ended today', tone: 'overdue' };
    }
    if (overdue === 1) {
      return { label: '1 day overdue', tone: 'overdue' };
    }
    return { label: `${overdue} days overdue`, tone: 'overdue' };
  }

  const left = calendarDaysBetween(todayIso, end);
  if (left <= 0) {
    return { label: 'Ends today', tone: 'soon' };
  }
  if (left === 1) {
    return { label: '1 day left', tone: 'soon' };
  }
  if (left <= 7) {
    return { label: `${left} days left`, tone: 'soon' };
  }
  return { label: `${left} days left`, tone: 'neutral' };
}

export const projectDaysLeftToneClass: Record<ProjectDaysLeftTone, string> = {
  neutral: 'text-green-800 dark:text-green-600',
  soon: 'text-green-800 dark:text-green-600',
  overdue: 'text-red-600 dark:text-red-400',
};
