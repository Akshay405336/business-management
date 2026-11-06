import type { ProjectExecutionLifecycle } from '../project-types.js';
import { ProjectPlanLockedError, ProjectValidationError } from '../errors/project.errors.js';
import type { UpdateProjectInput } from '../repositories/project.repository.js';
import type { UpdateProjectTaskInput } from '../repositories/project-task.repository.js';

export const PROJECT_PLAN_LOCKED_MESSAGE =
  'Plan locked because production has started.' as const;

export const PROJECT_COMPLETED_READ_ONLY_MESSAGE =
  'Completed projects are read-only.' as const;

export class ProjectExecutionLifecyclePolicy {
  static assertCanSavePlan(lifecycle: ProjectExecutionLifecycle): void {
    if (lifecycle === 'IN_PRODUCTION') {
      throw new ProjectPlanLockedError(PROJECT_PLAN_LOCKED_MESSAGE);
    }
    if (lifecycle === 'COMPLETED') {
      throw new ProjectPlanLockedError(PROJECT_COMPLETED_READ_ONLY_MESSAGE);
    }
  }

  static assertCanMutatePlanBaseline(lifecycle: ProjectExecutionLifecycle): void {
    this.assertCanSavePlan(lifecycle);
  }

  /** Ad-hoc tasks during production are allowed; they are excluded from the frozen plan view. */
  static assertCanCreateTask(
    lifecycle: ProjectExecutionLifecycle,
  ): void {
    if (lifecycle === 'COMPLETED') {
      throw new ProjectPlanLockedError(PROJECT_COMPLETED_READ_ONLY_MESSAGE);
    }
  }

  static assertCanUpdateProject(
    lifecycle: ProjectExecutionLifecycle,
    input: UpdateProjectInput,
  ): void {
    if (lifecycle === 'COMPLETED') {
      throw new ProjectValidationError(PROJECT_COMPLETED_READ_ONLY_MESSAGE);
    }
    if (lifecycle !== 'IN_PRODUCTION') return;

    const touchesBaseline =
      input.startDate !== undefined ||
      input.expectedEndDate !== undefined ||
      input.phases !== undefined ||
      input.scopeAndRequirements !== undefined;
    if (touchesBaseline) {
      throw new ProjectPlanLockedError(PROJECT_PLAN_LOCKED_MESSAGE);
    }
  }

  static assertCanUpdateTaskInProduction(input: UpdateProjectTaskInput): void {
    const touchesBaseline =
      input.title !== undefined ||
      input.description !== undefined ||
      input.priority !== undefined ||
      input.phaseId !== undefined ||
      input.startDate !== undefined ||
      input.dueDate !== undefined;
    if (touchesBaseline) {
      throw new ProjectPlanLockedError(PROJECT_PLAN_LOCKED_MESSAGE);
    }
  }

  static assertCanStartProduction(lifecycle: ProjectExecutionLifecycle): void {
    if (lifecycle !== 'PLANNED') {
      throw new ProjectValidationError('Only a planned project can start production.');
    }
  }

  static assertCanCompleteProject(lifecycle: ProjectExecutionLifecycle): void {
    if (lifecycle !== 'IN_PRODUCTION') {
      throw new ProjectValidationError('Only a project in production can be marked completed.');
    }
  }

  static nextAfterPlanSaved(): ProjectExecutionLifecycle {
    return 'PLANNED';
  }

  static nextAfterProductionStart(): ProjectExecutionLifecycle {
    return 'IN_PRODUCTION';
  }

  static nextAfterComplete(): ProjectExecutionLifecycle {
    return 'COMPLETED';
  }
}
