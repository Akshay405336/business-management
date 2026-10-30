'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCallback, useState, type ReactNode } from 'react';
import { stageKanbanColumnTheme } from '@/features/admin/crm/utils/stage-color';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import { moveDailyTaskStage } from '../api/daily-tasks';
import type { DailyTaskBoardColumn, DailyTaskBoardResponse, DailyTaskListItem } from '../types';
import { colorTokenToHex } from '../utils/color-token';
import { DailyTaskKanbanCard } from './daily-task-card';

function TaskKanbanColumn({
  column,
  isDropTarget,
  onAddTask,
  children,
}: {
  column: DailyTaskBoardColumn;
  isDropTarget?: boolean;
  onAddTask: () => void;
  children: ReactNode;
}) {
  const stage = column.stage;
  const theme = stageKanbanColumnTheme(colorTokenToHex(stage.colorToken));
  const columnBackground = theme.column.backgroundColor ?? 'transparent';
  const headerBackground = theme.header.backgroundColor ?? 'transparent';
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 shrink-0 self-stretch">
      <div
        className={cn(
          'flex h-full min-h-0 w-[18.5rem] shrink-0 flex-col overflow-hidden rounded-xl shadow-[0_2px_16px_-6px_rgb(15_23_42_/_0.12)] transition-[box-shadow,ring-color]',
          (isDropTarget || isOver) && 'ring-primary/30 ring-2',
        )}
        style={theme.column}
      >
        <div className="flex items-start gap-2 px-3 pt-2.5 pb-1" style={theme.header}>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: colorTokenToHex(stage.colorToken) }}
              aria-hidden
            />
            <h3 className="text-foreground truncate text-base font-semibold tracking-tight">{stage.name}</h3>
            <span className="bg-card/95 text-foreground/80 rounded-full border border-black/5 px-2 py-0.5 text-[11px] font-medium tabular-nums shadow-xs">
              {column.tasks.length}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 rounded-lg border-dashed border-black/15 bg-card/80 shadow-none hover:bg-card"
            aria-label={`Add task to ${stage.name}`}
            onClick={onAddTask}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div
          aria-hidden
          className="h-2 shrink-0"
          style={{
            background: `linear-gradient(to bottom, ${headerBackground}, ${columnBackground})`,
          }}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-x-visible overflow-y-auto px-2.5 pt-1 pb-2.5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DailyTaskKanbanBoard({
  board,
  onRefresh,
  onOpenTask,
  onEditTask,
  onRescheduleTask,
  onAssignTask,
  onManageWorkflow,
}: {
  board: DailyTaskBoardResponse;
  onRefresh: () => void | Promise<void>;
  onOpenTask: (task: DailyTaskListItem) => void;
  onEditTask: (task: DailyTaskListItem) => void;
  onRescheduleTask: (task: DailyTaskListItem) => void;
  onAssignTask: (workflowStageId: string) => void;
  onManageWorkflow: () => void;
}) {
  const toast = useAdminToast();
  const [activeTask, setActiveTask] = useState<DailyTaskListItem | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const taskById = useCallback(() => {
    const map = new Map<string, DailyTaskListItem>();
    for (const col of board.columns) {
      for (const task of col.tasks) map.set(task.id, task);
    }
    return map;
  }, [board.columns]);

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveTask(taskById().get(id) ?? null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    setOverStageId(null);
    const taskId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || overId.startsWith('orphan::')) return;
    const task = taskById().get(taskId);
    if (!task) return;
    const targetColumn = board.columns.find((col) => col.stage.id === overId);
    if (!targetColumn) return;

    const currentStageId = task.workflowStageId;
    if (currentStageId === overId) return;

    try {
      await moveDailyTaskStage(taskId, { workflowStageId: overId });
      await onRefresh();
    } catch {
      toast.error('Could not update task stage.');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        const overId = event.over?.id ? String(event.over.id) : null;
        setOverStageId(overId);
      }}
      onDragEnd={(e) => void onDragEnd(e)}
      onDragCancel={() => {
        setActiveTask(null);
        setOverStageId(null);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="text-foreground text-sm font-semibold tracking-tight">Daily workflow</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="size-8" aria-label="Board options">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onManageWorkflow}>Manage workflow stages</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        role="region"
        aria-label="Task kanban board"
        className="flex min-h-[min(32rem,calc(100vh-14rem))] items-stretch gap-4 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {board.columns.map((column) => (
          <TaskKanbanColumn
            key={column.stage.id}
            column={column}
            isDropTarget={overStageId === column.stage.id}
            onAddTask={() => onAssignTask(column.stage.id)}
          >
            {column.tasks.length === 0 ? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-black/15 bg-card/50 px-2 py-6 text-center text-xs">
                No tasks for this date
              </div>
            ) : (
              column.tasks.map((task) => (
                <DailyTaskKanbanCard
                  key={task.id}
                  task={task}
                  columnStageName={column.stage.name}
                  onOpen={onOpenTask}
                  onEdit={onEditTask}
                  onReschedule={onRescheduleTask}
                  onChanged={onRefresh}
                />
              ))
            )}
          </TaskKanbanColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <DailyTaskKanbanCard task={activeTask} onOpen={() => {}} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
