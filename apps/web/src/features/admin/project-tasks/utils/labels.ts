import type { ProjectTaskPriority, ProjectTaskStatus } from '../types';

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelProjectTaskStatus = (status: ProjectTaskStatus): string => {
  if (status === 'TODO') return 'To Do';
  if (status === 'IN_REVIEW') return 'In Review';
  return titleCase(status);
};

export const labelProjectTaskPriority = (priority: ProjectTaskPriority): string =>
  titleCase(priority);
