import type { DataTableSkeletonColumn } from './data-table-skeleton';

export const CRM_LEADS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'badge' },
  { variant: 'badge' },
  { variant: 'number', className: 'text-right' },
  { variant: 'text' },
  { variant: 'actions', headClassName: 'w-[7.5rem] text-right' },
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
  description: 'w-[32%] min-w-[12rem]',
  stages: 'w-[16%] min-w-[7.5rem]',
  leads: 'w-[4%] min-w-[2.5rem] max-w-[3.25rem]',
  status: 'w-[7%] min-w-[4.25rem] max-w-[5.5rem]',
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

export const CRM_PROJECTS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[11rem] min-w-[11rem] text-right' },
];

export const CRM_PACKAGES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'number', className: 'text-right' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[7.5rem] text-right' },
];
