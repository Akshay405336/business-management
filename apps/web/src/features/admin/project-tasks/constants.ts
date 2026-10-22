export {
  PROJECT_LIFECYCLE_TABS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from '@/features/admin/projects/constants';

export const PROJECT_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const;

export const PROJECT_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const PROJECT_TASK_FORM_DIALOG_CLASS =
  'flex max-h-[90vh] w-[calc(100vw-24px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-[min(520px,calc(100vw-48px))]';

export type ProjectManagementViewMode = 'grid' | 'list' | 'gantt';

export const DEFAULT_PROJECT_MANAGEMENT_VIEW: ProjectManagementViewMode = 'grid';
