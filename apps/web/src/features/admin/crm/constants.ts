import { cn } from '@/shared/lib/utils';

export const DEFAULT_LEAD_CURRENCY = 'INR' as const;

/** Shared centered lead create/edit dialog sizing */
export const CRM_LEAD_DIALOG_CLASS =
  'flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[900px] flex-col gap-0 overflow-hidden p-0 sm:w-[min(900px,calc(100vw-2rem))] sm:min-w-[760px]';

/** Wide quotation create/edit dialog — overrides DialogContent default max-w-lg / sm:max-w-lg */
export const CRM_PROPOSAL_FORM_DIALOG_CLASS =
  'flex max-h-[92vh] w-[calc(100vw-24px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(1000px,calc(100vw-64px))] sm:max-w-none';

/** Pipeline create/edit dialog with inline stage editor */
export const CRM_PIPELINE_FORM_DIALOG_CLASS =
  'flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-[720px] flex-col gap-0 overflow-hidden p-0 sm:w-[min(720px,calc(100vw-2rem))]';

/** Close control on the shared dialog content, as used by the pipeline form. */
export const CRM_PIPELINE_DIALOG_CLOSE_CLASS =
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50';

export const CRM_PIPELINE_DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_DIALOG_CLOSE_CLASS,
);

export const CRM_PIPELINE_DIALOG_HEADER_CLASS = 'shrink-0 space-y-0 px-6 pt-6 pb-2 text-left';

export const CRM_PIPELINE_DIALOG_TITLE_CLASS =
  'text-foreground pr-10 text-xl font-semibold tracking-tight';

export const CRM_PIPELINE_DIALOG_BODY_CLASS = 'min-h-0 flex-1 overflow-y-auto px-6 py-2';

export const CRM_PIPELINE_DIALOG_FOOTER_CLASS =
  'shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end';

export const CRM_PIPELINE_SECONDARY_BUTTON_CLASS =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

export const CRM_PIPELINE_PRIMARY_BUTTON_CLASS =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

/** Deactivate confirmation in the pipelines list. */
export const CRM_PIPELINE_STATUS_ACTION_CLASS = 'bg-neutral-900 text-white hover:bg-neutral-800';

/** Delete confirmation in the pipelines list. */
export const CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS =
  'bg-destructive text-destructive-foreground hover:bg-destructive/90';

/** Light bluish fields in pipeline create/edit dialog */
export const CRM_PIPELINE_FORM_FIELD_CLASS =
  'h-11 rounded-lg border-0 bg-[#f7faff] text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:border-0 focus-visible:ring-1 focus-visible:ring-sky-100';

export const CRM_PIPELINE_FORM_TEXTAREA_CLASS =
  'min-h-[5rem] resize-y rounded-lg border-0 bg-[#f7faff] text-foreground shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-1 focus-visible:ring-sky-100';

/** Pipeline list toolbar search (matches form field tint) */
export const CRM_PIPELINE_SEARCH_INPUT_CLASS =
  'border-input h-9 rounded-lg border bg-[#f7faff] shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-1 focus-visible:ring-sky-100';

export const STAGE_COLOR_PRESETS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#0891b2',
  '#64748b',
] as const;

export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'EMAIL',
  'SOCIAL',
  'EVENT',
  'PARTNER',
  'OTHER',
] as const;

export const ACTIVITY_TYPES = [
  'FIRST_CALL',
  'FOLLOW_UP_CALL',
  'MEETING',
  'EMAIL',
  'NOTE',
  'TASK',
  'STAGE_CHANGE',
  'PROPOSAL_CREATED',
  'PROPOSAL_STATUS_CHANGE',
  'LEAD_CONVERTED',
  'LEAD_LINKED_TO_CLIENT',
] as const;

export const PROPOSAL_STATUSES = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;

export const PROPOSAL_TYPES = ['PROPOSAL', 'QUOTATION'] as const;
export const CLIENT_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;
export const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
