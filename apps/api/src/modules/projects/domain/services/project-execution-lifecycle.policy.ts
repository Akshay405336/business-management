import type { ProjectExecutionLifecycle } from '../project-types.js';
import { ProjectValidationError } from '../errors/project.errors.js';

export class ProjectExecutionLifecyclePolicy {
  static assertCanSavePlan(lifecycle: ProjectExecutionLifecycle): void {
    if (lifecycle === 'IN_PRODUCTION' || lifecycle === 'COMPLETED') {
      throw new ProjectValidationError(
        'The plan cannot be edited after production has started or the project is completed.',
      );
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
