'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Inbox, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ProjectTask, ProjectTaskBoardPhase } from '../types';
import {
  buildKanbanTaskItems,
  kanbanBeforeTaskId,
  type KanbanTasksByPhase,
} from '../utils/kanban-items';
import { ProjectTaskKanbanCard, SortableProjectTaskKanbanCard } from './project-task-kanban-card';
import { projectPlanPhaseTheme } from '../utils/plan-phase-theme';
import { ProjectTaskPhaseColumn } from './project-task-phase-column';

const columnStartId = (phaseId: string) => `${phaseId}::start`;

const PLAN_COLUMN_PREFIX = 'plan-column::';

function planColumnSortableId(phaseId: string) {
  return `${PLAN_COLUMN_PREFIX}${phaseId}`;
}

function parsePlanColumnSortableId(id: string): string | null {
  if (!id.startsWith(PLAN_COLUMN_PREFIX)) return null;
  return id.slice(PLAN_COLUMN_PREFIX.length);
}

/** Map any droppable/sortable id under a phase column to that phase's id. */
function resolvePhaseColumnTarget(
  overId: string,
  phaseOrder: readonly string[],
  items: KanbanTasksByPhase,
): string | null {
  const fromSortable = parsePlanColumnSortableId(overId);
  if (fromSortable && phaseOrder.includes(fromSortable)) return fromSortable;

  if (overId.endsWith('::start')) {
    const phaseId = overId.slice(0, -'::start'.length);
    if (phaseOrder.includes(phaseId)) return phaseId;
  }

  if (phaseOrder.includes(overId)) return overId;

  for (const phaseId of phaseOrder) {
    if (items[phaseId]?.includes(overId)) return phaseId;
  }

  return null;
}

function serverPhaseIdOrder(phases: readonly ProjectTaskBoardPhase[]): string[] {
  return [...phases].sort((a, b) => a.sortOrder - b.sortOrder).map((phase) => phase.id);
}

function stopPointer(event: PointerEvent) {
  event.stopPropagation();
}

function resolveDropPhaseId(id: string, phases: readonly ProjectTaskBoardPhase[]): string | null {
  if (id.endsWith('::start')) return id.slice(0, -'::start'.length);
  if (phases.some((phase) => phase.id === id)) return id;
  return null;
}

function ColumnStartDrop({ phaseId, active }: { phaseId: string; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnStartId(phaseId) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        '-mt-1 min-h-2 shrink-0 rounded-sm transition-colors',
        active && (isOver ? 'bg-primary/20' : 'bg-transparent'),
      )}
      aria-hidden="true"
    />
  );
}

function EmptyPhaseDropZone({
  highlighted,
  onAddTask,
  dragDisabled,
}: {
  highlighted: boolean;
  onAddTask: () => void;
  dragDisabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed px-3 py-8 text-center transition-colors',
        highlighted ? 'border-primary/45 bg-primary/5' : 'border-black/15 bg-white/60',
      )}
    >
      <Inbox className="size-5 opacity-50" aria-hidden="true" />
      <p className="text-xs font-medium">{dragDisabled ? 'No matching tasks' : 'Drop tasks here'}</p>
      {!dragDisabled ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onPointerDown={stopPointer}
          onClick={onAddTask}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Task
        </Button>
      ) : null}
    </div>
  );
}

function PlanAddPhaseColumn({
  onAddPhase,
  nextSortOrder,
}: {
  onAddPhase: () => void;
  nextSortOrder: number;
}) {
  const planTheme = projectPlanPhaseTheme(nextSortOrder);

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-[min(100vw-2rem,18.5rem)] shrink-0 flex-col overflow-hidden rounded-xl border border-black/6 bg-white shadow-[0_1px_3px_rgb(15_23_42_/_0.06)]',
        'sm:w-[19rem]',
      )}
    >
      <div className="border-border/60 border-b bg-white px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0 rounded p-0.5" aria-hidden="true">
            <GripVertical className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-semibold leading-tight">New phase</p>
            <p className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">0 tasks</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0 rounded-md bg-neutral-950 text-white hover:bg-neutral-800 hover:text-white"
            aria-label="Add phase"
            onClick={onAddPhase}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        className="text-muted-foreground flex min-h-[14rem] flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center text-xs"
        style={{ backgroundColor: planTheme.column }}
      >
        <Inbox className="size-5 opacity-40" aria-hidden="true" />
        <p>New phase column</p>
      </div>
    </div>
  );
}

