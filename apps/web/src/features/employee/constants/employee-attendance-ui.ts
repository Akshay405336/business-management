import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CRM_HEADER_SEARCH_FORM_CLASS } from '@/features/admin/crm/components/crm-toolbar-header';
import { inputGroupPaddingClass } from '@/components/ui/input-group';
import { ATTENDANCE_TABLE_HEAD_CLASS } from '@/features/admin/attendance/constants/attendance-table-presets';

export const EMPLOYEE_ATTENDANCE_SURFACE = {
  card: 'rounded-xl border border-[#E8E8EF] bg-white shadow-none',
  headerBar: 'border-b border-[#E8E8EF] bg-[#FAFBFD] px-4 py-2 sm:px-5',
  divider: 'divide-[#E8E8EF]',
} as const;

/** Full-width filter row; always wraps — avoids overlap at ~1100px layouts. */
export const EMPLOYEE_ATTENDANCE_FILTER_ROW =
  'flex min-w-0 w-full max-w-full flex-wrap items-center gap-2';

export const EMPLOYEE_ATTENDANCE_FILTER_GROUP = 'h-9 min-w-0 w-full sm:w-[10.75rem] sm:max-w-full';

export const EMPLOYEE_ATTENDANCE_FILTER_SEARCH_GROUP = cn(
  CRM_HEADER_SEARCH_FORM_CLASS,
  'h-9 sm:max-w-[min(100%,15rem)]',
);

export function employeeAttendanceFilterInputClass(opts?: { leading?: boolean }): string {
  return cn(
    CRM_PIPELINE_SEARCH_INPUT_CLASS,
    'h-9 w-full min-w-0 rounded-md shadow-xs',
    opts?.leading ? inputGroupPaddingClass({ leading: true }) : undefined,
  );
}

export const EMPLOYEE_ATTENDANCE_TABLE_HEAD = cn(
  ATTENDANCE_TABLE_HEAD_CLASS,
  'bg-[#F8F9FC] text-[10px] font-semibold uppercase tracking-wide text-[#64748B]',
);

export const EMPLOYEE_ATTENDANCE_TABLE_CELL = 'px-3 py-2.5 text-sm tabular-nums text-[#1E293B]';

/** Percent + min-width (pipeline-style); last column absorbs remaining width. */
export const EMPLOYEE_ATTENDANCE_TABLE_COL = {
  date: 'w-[14%] min-w-[7rem]',
  day: 'w-[14%] min-w-[6.5rem]',
  punchIn: 'w-[12%] min-w-[5.75rem]',
  punchOut: 'w-[12%] min-w-[5.75rem]',
  hours: 'w-[15%] min-w-[6.5rem]',
  late: 'w-[10%] min-w-[4.5rem]',
  status: 'min-w-[5.75rem]',
} as const;

export const EMPLOYEE_ATTENDANCE_TABLE_CLASS =
  'table-fixed w-full [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-2.5 [&_[data-slot=table-cell]]:py-2.5';

export const EMPLOYEE_ATTENDANCE_TABLE_BODY =
  '[&_[data-slot=table-row]]:border-b [&_[data-slot=table-row]]:border-[#F1F5F9] [&_[data-slot=table-row]:last-child]:border-0 [&_[data-slot=table-row]:hover]:bg-[#FAFBFD]';
