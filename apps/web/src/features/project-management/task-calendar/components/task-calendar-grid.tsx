'use client';

import type { TaskCalendarDayBucketDto, TaskCalendarTaskDto } from '@techwin/contracts';
import { buildMonthGrid } from '../utils/calendar-grid.utils';
import { TaskCalendarDayCell } from './task-calendar-day-cell';
import { TaskCalendarWeekHeader } from './task-calendar-week-header';

/** Fixed track size so task content cannot change a single cell's height. */
const ROW_HEIGHT_PX = 126;

export function TaskCalendarGrid({
  monthKey,
  clientToday,
  selectedDate,
  onSelectDate,
  daysByDate,
  cellContentLoading,
  onOpenTask,
  onNavigateToDailyKanban,
  showEmptyDayAddTask = true,
}: {
  monthKey: string;
  clientToday: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  daysByDate: Map<string, TaskCalendarDayBucketDto>;
  /** True while this month has no response yet. Cells stay mounted; only their contents shimmer. */
  cellContentLoading: boolean;
  onOpenTask: (task: TaskCalendarTaskDto) => void;
  onNavigateToDailyKanban: (date: string) => void;
  showEmptyDayAddTask?: boolean;
}) {
  const cells = buildMonthGrid(monthKey);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px] overflow-hidden rounded-lg bg-card shadow-sm">
        <TaskCalendarWeekHeader />
        <div
          className="grid grid-cols-7"
          style={{ gridAutoRows: `${ROW_HEIGHT_PX}px` }}
        >
          {cells.map((cell, index) => {
            const bucket = daysByDate.get(cell.date);
            const tasks = bucket?.tasks ?? [];
            const assigneeFallback =
              tasks.length > 0 ? new Set(tasks.flatMap((t) => t.assigneeEmployeeIds)).size : 0;
            const column = index % 7;
            return (
              <TaskCalendarDayCell
                key={cell.date}
                date={cell.date}
                displayMonthKey={monthKey}
                clientToday={clientToday}
                isSunday={column === 0}
                isToday={cell.date === clientToday}
                isSelected={cell.date === selectedDate}
                isFirstCol={column === 0}
                taskCount={bucket?.taskCount ?? tasks.length}
                assigneeCount={bucket?.distinctAssigneeCount ?? assigneeFallback}
                tasks={cellContentLoading ? [] : tasks}
                contentLoading={cellContentLoading}
                onOpenTask={onOpenTask}
                onSelectDate={onSelectDate}
                onNavigateToDailyKanban={onNavigateToDailyKanban}
                showEmptyDayAddTask={showEmptyDayAddTask}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
