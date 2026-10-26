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

export const CRM_PROJECT_FORM_DIALOG_CLASS =
  'flex max-h-[92vh] w-[calc(100vw-24px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(1000px,calc(100vw-64px))] sm:max-w-none';
