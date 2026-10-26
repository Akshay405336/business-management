import type { ProjectExecutionLifecycle } from '@techwin/contracts';

export const PROJECT_PLAN_LOCKED_MESSAGE =
  'Plan locked because production has started.' as const;

export function isProjectPlanEditable(lifecycle: ProjectExecutionLifecycle): boolean {
  return lifecycle === 'NOT_PLANNED' || lifecycle === 'PLANNED';
}

export function isProjectPlanLocked(lifecycle: ProjectExecutionLifecycle): boolean {
  return lifecycle === 'IN_PRODUCTION' || lifecycle === 'COMPLETED';
}
