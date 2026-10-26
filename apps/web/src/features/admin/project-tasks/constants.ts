export {
  PROJECT_LIFECYCLE_TABS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from '@/features/admin/projects/constants';

export const PROJECT_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const;

export const PROJECT_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const PROJECT_TASK_FORM_DIALOG_CLASS =
  'flex max-h-[90vh] w-[calc(100vw-24px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-[min(520px,calc(100vw-48px))]';

export const PROJECT_VIEW_PLAN_MODAL_CLASS =
  'flex h-[100dvh] max-h-[100dvh] w-[100vw] max-w-none flex-col gap-0 overflow-hidden rounded-none border bg-white p-0 shadow-xl sm:h-[88vh] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[90rem] sm:rounded-lg';

export type ProjectManagementViewMode = 'grid' | 'list' | 'gantt';

export const DEFAULT_PROJECT_MANAGEMENT_VIEW: ProjectManagementViewMode = 'grid';
