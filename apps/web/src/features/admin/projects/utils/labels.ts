import type {
  ProjectLifecyclePhase,
  ProjectLifecycleTab,
  ProjectPhaseStatus,
  ProjectPriority,
  ProjectStatus,
} from '@/features/admin/projects/types';

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelProjectStatus = (status: ProjectStatus): string => titleCase(status);
export const labelProjectPriority = (priority: ProjectPriority): string => titleCase(priority);
export const labelProjectPhase = (phase: ProjectLifecyclePhase): string => {
  if (phase === 'QA') return 'Quality Assurance';
  return titleCase(phase);
};

export const labelProjectPhaseStatus = (status: ProjectPhaseStatus): string => titleCase(status);

export const labelProjectLifecycleTab = (tab: ProjectLifecycleTab): string => {
  if (tab === 'ALL') return 'All projects';
  return titleCase(tab);
};
