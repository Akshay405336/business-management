export const DEFAULT_LEAD_CURRENCY = 'INR' as const;

/** Shared centered lead create/edit dialog sizing */
export const CRM_LEAD_DIALOG_CLASS =
  'flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[900px] flex-col gap-0 overflow-hidden p-0 sm:w-[min(900px,calc(100vw-2rem))] sm:min-w-[760px]';

/** Wide quotation create/edit dialog — overrides DialogContent default max-w-lg / sm:max-w-lg */
export const CRM_PROPOSAL_FORM_DIALOG_CLASS =
  'flex max-h-[92vh] w-[calc(100vw-24px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(1000px,calc(100vw-64px))] sm:max-w-none';

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
