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
  { variant: 'text', headClassName: 'w-12' },
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[7.5rem]' },
];

export const CRM_CLIENTS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'text' },
];

export const CRM_PROPOSALS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'number' },
  { variant: 'text' },
  { variant: 'actions', headClassName: 'text-right' },
];

export const CRM_PACKAGES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'number', className: 'text-right' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[7.5rem] text-right' },
];