function PhaseDropZone({
  phase,
  columnVariant,
  isDropTarget,
  displayOrder,
  columnDragHandle,
  onAddInPhase,
  onManagePhases,
  onDeletePhase,
  onRenamePhase,
  renameDisabled,
  children,
}: {
  phase: ProjectTaskBoardPhase;
  columnVariant?: 'default' | 'plan';
  isDropTarget: boolean;
  displayOrder?: number;
  columnDragHandle?: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  };
  onAddInPhase: (phaseId: string) => void;
  onManagePhases?: () => void;
  onDeletePhase?: (phaseId: string) => void;
  onRenamePhase?: (phaseId: string, name: string) => void | Promise<void>;
  renameDisabled?: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase.id });
  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 shrink-0 self-stretch">
      <ProjectTaskPhaseColumn
        phase={phase}
        variant={columnVariant}
        isDropTarget={isDropTarget || isOver}
        displayOrder={displayOrder}
        columnDragHandle={columnDragHandle}
        onAddTask={() => onAddInPhase(phase.id)}
        onManagePhases={onManagePhases}
        onDeletePhase={onDeletePhase ? () => onDeletePhase(phase.id) : undefined}
        onRenamePhase={
          onRenamePhase ? (name) => onRenamePhase(phase.id, name) : undefined
        }
        renameDisabled={renameDisabled}
      >
        {children}
      </ProjectTaskPhaseColumn>
    </div>
  );
}

function SortablePlanPhaseColumn({
  phase,
  displayOrder,
  enableColumnDrag,
  isDropTarget,
  columnVariant,
  onAddInPhase,
  onManagePhases,
  onDeletePhase,
  onRenamePhase,
  renameDisabled,
  children,
}: {
  phase: ProjectTaskBoardPhase;
  displayOrder: number;
  enableColumnDrag: boolean;
  isDropTarget: boolean;
  columnVariant?: 'default' | 'plan';
  onAddInPhase: (phaseId: string) => void;
  onManagePhases?: () => void;
  onDeletePhase?: (phaseId: string) => void;
  onRenamePhase?: (phaseId: string, name: string) => void | Promise<void>;
  renameDisabled?: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: planColumnSortableId(phase.id),
    disabled: !enableColumnDrag,
    data: { type: 'plan-column', phaseId: phase.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex h-full min-h-0 shrink-0 self-stretch',
        isDragging && 'z-20 opacity-95',
      )}
    >
      <PhaseDropZone
        phase={phase}
        columnVariant={columnVariant}
        isDropTarget={isDropTarget}
        displayOrder={displayOrder}
        columnDragHandle={enableColumnDrag ? { attributes, listeners } : undefined}
        onAddInPhase={onAddInPhase}
        onManagePhases={onManagePhases}
        onDeletePhase={onDeletePhase}
        onRenamePhase={onRenamePhase}
        renameDisabled={renameDisabled}
      >
        {children}
      </PhaseDropZone>
    </div>
  );
}

