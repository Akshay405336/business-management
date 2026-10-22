import { toDateInputValue } from '@/features/admin/crm/utils/format';
import {
  collectProjectPhaseScheduleIssues,
  suggestPhaseEndDate,
  suggestPhaseStartDate,
  type ProjectPhaseScheduleContext,
} from '@techwin/validation';
export type ProjectPhaseFormRow = {
  key: string;
  id: string | null;
  persisted: boolean;
  name: string;
  description: string;
  startDate: string;
  expectedEndDate: string;
  /** When true, start date is maintained by auto-scheduling until the user edits it. */
  startDateAuto: boolean;
  /** When true, expected end is maintained by auto-scheduling until the user edits it. */
  expectedEndDateAuto: boolean;
};

export function recalculateAutoSuggestedPhaseDates(
  phases: readonly ProjectPhaseFormRow[],
  fromIndex: number,
  projectStartDate: string,
  projectExpectedEndDate: string,
): ProjectPhaseFormRow[] {
  const projectStart = toDateInputValue(projectStartDate);
  const projectEnd = toDateInputValue(projectExpectedEndDate);
  const next = phases.map((row) => ({ ...row }));

  for (let index = Math.max(0, fromIndex); index < next.length; index += 1) {
    const row = next[index]!;
    const scheduleSlice = next.map((item) => ({
      startDate: toDateInputValue(item.startDate),
      expectedEndDate: toDateInputValue(item.expectedEndDate),
    }));

    if (row.startDateAuto) {
      row.startDate = suggestPhaseStartDate(index, scheduleSlice, projectStart);
    }
    if (row.expectedEndDateAuto) {
      row.expectedEndDate = suggestPhaseEndDate(toDateInputValue(row.startDate), projectEnd);
    }
  }

  return next;
}

export function validatePhaseScheduleFieldErrors(
  phases: readonly ProjectPhaseFormRow[],
  context: ProjectPhaseScheduleContext,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const schedulePhases = phases.map((row) => ({
    startDate: toDateInputValue(row.startDate),
    expectedEndDate: toDateInputValue(row.expectedEndDate),
  }));
  for (const issue of collectProjectPhaseScheduleIssues(schedulePhases, context)) {
    const key = `phases.${issue.index}.${issue.field}`;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
