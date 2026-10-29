import type { DataTableSkeletonColumn } from './data-table-skeleton';

/** Width classes for the CRM leads listing table (`table-fixed`). */
export const CRM_LEADS_TABLE_COLUMN_CLASS = {
  lead: 'w-[22%] min-w-[10rem]',
  contact: 'w-[18%] min-w-[8rem]',
  stage: 'w-[12%] min-w-[6.5rem]',
  priority: 'w-[10%] min-w-[5.5rem]',
  value: 'w-[10%] min-w-[5rem] pr-4',
  activity: 'w-[14%] min-w-[7rem]',
  actions: 'w-[14%] min-w-[9rem]',
} as const;

export const CRM_LEADS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: CRM_LEADS_TABLE_COLUMN_CLASS.lead },
  { variant: 'text', className: CRM_LEADS_TABLE_COLUMN_CLASS.contact },
  { variant: 'badge', className: CRM_LEADS_TABLE_COLUMN_CLASS.stage },
  { variant: 'badge', className: CRM_LEADS_TABLE_COLUMN_CLASS.priority },
  {
    variant: 'number',
    className: `${CRM_LEADS_TABLE_COLUMN_CLASS.value} text-right`,
  },
  { variant: 'text', className: CRM_LEADS_TABLE_COLUMN_CLASS.activity },
  {
    variant: 'actions',
    className: CRM_LEADS_TABLE_COLUMN_CLASS.actions,
    headClassName: `${CRM_LEADS_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];

export const CRM_PIPELINE_STAGES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'icon', headClassName: 'w-10' },
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'icon', headClassName: 'w-12' },
  { variant: 'text', headClassName: 'w-16' },
  { variant: 'badge', headClassName: 'w-24' },
  { variant: 'actions', headClassName: 'w-[7.5rem]' },
];

/** Width classes for the CRM pipeline listing table (`table-fixed`). */
export const CRM_PIPELINES_TABLE_COLUMN_CLASS = {
  select: 'w-[2.75rem] min-w-[2.75rem] max-w-[2.75rem] px-2',
  name: 'w-[20%] min-w-[8rem]',
  description: 'w-[30%] min-w-[12rem]',
  stages: 'w-[15%] min-w-[7.5rem]',
  leads: 'w-[6%] min-w-[4rem] pr-6',
  status: 'w-[9%] min-w-[5.75rem] pl-1 pr-2',
  actions: 'w-[15%] min-w-[10rem]',
} as const;

export const CRM_PIPELINES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  {
    variant: 'icon',
    className: CRM_PIPELINES_TABLE_COLUMN_CLASS.select,
    headClassName: CRM_PIPELINES_TABLE_COLUMN_CLASS.select,
  },
  { variant: 'text', className: CRM_PIPELINES_TABLE_COLUMN_CLASS.name },
  {
    variant: 'textWide',
    className: `${CRM_PIPELINES_TABLE_COLUMN_CLASS.description} whitespace-normal`,
  },
  { variant: 'badge', className: CRM_PIPELINES_TABLE_COLUMN_CLASS.stages },
  {
    variant: 'number',
    className: `${CRM_PIPELINES_TABLE_COLUMN_CLASS.leads} text-right`,
  },
  { variant: 'badge', className: CRM_PIPELINES_TABLE_COLUMN_CLASS.status },
  {
    variant: 'actions',
    className: CRM_PIPELINES_TABLE_COLUMN_CLASS.actions,
    headClassName: `${CRM_PIPELINES_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];

export const CRM_CLIENTS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[7.5rem] text-right' },
];

export const CRM_PROPOSALS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'number', className: 'text-right' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[7.5rem] text-right' },
];

/** Width classes for the CRM projects listing table (`table-fixed`). */
export const CRM_PROJECTS_TABLE_COLUMN_CLASS = {
  project: 'w-[18%] min-w-[9rem]',
  client: 'w-[16%] min-w-[8rem]',
  phases: 'w-[9%] min-w-[5rem]',
  priority: 'w-[9%] min-w-[5.5rem]',
  progress: 'w-[14%] min-w-[7rem]',
  startDate: 'w-[11%] min-w-[6rem]',
  status: 'w-[10%] min-w-[5.75rem]',
  actions: 'w-[13%] min-w-[10rem]',
} as const;

export const CRM_PROJECTS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.project },
  { variant: 'text', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.client },
  { variant: 'badge', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.phases },
  { variant: 'badge', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.priority },
  { variant: 'text', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.progress },
  { variant: 'text', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.startDate },
  { variant: 'badge', className: CRM_PROJECTS_TABLE_COLUMN_CLASS.status },
  {
    variant: 'actions',
    className: CRM_PROJECTS_TABLE_COLUMN_CLASS.actions,
    headClassName: `${CRM_PROJECTS_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];

export const CRM_PACKAGES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'number', className: 'text-right' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[7.5rem] text-right' },
];
