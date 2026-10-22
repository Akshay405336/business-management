import type { ProjectPhaseStatus } from '../project-types.js';

export const ProjectProgressPolicy = {
  calculatePercent(
    phases: readonly { readonly status: ProjectPhaseStatus }[],
  ): number {
    if (phases.length === 0) return 0;
    const completed = phases.filter((phase) => phase.status === 'COMPLETED').length;
    return Math.round((completed / phases.length) * 100);
  },
};
