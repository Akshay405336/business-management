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
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import type { CrmLead, CrmPipelineStage } from '../types';
import { buildKanbanItems, kanbanBeforeLeadId, type KanbanItemsByStage } from '../utils/kanban-items';
import { KanbanLeadCard, SortableKanbanLeadCard } from './kanban-lead-card';
import { KanbanStageColumn } from './kanban-stage-column';

const kanbanColumnStartId = (stageId: string) => `${stageId}::start`;

function resolveKanbanDropStageId(id: string, stages: readonly CrmPipelineStage[]): string | null {
  if (id.endsWith('::start')) return id.slice(0, -'::start'.length);
  if (stages.some((stage) => stage.id === id)) return id;
  return null;
}

function KanbanColumnStartDrop({ stageId, active }: { stageId: string; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: kanbanColumnStartId(stageId) });
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

function KanbanColumnDropZone({
  stage,
  leadCount,
  isDropTarget,
  onAddLead,
  children,
}: {
  stage: CrmPipelineStage;
  leadCount: number;
  isDropTarget: boolean;
  onAddLead?: () => void;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div ref={setNodeRef} className="flex h-full min-h-0 shrink-0 self-stretch">
      <KanbanStageColumn
        stage={stage}
        leadCount={leadCount}
        isDropTarget={isDropTarget || isOver}
        onAddLead={onAddLead}
      >
        {children}
      </KanbanStageColumn>
    </div>
  );
}

export function KanbanBoard({
  stages,
  leads,
  disabled,
  onPersistMove,
  onAddLead,
  onView,
  onEdit,
  onDelete,
  onStageChange,
}: {
  stages: readonly CrmPipelineStage[];
  leads: readonly CrmLead[];
  disabled?: boolean;
  onPersistMove: (input: {
    leadId: string;
    stageId: string;
    beforeLeadId: string | null;
  }) => Promise<void>;
  onAddLead?: (stageId: string) => void;
  onView: (leadId: string) => void;
  onEdit: (leadId: string) => void;
  onDelete: (leadId: string) => void;
  onStageChange: (leadId: string, stageId: string) => void;
}) {
  const leadById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const [items, setItems] = useState<KanbanItemsByStage>(() => buildKanbanItems(stages, leads));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  useEffect(() => {
    setItems(buildKanbanItems(stages, leads));
  }, [leads, stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = useCallback(
    (id: string) => {
      const stageFromDrop = resolveKanbanDropStageId(id, stages);
      if (stageFromDrop) return stageFromDrop;
      for (const stage of stages) {
        if (items[stage.id]?.includes(id)) return stage.id;
      }
      return null;
    },
    [items, stages],
  );

  const insertIndexInColumn = (overId: string, overContainer: string, columnIds: string[]) => {
    if (overId === kanbanColumnStartId(overContainer) || overId.endsWith('::start')) return 0;
    if (overId === overContainer) return columnIds.length;
    const overIndex = columnIds.indexOf(overId);
    return overIndex < 0 ? columnIds.length : overIndex;
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
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

      overItems.splice(insertIndexInColumn(String(over.id), overContainer, overItems), 0, movedId);
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
    setActiveId(null);
    setOverStageId(null);
    if (!over || disabled) return;

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
        nextItems = {
          ...items,
          [activeContainer]: arrayMove(columnItems, oldIndex, newIndex),
        };
        setItems(nextItems);
      }
    }

    const orderedIds = nextItems[overContainer] ?? [];
    const beforeLeadId = kanbanBeforeLeadId(orderedIds, String(active.id));
    const lead = leadById.get(String(active.id));
    if (!lead) return;

    const priorOrder = buildKanbanItems(stages, leads)[overContainer] ?? [];
    const sameStage = lead.stageId === overContainer;
    if (sameStage && priorOrder.join(',') === orderedIds.join(',')) return;

    try {
      await onPersistMove({
        leadId: String(active.id),
        stageId: overContainer,
        beforeLeadId,
      });
    } catch {
      setItems(buildKanbanItems(stages, leads));
    }
  };

  const onDragCancel = () => {
    setActiveId(null);
    setOverStageId(null);
    setItems(buildKanbanItems(stages, leads));
  };

  const activeLead = activeId ? leadById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(event) => void onDragEnd(event)}
      onDragCancel={onDragCancel}
    >
      <div
        role="region"
        aria-label="Kanban pipeline stages"
        tabIndex={0}
        className="flex min-h-[min(32rem,calc(100vh-14rem))] items-stretch gap-4 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:ring-ring/40 outline-none focus-visible:ring-[3px] [&::-webkit-scrollbar]:hidden"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const step = event.key === 'ArrowRight' ? 280 : -280;
          event.currentTarget.scrollBy({ left: step, behavior: 'smooth' });
        }}
      >
        {stages.map((stage) => {
          const stageLeadIds = items[stage.id] ?? [];
          return (
            <KanbanColumnDropZone
              key={stage.id}
              stage={stage}
              leadCount={stageLeadIds.length}
              isDropTarget={overStageId === stage.id}
              onAddLead={onAddLead ? () => onAddLead(stage.id) : undefined}
            >
              <SortableContext items={stageLeadIds} strategy={verticalListSortingStrategy}>
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <KanbanColumnStartDrop stageId={stage.id} active={Boolean(activeId)} />
                  {stageLeadIds.length === 0 ? (
                    <div
                      className={cn(
                        'text-muted-foreground flex flex-1 flex-col items-center justify-center rounded-md border border-dashed px-2 py-6 text-center text-xs transition-colors',
                        overStageId === stage.id
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-black/15 bg-card/50',
                      )}
                    >
                      No leads yet — drop here
                    </div>
                  ) : (
                    stageLeadIds.map((leadId) => {
                      const lead = leadById.get(leadId);
                      if (!lead) return null;
                      return (
                        <SortableKanbanLeadCard
                          key={leadId}
                          lead={lead}
                          stages={stages}
                          disabled={disabled}
                          onView={() => onView(leadId)}
                          onEdit={() => onEdit(leadId)}
                          onDelete={() => onDelete(leadId)}
                          onStageChange={(value) => onStageChange(leadId, value)}
                        />
                      );
                    })
                  )}
                </div>
              </SortableContext>
            </KanbanColumnDropZone>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="pointer-events-none w-[17rem] rotate-[0.5deg] opacity-95 shadow-lg">
            <KanbanLeadCard
              lead={activeLead}
              stages={stages}
              onView={() => undefined}
              onEdit={() => undefined}
              onDelete={() => undefined}
              onStageChange={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
