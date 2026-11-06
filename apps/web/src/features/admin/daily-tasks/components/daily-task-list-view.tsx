'use client';

import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
  type DataTableSkeletonColumn,
} from '@/features/admin/components/data-table';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { DailyTaskAssigneeAvatarGroup } from './daily-task-assignee-avatar-group';
import type { DailyTaskListItem, DailyTaskListResponse } from '../types';
import { priorityBadgeClass } from '../utils/stage-colors';

const DAILY_TASKS_LIST_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: 'w-[min(28%,14rem)] min-w-[8rem] max-w-[14rem]' },
  { variant: 'text', className: 'w-[5.5rem]' },
  { variant: 'icon', className: 'w-[7rem]' },
  { variant: 'badge', className: 'w-[5.5rem]' },
  { variant: 'text', className: 'w-[min(14%,8rem)] min-w-[6rem]' },
  { variant: 'text', className: 'w-[6.5rem]' },
  { variant: 'text', className: 'w-[6.5rem]' },
  { variant: 'actions', className: 'w-[4.5rem]', headClassName: 'text-right' },
];

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

  const tablePhase = deriveDataTablePhase({
    loading,
    error: null,
    rowCount: items.length,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  return (
    <DataTable
      frame="flush"
      headerVariant="plain"
      className="min-w-0 max-w-full gap-0"
      tableClassName="table-fixed min-w-[52rem] [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
      tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
      phase={tablePhase}
      colSpan={8}
      skeletonColumns={DAILY_TASKS_LIST_SKELETON}
      header={
        <TableRow className="hover:bg-transparent">
          <TableHead className="font-medium">Task</TableHead>
          <TableHead className="font-medium">Type</TableHead>
          <TableHead className="font-medium">Assignees</TableHead>
          <TableHead className="font-medium">Priority</TableHead>
          <TableHead className="font-medium">Workflow Status</TableHead>
          <TableHead className="font-medium">Assigned</TableHead>
          <TableHead className="font-medium">Due</TableHead>
          <TableHead className="text-right font-medium">
            <span className="sr-only">Actions</span>
            Actions
          </TableHead>
        </TableRow>
      }
      empty={{
        icon: ClipboardList,
        title: 'No tasks match your filters',
        description:
          'Try adjusting your search or filters, or choose another date to see tasks in this list.',
      }}
      refreshing={tableRefreshing}
      footer={
        <TablePagination
          className="border-border border-t px-4 py-3 sm:px-5"
          page={page}
          pageSize={pageSize}
          total={total}
          loading={tablePhase === 'initial-loading'}
          hideWhenEmpty={false}
          pageSizeOptions={[10, 20, 25, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      }
    >
      {items.map((task) => (
        <TableRow key={task.id} className="border-0">
          <TableCell className="align-middle whitespace-normal">
            <button
              type="button"
              className="text-foreground block max-w-full truncate text-left font-medium hover:underline"
              onClick={() => onOpenTask(task)}
              title={task.title}
            >
              {task.title}
            </button>
          </TableCell>
          <TableCell className="text-muted-foreground align-middle whitespace-nowrap">
            {task.type === 'PROJECT' ? 'Project' : 'General'}
          </TableCell>
          <TableCell className="align-middle">
            <DailyTaskAssigneeAvatarGroup
              assignees={task.assignees}
              employeeSelfView={employeeMode}
              emptyFallback={
                <span className="text-muted-foreground text-xs italic">
                  {employeeMode ? '—' : 'Unassigned'}
                </span>
              }
            />
          </TableCell>
          <TableCell className="align-middle">
            <span className={cnBadge(priorityBadgeClass(task.priority))}>{task.priority}</span>
          </TableCell>
          <TableCell
            className="text-muted-foreground max-w-[8rem] truncate align-middle"
            title={task.workflowStageName ?? task.stageName}
          >
            {task.workflowStageName ?? task.stageName}
          </TableCell>
          <TableCell className="text-muted-foreground align-middle tabular-nums whitespace-nowrap">
            {task.assignDate}
          </TableCell>
          <TableCell className="text-muted-foreground align-middle tabular-nums whitespace-nowrap">
            {task.dueDate ?? '—'}
          </TableCell>
          <TableCell className="text-right align-middle">
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => onOpenTask(task)}>
              View
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </DataTable>
  );
}

function cnBadge(className: string) {
  return `inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${className}`;
}