export function ProjectTaskKanbanBoard({
  phases,
  tasks,
  disabled,
  dragDisabled,
  columnVariant = 'default',
  cardVariant = 'default',
  onPersistMove,
  onView,
  onEdit,
  onDelete,
  onAddInPhase,
  onManagePhases,
  onDeletePhase,
  onRenamePhase,
  renameDisabled,
  onAddPhase,
  onPersistPhaseReorder,
}: {
  phases: readonly ProjectTaskBoardPhase[];
  tasks: readonly ProjectTask[];
  disabled?: boolean;
  dragDisabled?: boolean;
  columnVariant?: 'default' | 'plan';
  cardVariant?: 'default' | 'plan';
  onPersistMove: (input: {
    taskId: string;
    phaseId: string;
    beforeTaskId: string | null;
  }) => Promise<void>;
  onView: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAddInPhase: (phaseId: string) => void;
  onManagePhases?: () => void;
  onDeletePhase?: (phaseId: string) => void;
  onRenamePhase?: (phaseId: string, name: string) => void | Promise<void>;
  renameDisabled?: boolean;
  onAddPhase?: () => void;
  onPersistPhaseReorder?: (orderedPhaseIds: readonly string[]) => Promise<void>;
}) {
  const dndOff = Boolean(disabled || dragDisabled);
  const enablePlanColumnDrag =
    columnVariant === 'plan' && Boolean(onPersistPhaseReorder) && !dndOff;
  const [phaseOrder, setPhaseOrder] = useState<string[]>(() => serverPhaseIdOrder(phases));
  const [dragKind, setDragKind] = useState<'task' | 'phase' | null>(null);
  const dragKindRef = useRef<'task' | 'phase' | null>(null);
  const phaseOrderRef = useRef(phaseOrder);
  const lastPhaseDropTargetRef = useRef<string | null>(null);
  phaseOrderRef.current = phaseOrder;

  useEffect(() => {
    if (dragKind === 'phase') return;
    setPhaseOrder(serverPhaseIdOrder(phases));
  }, [phases, dragKind]);

  const orderedPhases = useMemo(() => {
    const byId = new Map(phases.map((phase) => [phase.id, phase]));
    return phaseOrder
      .map((id) => byId.get(id))
      .filter((phase): phase is ProjectTaskBoardPhase => Boolean(phase));
  }, [phases, phaseOrder]);

  /** Timeline slot dates stay fixed by column index; names/tasks move on reorder. */
  const planTimelineSlotDates = useMemo(() => {
    if (columnVariant !== 'plan') return null;
    return [...phases]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((phase) => ({
        startDate: phase.startDate,
        expectedEndDate: phase.expectedEndDate,
      }));
  }, [phases, columnVariant]);

  const phaseForPlanColumn = useCallback(
    (phase: ProjectTaskBoardPhase, columnIndex: number) => {
      if (!enablePlanColumnDrag || !planTimelineSlotDates) return phase;
      const slot = planTimelineSlotDates[columnIndex];
      if (!slot) return phase;
      return { ...phase, startDate: slot.startDate, expectedEndDate: slot.expectedEndDate };
    },
    [enablePlanColumnDrag, planTimelineSlotDates],
  );

  const phaseIds = useMemo(() => orderedPhases.map((p) => p.id), [orderedPhases]);
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const [items, setItems] = useState<KanbanTasksByPhase>(() =>
    buildKanbanTaskItems(phaseIds, tasks),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overPhaseId, setOverPhaseId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local DnD state when server tasks change
    setItems(buildKanbanTaskItems(phaseIds, tasks));
  }, [tasks, phaseIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      if (dragKindRef.current === 'phase') {
        const activeColumnId = String(args.active.id);
        const phaseIdSet = new Set(phaseOrderRef.current);
        const columnContainers = args.droppableContainers.filter((container) => {
          const id = String(container.id);
          if (id === activeColumnId) return false;
          return parsePlanColumnSortableId(id) !== null || phaseIdSet.has(id);
        });
        const pointerHits = pointerWithin({ ...args, droppableContainers: columnContainers });
        if (pointerHits.length > 0) return pointerHits;
        return closestCenter({ ...args, droppableContainers: columnContainers });
      }
      return closestCorners(args);
    },
    [],
  );

  const findContainer = useCallback(
    (id: string) => {
      const fromDrop = resolveDropPhaseId(id, phases);
      if (fromDrop) return fromDrop;
      for (const phaseId of phaseIds) {
        if (items[phaseId]?.includes(id)) return phaseId;
      }
      return null;
    },
    [items, phaseIds, phases],
  );

  const insertIndexInColumn = (overId: string, overContainer: string, columnIds: string[]) => {
    if (overId === columnStartId(overContainer) || overId.endsWith('::start')) return 0;
    if (overId === overContainer) return columnIds.length;
    const overIndex = columnIds.indexOf(overId);
    return overIndex < 0 ? columnIds.length : overIndex;
  };

  const onDragStart = (event: DragStartEvent) => {
    if (dndOff) return;
    const id = String(event.active.id);
    if (parsePlanColumnSortableId(id)) {
      dragKindRef.current = 'phase';
      lastPhaseDropTargetRef.current = null;
      setDragKind('phase');
      setActiveId(id);
      return;
    }
    dragKindRef.current = 'task';
    setDragKind('task');
    setActiveId(id);
  };

  const onDragOver = (event: DragOverEvent) => {
    if (dndOff) return;
    const { active, over } = event;
    if (!over) return;

    if (parsePlanColumnSortableId(String(active.id))) {
      const activePhaseId = parsePlanColumnSortableId(String(active.id));
      const overPhaseId = resolvePhaseColumnTarget(
        String(over.id),
        phaseOrderRef.current,
        items,
      );
      if (activePhaseId && overPhaseId && activePhaseId !== overPhaseId) {
        lastPhaseDropTargetRef.current = overPhaseId;
      }
      return;
    }

    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;
    setOverPhaseId(overContainer);
    if (activeContainer === overContainer) return;

    setItems((current) => {
      const activeItems = [...(current[activeContainer] ?? [])];
      const overItems = [...(current[overContainer] ?? [])];
      const activeIndex = activeItems.indexOf(String(active.id));
      const movedId = activeItems[activeIndex];
      if (activeIndex < 0 || movedId === undefined) return current;
      overItems.splice(insertIndexInColumn(String(over.id), overContainer, overItems), 0, movedId);
      activeItems.splice(activeIndex, 1);
      return { ...current, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const isPhaseDrag = Boolean(parsePlanColumnSortableId(String(active.id)));
    setActiveId(null);
    setOverPhaseId(null);
    dragKindRef.current = null;
    setDragKind(null);
    if (!over || dndOff) return;

    if (isPhaseDrag) {
      const activePhaseId = parsePlanColumnSortableId(String(active.id));
      const overPhaseId =
        resolvePhaseColumnTarget(String(over.id), phaseOrderRef.current, items) ??
        lastPhaseDropTargetRef.current;
      lastPhaseDropTargetRef.current = null;

      const currentOrder = phaseOrderRef.current;
      let nextOrder = currentOrder;
      if (activePhaseId && overPhaseId) {
        const oldIndex = currentOrder.indexOf(activePhaseId);
        const newIndex = currentOrder.indexOf(overPhaseId);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          nextOrder = arrayMove([...currentOrder], oldIndex, newIndex);
        }
      }
      setPhaseOrder(nextOrder);

      const baseline = serverPhaseIdOrder(phases).join(',');
      if (baseline !== nextOrder.join(',') && onPersistPhaseReorder) {
        try {
          await onPersistPhaseReorder(nextOrder);
        } catch {
          setPhaseOrder(serverPhaseIdOrder(phases));
        }
      }
      return;
    }

    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;

    let nextItems = items;

    if (activeContainer === overContainer) {
      const columnItems = [...(items[activeContainer] ?? [])];
      const oldIndex = columnItems.indexOf(String(active.id));
      const overId = String(over.id);
      let newIndex = insertIndexInColumn(overId, activeContainer, columnItems);
      if (overId === activeContainer && newIndex >= columnItems.length) {
        newIndex = columnItems.length - 1;
      }
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        nextItems = { ...items, [activeContainer]: arrayMove(columnItems, oldIndex, newIndex) };
        setItems(nextItems);
      }
    }

    const orderedIds = nextItems[overContainer] ?? [];
    const beforeTaskId = kanbanBeforeTaskId(orderedIds, String(active.id));
    const task = taskById.get(String(active.id));
    if (!task) return;

    const priorOrder = buildKanbanTaskItems(phaseIds, tasks)[overContainer] ?? [];
    const samePhase = task.phaseId === overContainer;
    if (samePhase && priorOrder.join(',') === orderedIds.join(',')) return;

    try {
      await onPersistMove({
        taskId: String(active.id),
        phaseId: overContainer,
        beforeTaskId,
      });
    } catch {
      setItems(buildKanbanTaskItems(phaseIds, tasks));
    }
  };

  const onDragCancel = () => {
    setActiveId(null);
    setOverPhaseId(null);
    dragKindRef.current = null;
    setDragKind(null);
    setPhaseOrder(serverPhaseIdOrder(phases));
    setItems(buildKanbanTaskItems(phaseIds, tasks));
  };

  const activeTask =
    dragKind === 'task' && activeId ? taskById.get(activeId) : undefined;
  const activePhaseColumnId = activeId ? parsePlanColumnSortableId(activeId) : null;
  const activePhaseColumn = activePhaseColumnId
    ? (() => {
        const index = phaseOrder.indexOf(activePhaseColumnId);
        const phase = orderedPhases.find((row) => row.id === activePhaseColumnId);
        return phase && index >= 0 ? phaseForPlanColumn(phase, index) : phase;
      })()
    : undefined;

  const showPlanAddColumn = columnVariant === 'plan' && Boolean(onAddPhase);

  if (phases.length === 0 && !showPlanAddColumn) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        This project has no phases yet. Use <strong className="text-foreground font-medium">Manage Phases</strong>{' '}
        to set up your plan board.
      </div>
    );
  }

  const board = (
    <div
      role="region"
      aria-label="Project phase task board"
      tabIndex={0}
      className="flex min-h-[min(36rem,calc(100vh-18rem))] min-w-0 items-stretch gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:thin] focus-visible:ring-ring/40 outline-none focus-visible:ring-[3px] [&::-webkit-scrollbar]:h-1.5"
    >
      <SortableContext
        items={enablePlanColumnDrag ? phaseOrder.map(planColumnSortableId) : []}
        strategy={horizontalListSortingStrategy}
      >
        {orderedPhases.map((phase, index) => {
          const columnPhase = phaseForPlanColumn(phase, index);
          const phaseTaskIds = items[phase.id] ?? [];
          const columnHighlighted = overPhaseId === phase.id;
          const columnBody = (
            <SortableContext items={phaseTaskIds} strategy={verticalListSortingStrategy}>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <ColumnStartDrop
                  phaseId={phase.id}
                  active={dragKind === 'task' && Boolean(activeId) && !dndOff}
                />
                {phaseTaskIds.length === 0 ? (
                  <EmptyPhaseDropZone
                    highlighted={columnHighlighted && dragKind === 'task' && !dndOff}
                    onAddTask={() => onAddInPhase(phase.id)}
                    dragDisabled={dragDisabled}
                  />
                ) : (
                  phaseTaskIds.map((taskId) => {
                    const task = taskById.get(taskId);
                    if (!task) return null;
                    return (
                      <SortableProjectTaskKanbanCard
                        key={taskId}
                        task={task}
                        variant={cardVariant}
                        phaseBounds={
                          cardVariant === 'plan'
                            ? {
                                phaseStartDate: columnPhase.startDate,
                                phaseExpectedEndDate: columnPhase.expectedEndDate,
                              }
                            : undefined
                        }
                        disabled={dndOff || dragKind === 'phase'}
                        onView={() => onView(taskId)}
                        onEdit={() => onEdit(taskId)}
                        onDelete={() => onDelete(taskId)}
                      />
                    );
                  })
                )}
              </div>
            </SortableContext>
          );

          if (enablePlanColumnDrag) {
            return (
              <SortablePlanPhaseColumn
                key={phase.id}
                phase={columnPhase}
                displayOrder={index + 1}
                enableColumnDrag={enablePlanColumnDrag}
                columnVariant={columnVariant}
                isDropTarget={columnHighlighted}
                onAddInPhase={onAddInPhase}
                onManagePhases={onManagePhases}
                onDeletePhase={onDeletePhase}
                onRenamePhase={onRenamePhase}
                renameDisabled={renameDisabled}
              >
                {columnBody}
              </SortablePlanPhaseColumn>
            );
          }

          return (
            <PhaseDropZone
              key={phase.id}
              phase={phase}
              columnVariant={columnVariant}
              isDropTarget={columnHighlighted}
              onAddInPhase={onAddInPhase}
              onManagePhases={onManagePhases}
              onDeletePhase={onDeletePhase}
              onRenamePhase={onRenamePhase}
              renameDisabled={renameDisabled}
            >
              {columnBody}
            </PhaseDropZone>
          );
        })}
      </SortableContext>
      {showPlanAddColumn && onAddPhase ? (
        <PlanAddPhaseColumn
          onAddPhase={onAddPhase}
          nextSortOrder={orderedPhases.length + 1}
        />
      ) : null}
    </div>
  );

  if (dndOff) {
    return <div className="min-w-0 max-w-full overflow-hidden">{board}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(event) => void onDragEnd(event)}
      onDragCancel={onDragCancel}
    >
      <div className="min-w-0 max-w-full overflow-hidden">{board}</div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="pointer-events-none w-[21.25rem] max-w-[calc(100vw-2rem)] rotate-[0.5deg] opacity-95 shadow-lg">
            <ProjectTaskKanbanCard
              task={activeTask}
              variant={cardVariant}
              onView={() => undefined}
              onEdit={() => undefined}
              onDelete={() => undefined}
            />
          </div>
        ) : activePhaseColumn ? (
          <div className="pointer-events-none w-[19rem] max-w-[calc(100vw-2rem)] rotate-[0.5deg] opacity-90 shadow-lg">
            <ProjectTaskPhaseColumn
              phase={activePhaseColumn}
              variant="plan"
              displayOrder={
                phaseOrder.indexOf(activePhaseColumn.id) >= 0
                  ? phaseOrder.indexOf(activePhaseColumn.id) + 1
                  : activePhaseColumn.sortOrder
              }
            >
              <div className="min-h-[8rem]" />
            </ProjectTaskPhaseColumn>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
