export const PROJECT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const PROJECT_LIFECYCLE_PHASES = [
  'PLANNING',
  'PRODUCTION',
  'QA',
  'DEPLOYMENT',
  'HANDOVER',
  'COMPLETED',
] as const;

export const PROJECT_PHASE_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
] as const;

export const PROJECT_LIFECYCLE_TABS = [
  'ALL',
  'NOT_PLANNED',
  'PLANNED',
  'IN_PRODUCTION',
  'COMPLETED',
] as const;

export const PROJECT_EXECUTION_LIFECYCLES = [
  'NOT_PLANNED',
  'PLANNED',
  'IN_PRODUCTION',
  'COMPLETED',
] as const;

import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';

export const PROJECT_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

export const PROJECT_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

export const CRM_PROJECT_FORM_DIALOG_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'sm:max-w-[640px]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

export const PROJECT_FORM_FIELD_CLASS =
  'h-11 rounded-lg border-0 bg-[#f7faff] text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:border-0 focus-visible:ring-1 focus-visible:ring-sky-100';

export const PROJECT_FORM_TEXTAREA_CLASS =
  'min-h-[5rem] resize-y rounded-lg border-0 bg-[#f7faff] text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-1 focus-visible:ring-sky-100';

export const PROJECT_FORM_SELECT_TRIGGER_CLASS = cn(
  PROJECT_FORM_FIELD_CLASS,
  'w-full border-0 shadow-none data-[placeholder]:text-muted-foreground/55',
);
