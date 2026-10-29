import type { ProjectTaskStatus } from '../types';

/** Text + border colors aligned with common PM tools (backlog / active / review / done). */
export const PROJECT_TASK_STATUS_STYLE: Record<
  ProjectTaskStatus,
  { color: string; borderColor: string }
> = {
  TODO: { color: '#475569', borderColor: '#475569' },
  IN_PROGRESS: { color: '#0369a1', borderColor: '#0369a1' },
  IN_REVIEW: { color: '#6d28d9', borderColor: '#6d28d9' },
  COMPLETED: { color: '#15803d', borderColor: '#15803d' },
};

export function projectTaskStatusStyle(status: ProjectTaskStatus) {
  return PROJECT_TASK_STATUS_STYLE[status];
}
