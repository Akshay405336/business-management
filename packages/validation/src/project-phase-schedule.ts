/** Default span from phase start to suggested expected end (calendar days). Example: start Oct 26 → end Oct 29. */
export const DEFAULT_SUGGESTED_PHASE_DURATION_DAYS = 3;

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDateOnly(value: string): boolean {
  return ISO_DATE_ONLY.test(value);
}

/** Add calendar days using UTC date parts (avoids local DST shifts). */
export function addCalendarDays(isoDate: string, days: number): string {
  if (!isIsoDateOnly(isoDate)) return '';
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export type ProjectPhaseScheduleDates = {
  readonly startDate: string;
  readonly expectedEndDate: string;
};

export type ProjectPhaseScheduleContext = {
  readonly projectStartDate?: string;
  readonly projectExpectedEndDate?: string;
};

export const PROJECT_PHASE_SCHEDULE_MESSAGES = {
  phaseStartBeforeProject: 'Start date must be on or after the project start date.',
  phaseEndAfterProject: 'Expected end date must be on or before the project end date.',
  phaseStartAfterProjectEnd: 'Start date must be on or before the project end date.',
  phaseOverlap:
    "Start date must be after the previous phase's expected end date (phases cannot overlap).",
  phaseEndBeforeStart: 'Expected end date must be on or after the start date.',
} as const;

export type ProjectPhaseScheduleIssue = {
  readonly index: number;
  readonly field: 'startDate' | 'expectedEndDate';
  readonly message: string;
};

export function suggestPhaseStartDate(
  index: number,
  phases: readonly ProjectPhaseScheduleDates[],
  projectStartDate?: string,
): string {
  if (index === 0) {
    return projectStartDate && isIsoDateOnly(projectStartDate) ? projectStartDate : '';
  }
  const previous = phases[index - 1];
  if (!previous) return '';
  const previousEnd = previous.expectedEndDate;
  if (!isIsoDateOnly(previousEnd)) return '';
  return addCalendarDays(previousEnd, 1);
}

export function suggestPhaseEndDate(
  startDate: string,
  projectExpectedEndDate?: string,
): string {
  if (!isIsoDateOnly(startDate)) return '';
  let end = addCalendarDays(startDate, DEFAULT_SUGGESTED_PHASE_DURATION_DAYS);
  if (
    projectExpectedEndDate &&
    isIsoDateOnly(projectExpectedEndDate) &&
    end > projectExpectedEndDate
  ) {
    end = projectExpectedEndDate;
  }
  if (end < startDate) return '';
  return end;
}

export function collectProjectPhaseScheduleIssues(
  phases: readonly ProjectPhaseScheduleDates[],
  context: ProjectPhaseScheduleContext,
): ProjectPhaseScheduleIssue[] {
  const issues: ProjectPhaseScheduleIssue[] = [];
  const projectStart = context.projectStartDate;
  const projectEnd = context.projectExpectedEndDate;
  const hasProjectStart = projectStart && isIsoDateOnly(projectStart);
  const hasProjectEnd = projectEnd && isIsoDateOnly(projectEnd);

  phases.forEach((phase, index) => {
    const start = phase.startDate;
    const end = phase.expectedEndDate;
    const hasStart = isIsoDateOnly(start);
    const hasEnd = isIsoDateOnly(end);

    if (hasStart && hasEnd && end < start) {
      issues.push({
        index,
        field: 'expectedEndDate',
        message: PROJECT_PHASE_SCHEDULE_MESSAGES.phaseEndBeforeStart,
      });
    }

    if (hasProjectStart && hasStart && start < projectStart) {
      issues.push({
        index,
        field: 'startDate',
        message: PROJECT_PHASE_SCHEDULE_MESSAGES.phaseStartBeforeProject,
      });
    }

    if (hasProjectEnd && hasEnd && end > projectEnd) {
      issues.push({
        index,
        field: 'expectedEndDate',
        message: PROJECT_PHASE_SCHEDULE_MESSAGES.phaseEndAfterProject,
      });
    }

    if (hasProjectEnd && hasStart && start > projectEnd) {
      issues.push({
        index,
        field: 'startDate',
        message: PROJECT_PHASE_SCHEDULE_MESSAGES.phaseStartAfterProjectEnd,
      });
    }

    if (index > 0) {
      const previousEnd = phases[index - 1]?.expectedEndDate ?? '';
      if (hasStart && isIsoDateOnly(previousEnd) && start <= previousEnd) {
        issues.push({
          index,
          field: 'startDate',
          message: PROJECT_PHASE_SCHEDULE_MESSAGES.phaseOverlap,
        });
      }
    }
  });

  return issues;
}
