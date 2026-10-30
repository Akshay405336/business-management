'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { DailyTaskListItem } from '../types';
import { localDateInputValue } from '../utils/local-date';

function monthRange(year: number, monthIndex: number): { from: string; to: string; weeks: (string | null)[][] } {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const from = localDateInputValue(first);
  const to = localDateInputValue(last);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(localDateInputValue(new Date(year, monthIndex, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { from, to, weeks };
}

export function DailyTaskCalendarView({
  anchorDate,
  tasks,
  onAnchorChange,
  onSelectDate,
  onOpenTask,
  onCreateForDate,
}: {
  anchorDate: string;
  tasks: readonly DailyTaskListItem[];
  onAnchorChange: (date: string) => void;
  onSelectDate: (date: string) => void;
  onOpenTask: (task: DailyTaskListItem) => void;
  onCreateForDate: (date: string) => void;
}) {
  const monthKey = anchorDate.slice(0, 7);
  const { weeks, monthLabelDate } = useMemo(() => {
    const parsed = new Date(`${monthKey}-01T12:00:00`);
    const year = parsed.getFullYear();
    const monthIndex = parsed.getMonth();
    return { ...monthRange(year, monthIndex), monthLabelDate: parsed };
  }, [monthKey]);

  const byDate = useMemo(() => {
    const map = new Map<string, DailyTaskListItem[]>();
    for (const task of tasks) {
      const list = map.get(task.assignDate) ?? [];
      list.push(task);
      map.set(task.assignDate, list);
    }
    return map;
  }, [tasks]);

  const monthLabel = monthLabelDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const clientToday = localDateInputValue();

  const shiftMonth = (delta: number) => {
    const d = new Date(`${monthKey}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    onAnchorChange(localDateInputValue(d));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => shiftMonth(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <h3 className="ml-2 text-sm font-semibold">{monthLabel}</h3>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onAnchorChange(clientToday)}>
          Today
        </Button>
      </div>
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="bg-muted/40 text-muted-foreground grid grid-cols-7 text-center text-xs font-medium">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="border-border border-b px-1 py-2">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((dateKey, di) => {
              if (!dateKey) {
                return <div key={`${wi}-${di}`} className="border-border min-h-[88px] border-b border-r bg-muted/10" />;
              }
              const dayTasks = byDate.get(dateKey) ?? [];
              const isSelected = dateKey === anchorDate;
              const isToday = dateKey === clientToday;
              return (
                <div
                  key={dateKey}
                  className={cn(
                    'border-border min-h-[88px] border-b border-r p-1.5',
                    isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'mb-1 flex size-7 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-neutral-900 text-white',
                      !isToday && 'hover:bg-muted',
                    )}
                    onClick={() => onSelectDate(dateKey)}
                  >
                    {Number(dateKey.slice(8, 10))}
                  </button>
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className={cn(
                          'block w-full truncate rounded px-1 py-0.5 text-left text-[10px]',
                          task.type === 'PROJECT' ? 'bg-violet-50 text-violet-900' : 'bg-slate-100 text-slate-800',
                        )}
                        onClick={() => onOpenTask(task)}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 ? (
                      <p className="text-muted-foreground text-[10px]">+{dayTasks.length - 3} more</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground mt-1 text-[10px] hover:text-foreground"
                    onClick={() => onCreateForDate(dateKey)}
                  >
                    + Add
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
