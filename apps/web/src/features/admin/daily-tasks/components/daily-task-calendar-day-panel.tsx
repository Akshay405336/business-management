'use client';

import { Plus, Pencil, Eye, CalendarClock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DailyTaskAssigneeAvatarGroup } from './daily-task-assignee-avatar-group';
import { cn } from '@/shared/lib/utils';
import type { DailyTaskListItem } from '../types';
import {
  computeDayTaskSummary,
  taskStatusBucket,
  type TaskStatusBucket,
} from '../utils/task-metrics';
import { priorityBadgeClass } from '../utils/stage-colors';

const STATUS_LABEL: Record<TaskStatusBucket, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  pending: 'Pending',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function groupByEmployee(tasks: readonly DailyTaskListItem[]) {
  const groups = new Map<string, { label: string; tasks: DailyTaskListItem[] }>();
  const unassigned: DailyTaskListItem[] = [];
  for (const task of tasks) {
    if (task.assignees.length === 0) {
      unassigned.push(task);
      continue;
    }
    for (const a of task.assignees) {
      const key = a.employeeId;
      const g = groups.get(key) ?? { label: a.displayName, tasks: [] };
      if (!groups.has(key)) groups.set(key, g);
      if (!g.tasks.some((t) => t.id === task.id)) g.tasks.push(task);
    }
  }
  const sorted = [...groups.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  return { sorted, unassigned };
}

function groupByProject(tasks: readonly DailyTaskListItem[]) {
  const map = new Map<string, { label: string; tasks: DailyTaskListItem[] }>();
  for (const task of tasks) {
    const key = task.projectId ?? '__none__';
    const label = task.projectName ?? 'No project';
    const g = map.get(key) ?? { label, tasks: [] };
    if (!map.has(key)) map.set(key, g);
    g.tasks.push(task);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function TaskRow({
  task,
  onView,
  onEdit,
  onReschedule,
  onDelete,
  canEdit,
  canDelete,
  employeeMode = false,
}: {
  task: DailyTaskListItem;
  onView: () => void;
  onEdit?: () => void;
  onReschedule?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  employeeMode?: boolean;
}) {
  const bucket = taskStatusBucket(task);
  const time =
    task.startTimeMinutes != null
      ? formatMinutes(task.startTimeMinutes)
      : task.dueTimeMinutes != null
        ? formatMinutes(task.dueTimeMinutes)
        : null;

  return (
    <article className="border-border bg-card rounded-lg border p-3 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h5 className="text-sm font-semibold leading-snug">{task.title}</h5>
          {task.description ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{task.description}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
            priorityBadgeClass(task.priority),
          )}
        >
          {task.priority}
        </span>
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <span>{task.type === 'PROJECT' ? 'Project' : 'General'}</span>
        <span>{STATUS_LABEL[bucket]}</span>
        {task.projectName ? <span>{task.projectName}</span> : null}
        {time ? <span>{time}</span> : null}
        {task.dueDate ? <span>Due {task.dueDate}</span> : null}
        {task.completedAt ? <span className="text-emerald-700">Completed</span> : null}
      </div>
      <div className="mt-2 flex items-center">
        <DailyTaskAssigneeAvatarGroup
          assignees={task.assignees}
          employeeSelfView={employeeMode}
          emptyFallback={
            <span className="text-muted-foreground text-[11px] italic">Unassigned</span>
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={onView}>
          <Eye className="size-3.5" aria-hidden />
          View
        </Button>
        {canEdit && onEdit ? (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}
        {canEdit && onReschedule ? (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onReschedule}>
            <CalendarClock className="size-3.5" aria-hidden />
            Reschedule
          </Button>
        ) : null}
        {canDelete && onDelete ? (
          <Button type="button" variant="outline" size="sm" className="h-8 text-rose-700" onClick={onDelete}>
            <Trash2 className="size-3.5" aria-hidden />
            Delete
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function DailyTaskCalendarDayPanel({
  open,
  date,
  tasks,
  onOpenChange,
  onViewTask,
  onEditTask,
  onRescheduleTask,
  onDeleteTask,
  onCreateTask,
  canAssign,
  canDelete,
  employeeMode = false,
}: {
  open: boolean;
  date: string | null;
  tasks: readonly DailyTaskListItem[];
  onOpenChange: (open: boolean) => void;
  onViewTask: (task: DailyTaskListItem) => void;
  onEditTask?: (task: DailyTaskListItem) => void;
  onRescheduleTask?: (task: DailyTaskListItem) => void;
  onDeleteTask?: (task: DailyTaskListItem) => void;
  onCreateTask?: (date: string) => void;
  canAssign: boolean;
  canDelete: boolean;
  employeeMode?: boolean;
}) {
  const dayTasks = date ? tasks.filter((t) => t.assignDate === date) : [];
  const summary = computeDayTaskSummary(dayTasks);
  const byEmployee = groupByEmployee(dayTasks);
  const byProject = groupByProject(dayTasks);
  const byStatus = (['overdue', 'in_progress', 'pending', 'completed', 'cancelled'] as const).map(
    (key) => ({
      key,
      tasks: dayTasks.filter((t) => taskStatusBucket(t) === key),
    }),
  );

  const [groupTab, setGroupTab] = useState<'employee' | 'project' | 'status'>('employee');

  const dateLabel = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-xl">
        <div className="border-b px-6 py-4">
          <SheetTitle className="text-left">{dateLabel || 'Day details'}</SheetTitle>
          {date ? (
            <p className="text-muted-foreground mt-1 text-xs">
              {summary.total} tasks · {summary.completed} completed · {summary.inProgress} in progress ·{' '}
              {summary.pending} pending
              {summary.overdue > 0 ? ` · ${summary.overdue} overdue` : ''} · {summary.completionPercent}%
              complete
            </p>
          ) : null}
          {canAssign && date && onCreateTask ? (
            <Button type="button" size="sm" className="mt-3 h-8" onClick={() => onCreateTask(date)}>
              <Plus className="size-3.5" aria-hidden />
              Create task
            </Button>
          ) : null}
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {dayTasks.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No tasks scheduled for this day.</p>
          ) : (
            <>
              <Tabs value={groupTab} onValueChange={(v) => setGroupTab(v as typeof groupTab)}>
                <TabsList className="h-8 w-full">
                  <TabsTrigger value="employee" className="flex-1 text-xs">
                    Employee
                  </TabsTrigger>
                  <TabsTrigger value="project" className="flex-1 text-xs">
                    Project
                  </TabsTrigger>
                  <TabsTrigger value="status" className="flex-1 text-xs">
                    Status
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {groupTab === 'employee' ? (
                <div className="space-y-3 pt-2">
                  {byEmployee.unassigned.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-xs font-medium">Unassigned</p>
                      <div className="space-y-2">
                        {byEmployee.unassigned.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onView={() => onViewTask(task)}
                            onEdit={onEditTask ? () => onEditTask(task) : undefined}
                            onReschedule={onRescheduleTask ? () => onRescheduleTask(task) : undefined}
                            onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
                            canEdit={canAssign}
                            canDelete={canDelete}
                            employeeMode={employeeMode}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {byEmployee.sorted.map(([id, group]) => (
                    <div key={id}>
                      <p className="mb-1.5 text-xs font-medium">{group.label}</p>
                      <div className="space-y-2">
                        {group.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onView={() => onViewTask(task)}
                            onEdit={onEditTask ? () => onEditTask(task) : undefined}
                            onReschedule={onRescheduleTask ? () => onRescheduleTask(task) : undefined}
                            onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
                            canEdit={canAssign}
                            canDelete={canDelete}
                            employeeMode={employeeMode}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {groupTab === 'project' ? (
                <div className="space-y-3 pt-2">
                  {byProject.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 text-xs font-medium">{group.label}</p>
                      <div className="space-y-2">
                        {group.tasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onView={() => onViewTask(task)}
                            onEdit={onEditTask ? () => onEditTask(task) : undefined}
                            onReschedule={onRescheduleTask ? () => onRescheduleTask(task) : undefined}
                            onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
                            canEdit={canAssign}
                            canDelete={canDelete}
                            employeeMode={employeeMode}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {groupTab === 'status' ? (
                <div className="space-y-3 pt-2">
                  {byStatus
                    .filter((g) => g.tasks.length > 0)
                    .map((group) => (
                      <div key={group.key}>
                        <p className="mb-1.5 text-xs font-medium">{STATUS_LABEL[group.key]}</p>
                        <div className="space-y-2">
                          {group.tasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              onView={() => onViewTask(task)}
                              onEdit={onEditTask ? () => onEditTask(task) : undefined}
                              onReschedule={onRescheduleTask ? () => onRescheduleTask(task) : undefined}
                              onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
                              canEdit={canAssign}
                              canDelete={canDelete}
                              employeeMode={employeeMode}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
