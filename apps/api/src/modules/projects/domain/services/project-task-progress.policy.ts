import type { ProjectTaskStatus } from '../project-task-types.js';

export class ProjectTaskProgressPolicy {
  static calculatePercent(
    tasks: readonly { readonly status: ProjectTaskStatus }[],
  ): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
    return Math.round((completed / tasks.length) * 100);
  }
}
