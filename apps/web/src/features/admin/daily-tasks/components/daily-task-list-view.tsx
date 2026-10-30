'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeAvatar } from '@/features/admin/employees/components/employee-avatar';
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
}: {
  data: DailyTaskListResponse | null;
  loading: boolean;
  error: boolean;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry: () => void;
  onOpenTask: (task: DailyTaskListItem) => void;
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (items.length === 0) {
    return <p className="text-muted-foreground py-16 text-center text-sm">No tasks match your filters.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 font-medium">Task</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Project</th>
              <th className="px-3 py-2.5 font-medium">Assignees</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Workflow status</th>
              <th className="px-3 py-2.5 font-medium">Project stage</th>
              <th className="px-3 py-2.5 font-medium">Assigned</th>
              <th className="px-3 py-2.5 font-medium">Due</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {items.map((task) => (
              <tr key={task.id} className="border-border border-t hover:bg-muted/20">
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="font-medium text-foreground hover:underline"
                    onClick={() => onOpenTask(task)}
                  >
                    {task.title}
                  </button>
                </td>
                <td className="text-muted-foreground px-3 py-2.5">{task.type === 'PROJECT' ? 'Project' : 'General'}</td>
                <td className="text-muted-foreground max-w-[140px] truncate px-3 py-2.5">{task.projectName ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, 3).map((a) => (
                      <EmployeeAvatar
                        key={a.id}
                        displayName={a.displayName}
                        profileImageUrl={a.profileImageUrl}
                        className="border-background size-7 border-2"
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cnBadge(priorityBadgeClass(task.priority))}>{task.priority}</span>
                </td>
                <td className="text-muted-foreground px-3 py-2.5">
                  {task.workflowStageName ?? task.stageName}
                </td>
                <td className="text-muted-foreground px-3 py-2.5">{task.projectPhaseName ?? '—'}</td>
                <td className="text-muted-foreground px-3 py-2.5">{task.assignDate}</td>
                <td className="text-muted-foreground px-3 py-2.5">{task.dueDate ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onOpenTask(task)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">
          {total} task{total === 1 ? '' : 's'} · page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function cnBadge(className: string) {
  return `inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${className}`;
}
