'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Inbox, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ProjectTask, ProjectTaskBoardPhase } from '../types';
import {
  buildKanbanTaskItems,
  kanbanBeforeTaskId,
  type KanbanTasksByPhase,
} from '../utils/kanban-items';
import { ProjectTaskKanbanCard, SortableProjectTaskKanbanCard } from './project-task-kanban-card';
import { ProjectTaskPhaseColumn } from './project-task-phase-column';

const columnStartId = (phaseId: string) => `${phaseId}::start`;

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

function PhaseDropZone({
  phase,
  isDropTarget,
  onAddInPhase,
  children,
}: {
  phase: ProjectTaskBoardPhase;
  isDropTarget: boolean;
  onAddInPhase: (phaseId: string) => void;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase.id });
  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 shrink-0 self-stretch">
      <ProjectTaskPhaseColumn
        phase={phase}
        isDropTarget={isDropTarget || isOver}
        onAddTask={() => onAddInPhase(phase.id)}
      >
        {children}
      </ProjectTaskPhaseColumn>
    </div>
  );
}

export function ProjectTaskKanbanBoard({
  phases,
  tasks,
  disabled,
  dragDisabled,
  onPersistMove,
  onView,
  onEdit,
  onDelete,
  onAddInPhase,
}: {
  phases: readonly ProjectTaskBoardPhase[];
  tasks: readonly ProjectTask[];
  disabled?: boolean;
  dragDisabled?: boolean;
  onPersistMove: (input: {
    taskId: string;
    phaseId: string;
    beforeTaskId: string | null;
  }) => Promise<void>;
  onView: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAddInPhase: (phaseId: string) => void;
}) {
  const dndOff = Boolean(disabled || dragDisabled);
  const phaseIds = useMemo(() => phases.map((p) => p.id), [phases]);
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
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    if (dndOff) return;
    const { active, over } = event;
    if (!over) return;
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
    setActiveId(null);
    setOverPhaseId(null);
    if (!over || dndOff) return;

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
    setItems(buildKanbanTaskItems(phaseIds, tasks));
  };

  const activeTask = activeId ? taskById.get(activeId) : undefined;

  if (phases.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        This project has no phases yet. Add phases on the Projects page to organize tasks.
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
      {phases.map((phase) => {
        const phaseTaskIds = items[phase.id] ?? [];
        const columnHighlighted = overPhaseId === phase.id;
        return (
          <PhaseDropZone
            key={phase.id}
            phase={phase}
            isDropTarget={columnHighlighted}
            onAddInPhase={onAddInPhase}
          >
            <SortableContext items={phaseTaskIds} strategy={verticalListSortingStrategy}>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <ColumnStartDrop phaseId={phase.id} active={Boolean(activeId) && !dndOff} />
                {phaseTaskIds.length === 0 ? (
                  <EmptyPhaseDropZone
                    highlighted={columnHighlighted && !dndOff}
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
                        disabled={dndOff}
                        onView={() => onView(taskId)}
                        onEdit={() => onEdit(taskId)}
                        onDelete={() => onDelete(taskId)}
                      />
                    );
                  })
                )}
              </div>
            </SortableContext>
          </PhaseDropZone>
        );
      })}
    </div>
  );

  if (dndOff) {
    return <div className="min-w-0 max-w-full overflow-hidden">{board}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
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
              onView={() => undefined}
              onEdit={() => undefined}
              onDelete={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
