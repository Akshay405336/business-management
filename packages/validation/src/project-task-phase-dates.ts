export type TaskPhaseDateBounds = {
  readonly phaseStartDate: string;
  readonly phaseExpectedEndDate: string;
};

export type TaskPhaseDateFieldErrors = {
  startDate?: string;
  dueDate?: string;
};

/** Task planned dates must stay within the parent phase schedule. */
export function collectTaskPhaseDateFieldErrors(
  input: {
    startDate?: string | null;
    dueDate?: string | null;
  },
  bounds: TaskPhaseDateBounds,
): TaskPhaseDateFieldErrors {
  const { phaseStartDate, phaseExpectedEndDate } = bounds;
  const startDate = input.startDate?.trim() ? input.startDate.trim().slice(0, 10) : null;
  const dueDate = input.dueDate?.trim() ? input.dueDate.trim().slice(0, 10) : null;
  const errors: TaskPhaseDateFieldErrors = {};

  if (startDate && startDate < phaseStartDate) {
    errors.startDate = 'Start date cannot be before the phase start date.';
  }
  if (startDate && startDate > phaseExpectedEndDate) {
    errors.startDate = 'Start date cannot be after the phase end date.';
  }
  if (dueDate && dueDate < phaseStartDate) {
    errors.dueDate = 'Due date cannot be before the phase start date.';
  }
  if (dueDate && dueDate > phaseExpectedEndDate) {
    errors.dueDate = 'Due date cannot be after the phase end date.';
  }

  return errors;
}

export function isTaskDateOutsidePhase(
  task: { startDate?: string | null; dueDate?: string | null },
  bounds: TaskPhaseDateBounds,
): boolean {
  return (
    Object.keys(collectTaskPhaseDateFieldErrors(task, bounds)).length > 0
  );
}
