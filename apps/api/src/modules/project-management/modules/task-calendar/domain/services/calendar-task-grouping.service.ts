import type { CalendarNormalizedTask } from '../types/calendar-task.types.js';

/**
 * Places each task on exactly one calendar day:
 * - Daily tasks: assignDate
 * - Project plan tasks: assignDate (scheduled start, or due date when no start — set in fromProjectTaskRow)
 *
 * Date keys are YYYY-MM-DD compared lexicographically (aligned with UTC date-only policy elsewhere).
 */
export function expandTasksToCalendarDays(
  tasks: readonly CalendarNormalizedTask[],
  rangeStart: string,
  rangeEnd: string,
): Map<string, CalendarNormalizedTask[]> {
  const byDay = new Map<string, CalendarNormalizedTask[]>();

  for (const task of tasks) {
    const placementDay = task.assignDate;
    if (placementDay < rangeStart || placementDay > rangeEnd) continue;

    const list = byDay.get(placementDay) ?? [];
    const key = `${task.source}:${task.id}`;
    if (list.some((x) => `${x.source}:${x.id}` === key)) continue;
    list.push(task);
    byDay.set(placementDay, list);
  }

  return byDay;
}
