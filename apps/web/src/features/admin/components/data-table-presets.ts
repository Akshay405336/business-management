import type { DataTableSkeletonColumn } from './data-table-skeleton';

/**
 * CRM leads table (`table-fixed`): fixed widths on data columns; email absorbs extra width.
 * Keeps Lead and Phone adjacent without a wide empty band between them.
 */
export const CRM_LEADS_TABLE_COLUMN_CLASS = {
  select: 'w-[2.75rem] min-w-[2.75rem] max-w-[2.75rem] px-2',
  lead: 'w-[13rem] min-w-[10rem] max-w-[14rem] !whitespace-normal pr-1',
  phone: 'w-[11rem] min-w-[11rem] max-w-[12rem]',
  email: 'min-w-[9rem] w-auto !whitespace-normal',
  stage: 'w-[7.75rem] min-w-[7.25rem]',
  priority: 'w-[6.75rem] min-w-[6.25rem]',
  value: 'w-[6.5rem] min-w-[6rem] pr-2',
  actions: 'w-[8.75rem] min-w-[8.5rem]',
} as const;

export const CRM_LEADS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  {
    variant: 'icon',
    className: CRM_LEADS_TABLE_COLUMN_CLASS.select,
    headClassName: CRM_LEADS_TABLE_COLUMN_CLASS.select,
  },
  { variant: 'textWide', className: CRM_LEADS_TABLE_COLUMN_CLASS.lead },
  { variant: 'text', className: CRM_LEADS_TABLE_COLUMN_CLASS.phone },
  { variant: 'text', className: CRM_LEADS_TABLE_COLUMN_CLASS.email },
  { variant: 'badge', className: CRM_LEADS_TABLE_COLUMN_CLASS.stage },
  { variant: 'badge', className: CRM_LEADS_TABLE_COLUMN_CLASS.priority },
  {
    variant: 'number',
    className: `${CRM_LEADS_TABLE_COLUMN_CLASS.value} text-right`,
  },
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

/** Width classes for the HR leave types listing table (`table-fixed`). */
export const CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS = {
  name: 'w-[24%] min-w-[9rem]',
  code: 'w-[12%] min-w-[5rem]',
  paid: 'w-[14%] min-w-[6rem]',
  attachment: 'w-[14%] min-w-[6.5rem]',
  status: 'w-[12%] min-w-[5.75rem]',
  actions: 'w-[16%] min-w-[10rem]',
} as const;

export const CRM_LEAVE_TYPES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.name },
  { variant: 'text', className: CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.code },
  { variant: 'badge', className: CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.paid },
  { variant: 'text', className: CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.attachment },
  { variant: 'badge', className: CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.status },
  {
    variant: 'actions',
    className: CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.actions,
    headClassName: `${CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.actions} text-right`,
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

/** Width classes for the HRM employees listing table (`table-fixed`). */
export const CRM_EMPLOYEES_TABLE_COLUMN_CLASS = {
  employee: 'w-[24%] min-w-[12rem]',
  jobTitle: 'w-[16%] min-w-[9rem]',
  contact: 'w-[22%] min-w-[10rem]',
  joined: 'w-[12%] min-w-[6.5rem] pr-8',
  status: 'w-[12%] min-w-[7.5rem] px-6',
  actions: 'w-[14%] min-w-[10.5rem] pl-4',
} as const;

export const CRM_EMPLOYEES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: CRM_EMPLOYEES_TABLE_COLUMN_CLASS.employee },
  { variant: 'text', className: CRM_EMPLOYEES_TABLE_COLUMN_CLASS.jobTitle },
  { variant: 'text', className: CRM_EMPLOYEES_TABLE_COLUMN_CLASS.contact },
  { variant: 'text', className: CRM_EMPLOYEES_TABLE_COLUMN_CLASS.joined },
  { variant: 'badge', className: CRM_EMPLOYEES_TABLE_COLUMN_CLASS.status },
  {
    variant: 'actions',
    className: CRM_EMPLOYEES_TABLE_COLUMN_CLASS.actions,
    headClassName: `${CRM_EMPLOYEES_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];

/** Width classes for org roles listing table (`table-fixed`). */
export const ORG_ROLES_TABLE_COLUMN_CLASS = {
  name: 'w-[18%] min-w-[8rem]',
  key: 'w-[16%] min-w-[7rem]',
  type: 'w-[10%] min-w-[5.5rem]',
  permissions: 'w-[10%] min-w-[5rem]',
  members: 'w-[9%] min-w-[4.5rem] pr-4',
  status: 'w-[11%] min-w-[5.75rem]',
  actions: 'w-[15%] min-w-[10rem]',
} as const;

/** Width classes for org members listing table (`table-fixed`). */
export const ORG_MEMBERS_TABLE_COLUMN_CLASS = {
  name: 'w-[20%] min-w-[9rem]',
  email: 'w-[32%] min-w-[11rem]',
  role: 'w-[20%] min-w-[8rem]',
  status: 'w-[14%] min-w-[7rem]',
  actions: 'w-[14%] min-w-[10rem]',
} as const;

export const ORG_MEMBERS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: ORG_MEMBERS_TABLE_COLUMN_CLASS.name },
  { variant: 'textWide', className: ORG_MEMBERS_TABLE_COLUMN_CLASS.email },
  { variant: 'badge', className: ORG_MEMBERS_TABLE_COLUMN_CLASS.role },
  { variant: 'badge', className: ORG_MEMBERS_TABLE_COLUMN_CLASS.status },
  {
    variant: 'actions',
    className: ORG_MEMBERS_TABLE_COLUMN_CLASS.actions,
    headClassName: `${ORG_MEMBERS_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];

export const ORG_ROLES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: ORG_ROLES_TABLE_COLUMN_CLASS.name },
  { variant: 'text', className: ORG_ROLES_TABLE_COLUMN_CLASS.key },
  { variant: 'badge', className: ORG_ROLES_TABLE_COLUMN_CLASS.type },
  {
    variant: 'number',
    className: `${ORG_ROLES_TABLE_COLUMN_CLASS.permissions} text-right`,
  },
  {
    variant: 'number',
    className: `${ORG_ROLES_TABLE_COLUMN_CLASS.members} text-right`,
  },
  { variant: 'badge', className: ORG_ROLES_TABLE_COLUMN_CLASS.status },
  {
    variant: 'actions',
    className: ORG_ROLES_TABLE_COLUMN_CLASS.actions,
    headClassName: `${ORG_ROLES_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];
