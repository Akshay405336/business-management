import type {
  CalendarTaskDisplayStatus,
  TaskCalendarDayBucketDto,
  TaskCalendarTaskDto,
} from '@techwin/contracts';

/** Bottom-of-calendar legend: exactly four workflow rows (no Overdue, no On Hold). */
export const TASK_CALENDAR_LEGEND_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
] as const satisfies readonly CalendarTaskDisplayStatus[];

/** Used for status-column sort only (includes API values not shown in legend). */
const SORT_STATUS_ORDER: readonly CalendarTaskDisplayStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'REVIEW',
  'ON_HOLD',
  'COMPLETED',
  'OVERDUE',
];

export const DISPLAY_STATUS_LABEL: Record<CalendarTaskDisplayStatus, string> = {
  OPEN: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
};

/** User-facing task type label for chips and overflow (workflow status drives chip color, not type). */
export function formatTaskCalendarTaskType(taskType: string): string {
  switch (taskType) {
    case 'PROJECT_PLAN':
      return 'Project plan';
    case 'GENERAL':
      return 'General';
    case 'PROJECT':
      return 'Project';
    default:
      return taskType.replace(/_/g, ' ');
  }
}

/**
 * Raw workflow bucket (API may still carry ON_HOLD — Task Calendar maps that to To Do for chips).
 */
