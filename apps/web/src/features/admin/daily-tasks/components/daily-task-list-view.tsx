'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { DailyTaskAssigneeAvatarGroup } from './daily-task-assignee-avatar-group';
import type { DailyTaskListItem, DailyTaskListResponse } from '../types';
import { priorityBadgeClass } from '../utils/stage-colors';

export function DailyTaskListView({
  data,
  loading,
  error,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onOpenTask,
  employeeMode = false,
}: {
  data: DailyTaskListResponse | null;
  loading: boolean;
  error: boolean;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry: () => void;
  onOpenTask: (task: DailyTaskListItem) => void;
  employeeMode?: boolean;
}) {
  if (loading && !data) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading tasks…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-rose-700">Could not load tasks.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;

  if (items.length === 0) {
    return <p className="text-muted-foreground py-16 text-center text-sm">No tasks match your filters.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full min-w-0 table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[min(28%,14rem)]" />
            <col className="w-[5.5rem]" />
            <col className="w-[7rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[min(14%,8rem)]" />
            <col className="w-[6.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[4.5rem]" />
          </colgroup>
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 font-medium">Task</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Assignees</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Workflow status</th>
              <th className="px-3 py-2.5 font-medium">Assigned</th>
              <th className="px-3 py-2.5 font-medium">Due</th>
              <th className="px-3 py-2.5 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((task) => (
              <tr key={task.id} className="border-border border-t hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="text-foreground block max-w-full truncate text-left font-medium hover:underline"
                    onClick={() => onOpenTask(task)}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                </td>
                <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                  {task.type === 'PROJECT' ? 'Project' : 'General'}
                </td>
                <td className="px-3 py-2.5">
                  <DailyTaskAssigneeAvatarGroup
                    assignees={task.assignees}
                    employeeSelfView={employeeMode}
                    emptyFallback={
                      <span className="text-muted-foreground text-xs italic">
                        {employeeMode ? '—' : 'Unassigned'}
                      </span>
                    }
                  />
                </td>
                <td className="px-3 py-2.5">
                  <span className={cnBadge(priorityBadgeClass(task.priority))}>{task.priority}</span>
                </td>
                <td className="text-muted-foreground truncate px-3 py-2.5" title={task.workflowStageName ?? task.stageName}>
                  {task.workflowStageName ?? task.stageName}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 tabular-nums whitespace-nowrap">
                  {task.assignDate}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 tabular-nums whitespace-nowrap">
                  {task.dueDate ?? '—'}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => onOpenTask(task)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        hideWhenEmpty={false}
        pageSizeOptions={[10, 20, 25, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        className="pt-1"
      />
    </div>
  );
}

function cnBadge(className: string) {
  return `inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${className}`;
}
