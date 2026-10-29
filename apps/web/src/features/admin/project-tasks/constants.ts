export {
  PROJECT_LIFECYCLE_TABS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from '@/features/admin/projects/constants';

export const PROJECT_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const;

export const PROJECT_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';

export const PROJECT_TASK_FORM_DIALOG_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'sm:max-w-[640px]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

export const PROJECT_TASK_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

export const PROJECT_TASK_FORM_PRIMARY_BTN =
  'h-11 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-5 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

export const PROJECT_VIEW_PLAN_MODAL_CLASS =
  'flex h-[100dvh] max-h-[100dvh] w-[100vw] max-w-none flex-col gap-0 overflow-hidden rounded-none border bg-white p-0 shadow-xl sm:h-[88vh] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[90rem] sm:rounded-lg';

export type ProjectManagementViewMode = 'grid' | 'list' | 'gantt';

export const DEFAULT_PROJECT_MANAGEMENT_VIEW: ProjectManagementViewMode = 'grid';
