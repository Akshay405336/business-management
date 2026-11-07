import type { DataTableSkeletonColumn } from '@/features/admin/components/data-table-skeleton';

/** Percent + fixed action column; no min-width — fits parent with table-fixed. */
export const ATTENDANCE_TABLE_COLUMN_CLASS = {
  employee: 'w-[24%] max-w-[24%] whitespace-normal px-2 sm:px-3',
  date: 'w-[11%] max-w-[11%] px-2',
  day: 'w-[11%] max-w-[11%] px-2',
  punchIn: 'w-[10%] max-w-[10%] px-2',
  punchOut: 'w-[10%] max-w-[10%] px-2',
  hours: 'w-[12%] max-w-[12%] px-2',
  result: 'w-[24%] max-w-[24%] px-2',
  actions: 'w-[5.5rem] max-w-[5.5rem] px-1 sm:px-2',
} as const;

export const ATTENDANCE_SELF_TABLE_COLUMN_CLASS = {
  date: 'w-[14%] max-w-[14%] px-2',
  day: 'w-[14%] max-w-[14%] px-2',
  punchIn: 'w-[12%] max-w-[12%] px-2',
  punchOut: 'w-[12%] max-w-[12%] px-2',
  hours: 'w-[14%] max-w-[14%] px-2',
  result: 'w-[36%] max-w-[36%] px-2',
} as const;

export const ATTENDANCE_SELF_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'text', className: ATTENDANCE_SELF_TABLE_COLUMN_CLASS.date },
  { variant: 'text', className: ATTENDANCE_SELF_TABLE_COLUMN_CLASS.day },
  { variant: 'text', className: ATTENDANCE_SELF_TABLE_COLUMN_CLASS.punchIn },
  { variant: 'text', className: ATTENDANCE_SELF_TABLE_COLUMN_CLASS.punchOut },
  { variant: 'text', className: ATTENDANCE_SELF_TABLE_COLUMN_CLASS.hours },
  { variant: 'badge', className: ATTENDANCE_SELF_TABLE_COLUMN_CLASS.result },
];

export const ATTENDANCE_TABLE_HEAD_CLASS =
  'truncate whitespace-nowrap px-2 sm:px-3' as const;

export const ATTENDANCE_TABLE_COMPACT_CELL = 'whitespace-nowrap px-2 tabular-nums' as const;

export const ATTENDANCE_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: ATTENDANCE_TABLE_COLUMN_CLASS.employee },
  { variant: 'text', className: ATTENDANCE_TABLE_COLUMN_CLASS.date },
  { variant: 'text', className: ATTENDANCE_TABLE_COLUMN_CLASS.punchIn },
  { variant: 'text', className: ATTENDANCE_TABLE_COLUMN_CLASS.punchOut },
  { variant: 'text', className: ATTENDANCE_TABLE_COLUMN_CLASS.hours },
  { variant: 'badge', className: ATTENDANCE_TABLE_COLUMN_CLASS.result },
  {
    variant: 'actions',
    className: ATTENDANCE_TABLE_COLUMN_CLASS.actions,
    headClassName: `${ATTENDANCE_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];
