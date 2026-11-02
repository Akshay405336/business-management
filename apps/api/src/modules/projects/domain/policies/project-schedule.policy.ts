import { ProjectValidationError } from '../errors/project.errors.js';

export type ProjectScheduleInput = {
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly planningStartDate?: string | null;
  readonly planningExpectedEndDate?: string | null;
};

export type ProjectPhaseScheduleDates = {
  readonly startDate: string;
  readonly expectedEndDate: string;
};

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDateOnly(value: string): boolean {
  return ISO_DATE_ONLY.test(value);
}

function firstPhaseScheduleIssue(
  phases: readonly ProjectPhaseScheduleDates[],
  projectStartDate: string,
  projectExpectedEndDate: string,
): string | null {
  const hasProjectStart = isIsoDateOnly(projectStartDate);
  const hasProjectEnd = isIsoDateOnly(projectExpectedEndDate);

  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index]!;
    const start = phase.startDate;
    const end = phase.expectedEndDate;
    const hasStart = isIsoDateOnly(start);
    const hasEnd = isIsoDateOnly(end);

    if (hasStart && hasEnd && end < start) {
      return 'Expected end date must be on or after the start date.';
    }
    if (hasProjectStart && hasStart && start < projectStartDate) {
      return 'Start date must be on or after the project start date.';
    }
    if (hasProjectEnd && hasEnd && end > projectExpectedEndDate) {
      return 'Expected end date must be on or before the project end date.';
    }
    if (hasProjectEnd && hasStart && start > projectExpectedEndDate) {
      return 'Start date must be on or before the project end date.';
    }
    if (index > 0) {
      const previousEnd = phases[index - 1]?.expectedEndDate ?? '';
      if (hasStart && isIsoDateOnly(previousEnd) && start <= previousEnd) {
        return "Start date must be after the previous phase's expected end date (phases cannot overlap).";
      }
    }
  }
  return null;
}

export const ProjectSchedulePolicy = {
  assertProjectDateRange(startDate: string, expectedEndDate: string): void {
    if (expectedEndDate < startDate) {
      throw new ProjectValidationError('Expected end date must be on or after the start date.');
    }
  },

  assertProjectPhaseSchedule(
    projectStartDate: string,
    projectExpectedEndDate: string,
    phases: readonly ProjectPhaseScheduleDates[],
  ): void {
    const message = firstPhaseScheduleIssue(phases, projectStartDate, projectExpectedEndDate);
    if (message) {
      throw new ProjectValidationError(message);
    }
  },

  assertPlanningWithinProject(input: ProjectScheduleInput): void {
    const planningStart = input.planningStartDate ?? input.startDate;
    const planningEnd = input.planningExpectedEndDate ?? input.expectedEndDate;
    if (!planningStart || !planningEnd) return;

    if (planningEnd < planningStart) {
      throw new ProjectValidationError(
        'Planning end date must be on or after the planning start date.',
      );
    }
    if (planningStart < input.startDate) {
      throw new ProjectValidationError('Planning start date must be within the project schedule.');
    }
    if (planningEnd > input.expectedEndDate) {
      throw new ProjectValidationError('Planning end date must be within the project schedule.');
    }
  },
};