export function resolveTaskCalendarChipStatus(task: TaskCalendarTaskDto): Exclude<CalendarTaskDisplayStatus, 'OVERDUE'> {
  if (task.completedAt !== null && task.completedAt !== undefined) return 'COMPLETED';

  if (task.source === 'DAILY_TASK') {
    const key = task.workflowStageKey?.toLowerCase() ?? '';
    if (key === 'in_progress') return 'IN_PROGRESS';
    if (key === 'review') return 'REVIEW';
    if (key === 'on_hold') return 'OPEN';
    if (key === 'completed') return 'COMPLETED';
    if (key === 'todo') return 'OPEN';
    const fromLabel = inferWorkflowFromLabels(task.statusLabel, task.statusDetail);
    if (fromLabel) return fromLabel;
    return 'OPEN';
  }

  const fromProject = (task.statusLabel ?? '').trim().toUpperCase();
  if (fromProject === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (fromProject === 'IN_REVIEW') return 'REVIEW';
  if (fromProject === 'COMPLETED') return 'COMPLETED';
  if (fromProject === 'ON_HOLD') return 'OPEN';
  if (fromProject === 'TODO') return 'OPEN';
  return 'OPEN';
}

function inferWorkflowFromLabels(statusLabel: string, statusDetail: string | null): Exclude<CalendarTaskDisplayStatus, 'OVERDUE'> | null {
  const raw = `${statusLabel} ${statusDetail ?? ''}`.toUpperCase();
  if (raw.includes('IN PROGRESS') || raw.includes('IN_PROGRESS')) return 'IN_PROGRESS';
  if (raw.includes('REVIEW')) return 'REVIEW';
  if (raw.includes('ON HOLD') || raw.includes('ON_HOLD')) return 'OPEN';
  if (raw.includes('COMPLETE')) return 'COMPLETED';
  if (raw.includes('TO DO') || raw.includes('TODO') || raw.includes('OPEN')) return 'OPEN';
  return null;
}

/** Four workflow buckets for calendar chips only (On Hold / API Overdue map to To Do styling). */
export type TaskCalendarChipVisualStatus = 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';

/** Task titles are always black; chip surface + dot use hex (inline styles — Tailwind arbitrary bg-* was not reliably painting in prod). */
const TASK_CALENDAR_TITLE_CLASS = 'text-gray-900';

const TASK_CALENDAR_CHIP_HEX: Record<TaskCalendarChipVisualStatus, { surface: string; dot: string }> = {
  OPEN: { surface: '#F1F2F4', dot: '#9CA3AF' },
  IN_PROGRESS: { surface: '#EAF3FF', dot: '#3B82F6' },
  REVIEW: { surface: '#FFF5D6', dot: '#EAB308' },
  COMPLETED: { surface: '#E7F7EC', dot: '#22C55E' },
};

export function resolveTaskCalendarVisualStatus(task: TaskCalendarTaskDto): TaskCalendarChipVisualStatus {
  const workflow = resolveTaskCalendarChipStatus(task);
  if (
    (task.completedAt !== null && task.completedAt !== undefined) ||
    workflow === 'COMPLETED' ||
    task.displayStatus === 'COMPLETED'
  ) {
    return 'COMPLETED';
  }
  if (workflow === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (workflow === 'REVIEW') return 'REVIEW';
  // To Do, On Hold, API Overdue bucket, unknown → grey To Do
  return 'OPEN';
}

/** True when the day has tasks and every task renders as Completed in the calendar UI. */
export function taskCalendarDayIsAllCompleted(tasks: readonly TaskCalendarTaskDto[]): boolean {
  if (tasks.length === 0) return false;
  return tasks.every((t) => resolveTaskCalendarVisualStatus(t) === 'COMPLETED');
}

export type TaskCalendarCellBorderVariant = 'sunday' | 'completed' | 'upcoming' | 'default';

/**
 * Pure resolver for outer day-cell border styling.
 * Priority: Sunday → all tasks completed → upcoming (after local today) → neutral grey.
 *
 * `date` and `localToday` must be YYYY-MM-DD from the same calendar (local) semantics.
 * `isSunday` is supplied by the grid (first column = Sun in Sun–Sat layout).
 */
export function resolveTaskCalendarCellBorderVariant(
  date: string,
  localToday: string,
  isSunday: boolean,
  tasks: readonly TaskCalendarTaskDto[],
): TaskCalendarCellBorderVariant {
  if (isSunday) return 'sunday';
  if (taskCalendarDayIsAllCompleted(tasks)) return 'completed';
  if (date > localToday) return 'upcoming';
  return 'default';
}

/** Task-calendar UI: four workflow labels only (On Hold / Overdue API bucket → To Do wording). */
export function taskCalendarUiStatusLabel(task: TaskCalendarTaskDto): string {
  return DISPLAY_STATUS_LABEL[resolveTaskCalendarVisualStatus(task)];
}

/** Tooltip / popover secondary status line (no Overdue bucket in UI). */
export function formatTaskCalendarStatusLine(task: TaskCalendarTaskDto): string {
  const workflowKey = resolveTaskCalendarVisualStatus(task);
  const workflow = DISPLAY_STATUS_LABEL[workflowKey];

  if (
    (task.completedAt !== null && task.completedAt !== undefined) ||
    workflowKey === 'COMPLETED' ||
    task.displayStatus === 'COMPLETED'
  ) {
    return workflow;
  }

  const detail = task.statusDetail?.trim();
  if (
    detail &&
    task.source === 'DAILY_TASK' &&
    detail !== workflow &&
    !detail.includes(workflow) &&
    !workflow.includes(detail)
  ) {
    return `${workflow} · ${detail}`;
  }

  return workflow;
}

/**
 * Chip + overflow card styles — hex colors for surface + dot (always applied via inline style).
 */
export function taskCalendarChipStyle(task: TaskCalendarTaskDto): {
  surfaceHex: string;
  dotHex: string;
  text: string;
} {
  const visual = resolveTaskCalendarVisualStatus(task);
  const { surface, dot } = TASK_CALENDAR_CHIP_HEX[visual];
  return { surfaceHex: surface, dotHex: dot, text: TASK_CALENDAR_TITLE_CLASS };
}

export function taskCalendarLegendDotHex(status: (typeof TASK_CALENDAR_LEGEND_STATUSES)[number]): string {
  return TASK_CALENDAR_CHIP_HEX[status].dot;
}

/** @deprecated Inline hex mapping is authoritative; kept for callers expecting old shape. */
export function chipColors(status: TaskCalendarChipVisualStatus): {
  surfaceHex: string;
  dotHex: string;
  text: string;
} {
  const { surface, dot } = TASK_CALENDAR_CHIP_HEX[status];
  return { surfaceHex: surface, dotHex: dot, text: TASK_CALENDAR_TITLE_CLASS };
}

export function dayMapFromResponse(days: readonly TaskCalendarDayBucketDto[]): Map<string, TaskCalendarDayBucketDto> {
  return new Map(days.map((d) => [d.date, d]));
}

export type CalendarSortBy = 'priority' | 'dueDate' | 'assignDate' | 'title' | 'status';
export type CalendarSortDir = 'asc' | 'desc';

const PRIORITY_RANK: Record<string, number> = {
  URGENT: 4,
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  NORMAL: 2,
  LOW: 1,
};

function priorityRank(value: string): number {
  return PRIORITY_RANK[value?.toUpperCase?.() ?? ''] ?? 0;
}

function statusRank(status: CalendarTaskDisplayStatus): number {
  const idx = SORT_STATUS_ORDER.indexOf(status);
  return idx === -1 ? SORT_STATUS_ORDER.length : idx;
}

/** Stable-ish comparator (ascending) for two calendar tasks by the given field. */
function compareBy(a: TaskCalendarTaskDto, b: TaskCalendarTaskDto, by: CalendarSortBy): number {
  switch (by) {
    case 'priority':
      return priorityRank(a.priority) - priorityRank(b.priority);
    case 'dueDate': {
      // Null due dates sort last in ascending order.
      const av = a.dueDate ?? '9999-12-31';
      const bv = b.dueDate ?? '9999-12-31';
      return av.localeCompare(bv);
    }
    case 'assignDate':
      return a.assignDate.localeCompare(b.assignDate);
    case 'title':
      return a.title.localeCompare(b.title);
    case 'status':
      return statusRank(a.displayStatus) - statusRank(b.displayStatus);
    default:
      return 0;
  }
}

/** Returns a new sorted array of tasks; ties fall back to title for determinism. */
export function sortCalendarTasks(
  tasks: readonly TaskCalendarTaskDto[],
  by: CalendarSortBy,
  dir: CalendarSortDir,
): TaskCalendarTaskDto[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const primary = compareBy(a, b, by);
    if (primary !== 0) return primary * factor;
    return a.title.localeCompare(b.title);
  });
}

/** Applies sorting to the tasks inside every day bucket, preserving counts. */
export function sortDayBuckets(
  daysByDate: ReadonlyMap<string, TaskCalendarDayBucketDto>,
  by: CalendarSortBy,
  dir: CalendarSortDir,
): Map<string, TaskCalendarDayBucketDto> {
  const next = new Map<string, TaskCalendarDayBucketDto>();
  for (const [date, bucket] of daysByDate) {
    next.set(date, { ...bucket, tasks: sortCalendarTasks(bucket.tasks, by, dir) });
  }
  return next;
}
