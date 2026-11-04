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
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { stageKanbanColumnTheme } from '@/features/admin/crm/utils/stage-color';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import { hasDailyTaskUpdateStatusPermission } from '@techwin/contracts';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { isApiError } from '@/shared/api/api-error';
import { moveDailyTaskStage } from '../api/daily-tasks';
import type { DailyTaskBoardColumn, DailyTaskBoardResponse, DailyTaskListItem } from '../types';
import { colorTokenToHex } from '../utils/color-token';
import {
  buildDailyTaskKanbanItems,
  buildDailyTaskMap,
  dailyTaskKanbanColumnStartId,
  insertIndexInDailyTaskColumn,
  kanbanBeforeTaskId,
  resolveDailyTaskDropStageId,
  type DailyTaskKanbanItemsByStage,
} from '../utils/kanban-items';
import { DailyTaskKanbanCard } from './daily-task-card';

function KanbanColumnStartDrop({ stageId, active }: { stageId: string; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: dailyTaskKanbanColumnStartId(stageId) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        '-mt-0.5 min-h-1 shrink-0 rounded-sm transition-colors',
        active && (isOver ? 'bg-primary/20' : 'bg-transparent'),
      )}
      aria-hidden="true"
    />
  );
}

function TaskKanbanColumn({
  column,
  taskCount,
  isDropTarget,
  onAddTask,
  children,
}: {
  column: DailyTaskBoardColumn;
  taskCount: number;
  isDropTarget?: boolean;
  onAddTask?: () => void;
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
              {taskCount}
            </span>
          </div>
          {onAddTask ? (
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
          ) : null}
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

function detailToListItem(
  detail: Awaited<ReturnType<typeof moveDailyTaskStage>>,
  previous: DailyTaskListItem,
): DailyTaskListItem {
  return {
    ...previous,
    workflowStageId: detail.workflowStageId,
    workflowStageName: detail.workflowStageName ?? previous.workflowStageName,
    stageName: detail.workflowStageName ?? detail.stageName ?? previous.stageName,
    completedAt: detail.completedAt,
    updatedAt: detail.updatedAt,
    isOverdue: detail.isOverdue,
  };
}

export function DailyTaskKanbanBoard({
  board,
  onRefresh,
  onOpenTask,
  onEditTask,
  onRescheduleTask,
  onAssignTask,
  onManageWorkflow,
  employeeMode = false,
  canUpdateStatus: canUpdateStatusProp,
}: {
  board: DailyTaskBoardResponse;
  onRefresh: () => void | Promise<void>;
  onOpenTask: (task: DailyTaskListItem) => void;
  onEditTask: (task: DailyTaskListItem) => void;
  onRescheduleTask: (task: DailyTaskListItem) => void;
  onAssignTask?: (workflowStageId: string) => void;
  onManageWorkflow?: () => void;
  employeeMode?: boolean;
  canUpdateStatus?: boolean;
}) {
  const toast = useAdminToast();
  const { permissionSet, has } = usePermissions();
  const canUpdateStatus =
    canUpdateStatusProp ??
    (has('tasks.update') || hasDailyTaskUpdateStatusPermission(permissionSet));

  const stageIds = useMemo(
    () => board.columns.map((column) => column.stage.id),
    [board.columns],
  );
  const [items, setItems] = useState<DailyTaskKanbanItemsByStage>(() =>
    buildDailyTaskKanbanItems(board.columns),
  );
  const [tasksById, setTasksById] = useState(() => buildDailyTaskMap(board));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<ReadonlySet<string>>(() => new Set());

  const isDraggingRef = useRef(false);
  const dragOriginStageRef = useRef<Map<string, string>>(new Map());
  const itemsAtDragStartRef = useRef<DailyTaskKanbanItemsByStage | null>(null);
  const moveGenerationRef = useRef(0);
  const pendingTaskIdsRef = useRef<ReadonlySet<string>>(new Set());
  pendingTaskIdsRef.current = pendingTaskIds;

  const syncFromBoard = useCallback(
    (source: DailyTaskBoardResponse) => {
      const serverItems = buildDailyTaskKanbanItems(source.columns);
      const serverTasks = buildDailyTaskMap(source);

      const pending = pendingTaskIdsRef.current;
      if (pending.size === 0) {
        setItems(serverItems);
        setTasksById(serverTasks);
        return;
      }

      setItems((previous) => {
        const next: DailyTaskKanbanItemsByStage = {};
        for (const stageId of stageIds) {
          next[stageId] = [...(serverItems[stageId] ?? [])];
        }
        for (const taskId of pending) {
          for (const stageId of Object.keys(next)) {
            next[stageId] = (next[stageId] ?? []).filter((id) => id !== taskId);
          }
          for (const [stageId, ids] of Object.entries(previous)) {
            if (ids.includes(taskId)) {
              next[stageId] = [...(next[stageId] ?? []), taskId];
              break;
            }
          }
        }
        return next;
      });

      setTasksById((previous) => {
        const next = new Map(serverTasks);
        for (const taskId of pending) {
          const local = previous.get(taskId);
          if (local) next.set(taskId, local);
        }
        return next;
      });
    },
    [stageIds],
  );

  useEffect(() => {
    if (isDraggingRef.current) return;
    syncFromBoard(board);
  }, [board, syncFromBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: canUpdateStatus ? 6 : 9999 },
    }),
  );

  const findContainer = useCallback(
    (id: string) => resolveDailyTaskDropStageId(id, stageIds, items),
    [items, stageIds],
  );

  const onDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true;
    itemsAtDragStartRef.current = Object.fromEntries(
      Object.entries(items).map(([stageId, ids]) => [stageId, [...ids]]),
    );
    const taskId = String(event.active.id);
    setActiveId(taskId);
    const origin = findContainer(taskId);
    if (origin) dragOriginStageRef.current.set(taskId, origin);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !canUpdateStatus) return;

    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;
    setOverStageId(overContainer);

    if (activeContainer === overContainer) return;

    setItems((current) => {
      const activeItems = [...(current[activeContainer] ?? [])];
      const overItems = [...(current[overContainer] ?? [])];
      const activeIndex = activeItems.indexOf(String(active.id));
      const movedId = activeItems[activeIndex];
      if (activeIndex < 0 || movedId === undefined) return current;

      overItems.splice(
        insertIndexInDailyTaskColumn(String(over.id), overContainer, overItems),
        0,
        movedId,
      );
      activeItems.splice(activeIndex, 1);
      return {
        ...current,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });

  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    isDraggingRef.current = false;
    setActiveId(null);
    setOverStageId(null);

    if (!over || !canUpdateStatus) return;

    const taskId = String(active.id);
    const activeContainer = findContainer(taskId);
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;

    const task = tasksById.get(taskId);
    if (!task) return;

    const originStageId = dragOriginStageRef.current.get(taskId) ?? activeContainer;
    dragOriginStageRef.current.delete(taskId);

    let nextItems = items;
    if (activeContainer === overContainer) {
      const columnItems = [...(items[activeContainer] ?? [])];
      const oldIndex = columnItems.indexOf(taskId);
      const overId = String(over.id);
      let newIndex = insertIndexInDailyTaskColumn(overId, activeContainer, columnItems);
      if (overId === activeContainer && newIndex >= columnItems.length) {
        newIndex = columnItems.length - 1;
      }
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        nextItems = {
          ...items,
          [activeContainer]: arrayMove(columnItems, oldIndex, newIndex),
        };
        setItems(nextItems);
      }
    }

    const orderedIds = nextItems[overContainer] ?? [];
    const beforeTaskId = kanbanBeforeTaskId(orderedIds, taskId);
    const priorOrder = itemsAtDragStartRef.current?.[overContainer] ?? [];
    itemsAtDragStartRef.current = null;

    const stageChanged = originStageId !== overContainer;
    if (!stageChanged && priorOrder.join(',') === orderedIds.join(',')) {
      return;
    }

    if (pendingTaskIdsRef.current.has(taskId)) return;

    const markPending = () => {
      setPendingTaskIds((current) => new Set(current).add(taskId));
    };
    const clearPending = () => {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    };

    const generation = ++moveGenerationRef.current;
    markPending();
    try {
      const detail = await moveDailyTaskStage(taskId, {
        workflowStageId: overContainer,
        beforeTaskId,
      });
      if (generation !== moveGenerationRef.current) return;
      setTasksById((current) => {
        const previous = current.get(taskId);
        if (!previous) return current;
        const next = new Map(current);
        next.set(taskId, detailToListItem(detail, previous));
        return next;
      });
      void onRefresh();
    } catch (error) {
      if (generation === moveGenerationRef.current) {
        syncFromBoard(board);
        const message = isApiError(error) ? error.message : 'Could not update task order.';
        toast.error(message);
      }
    } finally {
      clearPending();
    }
  };

  const onDragCancel = () => {
    isDraggingRef.current = false;
    if (activeId) dragOriginStageRef.current.delete(activeId);
    setActiveId(null);
    setOverStageId(null);
    syncFromBoard(board);
  };

  const activeTask = activeId ? tasksById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(event) => void onDragEnd(event)}
      onDragCancel={onDragCancel}
    >
      {employeeMode && !canUpdateStatus ? (
        <p className="text-muted-foreground mb-2 px-1 text-xs">
          Status updates are disabled for your role. You can view assigned tasks but cannot reorder or
          move them between stages.
        </p>
      ) : null}
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="text-foreground text-sm font-semibold tracking-tight">Daily workflow</p>
        {onManageWorkflow ? (
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
        ) : null}
      </div>
      <div
        role="region"
        aria-label="Task kanban board"
        className="flex min-h-[min(32rem,calc(100vh-14rem))] items-stretch gap-4 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {board.columns.map((column) => {
          const stageTaskIds = items[column.stage.id] ?? [];
          return (
            <TaskKanbanColumn
              key={column.stage.id}
              column={column}
              taskCount={stageTaskIds.length}
              isDropTarget={overStageId === column.stage.id}
              onAddTask={onAssignTask ? () => onAssignTask(column.stage.id) : undefined}
            >
              <SortableContext items={stageTaskIds} strategy={verticalListSortingStrategy}>
                <div className="flex min-h-0 flex-1 flex-col gap-2.5">
                  <KanbanColumnStartDrop stageId={column.stage.id} active={Boolean(activeId)} />
                  {stageTaskIds.length === 0 ? (
                    <div
                      className={cn(
                        'text-muted-foreground flex flex-1 flex-col items-center justify-center rounded-md border border-dashed px-2 py-6 text-center text-xs',
                        overStageId === column.stage.id
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-black/15 bg-card/50',
                      )}
                    >
                      No tasks for this date — drop here
                    </div>
                  ) : (
                    stageTaskIds.map((taskId) => {
                      const task = tasksById.get(taskId);
                      if (!task) return null;
                      return (
                        <DailyTaskKanbanCard
                          key={taskId}
                          task={task}
                          columnStageName={column.stage.name}
                          employeeMode={employeeMode}
                          dragDisabled={!canUpdateStatus || pendingTaskIds.has(taskId)}
                          onOpen={onOpenTask}
                          onEdit={onEditTask}
                          onReschedule={onRescheduleTask}
                          onChanged={onRefresh}
                        />
                      );
                    })
                  )}
                </div>
              </SortableContext>
            </TaskKanbanColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="pointer-events-none w-[17rem] rotate-[0.5deg] opacity-95 shadow-lg">
            <DailyTaskKanbanCard task={activeTask} onOpen={() => {}} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
