import { isApiError } from '@/shared/api/api-error';

function pickBestApiDetail(
  details: readonly { path: string; message: string }[],
): { path: string; message: string } | undefined {
  if (details.length === 0) return undefined;
  const meaningful = details.find(
    (detail) => detail.message && detail.message !== 'Invalid input',
  );
  return meaningful ?? details[0];
}

const phaseFieldLabels: Record<string, string> = {
  name: 'name',
  description: 'description',
  startDate: 'start date',
  expectedEndDate: 'expected end date',
  ownerAdminId: 'owner',
  status: 'status',
  title: 'title',
  dueDate: 'due date',
  assigneeAdminId: 'assignee',
  priority: 'priority',
};

/** Turn API validation paths like `phases.1.startDate` into readable labels. */
function humanizeValidationPath(path: string | undefined): string | null {
  if (!path?.trim()) return null;
  const segments = path.split('.');
  if (segments[0] === 'phases' && segments.length >= 2) {
    const phaseIndex = Number(segments[1]);
    if (!Number.isNaN(phaseIndex)) {
      const phaseLabel = `Phase ${phaseIndex + 1}`;
      if (segments.length === 2) return phaseLabel;
      if (segments[2] === 'tasks' && segments.length === 3) return `${phaseLabel} tasks`;
      if (segments[2] === 'tasks' && segments.length >= 4) {
        const taskIndex = Number(segments[3]);
        const taskLabel = Number.isNaN(taskIndex) ? 'Task' : `Task ${taskIndex + 1}`;
        const field = segments[4];
        if (field && phaseFieldLabels[field]) {
          return `${phaseLabel}, ${taskLabel} ${phaseFieldLabels[field]}`;
        }
        return `${phaseLabel}, ${taskLabel}`;
      }
      const field = segments[2];
      if (field && phaseFieldLabels[field]) {
        return `${phaseLabel} ${phaseFieldLabels[field]}`;
      }
      return phaseLabel;
    }
  }
  if (segments[0] === 'phases' && segments.length === 1) return 'Phases';
  return null;
}

function formatValidationDetail(detail: { path: string; message: string }): string {
  const human = humanizeValidationPath(detail.path);
  if (human) return `${human}: ${detail.message}`;
  return detail.message;
}

const LEAD_CONTACT_FIELD_PATHS = new Set(['phone', 'email']);

/** Maps API validation details to CRM lead contact field errors when present. */
export function applyCrmLeadContactFieldErrors<T extends Record<string, string>>(
  error: unknown,
  setFieldErrors: (value: T | ((previous: T) => T)) => void,
): boolean {
  if (!isApiError(error) || error.details.length === 0) return false;
  const patch: Partial<T> = {};
  for (const detail of error.details) {
    if (LEAD_CONTACT_FIELD_PATHS.has(detail.path) && detail.message) {
      patch[detail.path as keyof T] = detail.message as T[keyof T];
    }
  }
  if (Object.keys(patch).length === 0) return false;
  setFieldErrors((previous) => ({ ...previous, ...patch }));
  return true;
}

export function describeCrmError(error: unknown): string {
  if (isApiError(error)) {
    const detail = pickBestApiDetail(error.details);
    if (detail?.message) {
      if (detail.message !== 'Invalid input') {
        return formatValidationDetail(detail);
      }
      if (error.message !== 'The request is invalid.') {
        return error.message;
      }
      return formatValidationDetail(detail);
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
