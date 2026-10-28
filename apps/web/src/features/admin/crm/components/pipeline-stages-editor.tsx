'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StageColorSelect } from '@/features/admin/components/stage-color-select';
import { formControlStateClass } from '@/shared/form/form-control-state';
import { cn } from '@/shared/lib/utils';
import { CrmFieldLabel, CrmInlineFieldError } from './crm-feedback';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '../constants';
import type { PipelineStageFormRow } from '../utils/pipeline-form';

function stageFieldKey(index: number, field: string) {
  return `stages.${index}.${field}`;
}

function SortableStageRow({
  row,
  index,
  fieldErrors,
  onChange,
  onRemove,
}: {
  row: PipelineStageFormRow;
  index: number;
  fieldErrors: Record<string, string>;
  onChange: (key: string, patch: Partial<PipelineStageFormRow>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  });
  const nameError = fieldErrors[stageFieldKey(index, 'name')];
  const colorError = fieldErrors[stageFieldKey(index, 'color')];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-[#f7faff] px-2 py-2 sm:flex-nowrap',
        isDragging && 'ring-primary z-10 opacity-95 ring-2',
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
        aria-label={`Reorder stage ${index + 1}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <Input
          id={`stage-name-${row.key}`}
          value={row.name}
          placeholder={CRM_FORM_PLACEHOLDERS.stageName}
          aria-label={`Stage ${index + 1} name`}
          aria-invalid={Boolean(nameError)}
          className={cn(
            CRM_PIPELINE_FORM_FIELD_CLASS,
            formControlStateClass(nameError ? 'invalid' : 'neutral'),
          )}
          onChange={(event) => onChange(row.key, { name: event.target.value })}
        />
        {nameError ? (
          <CrmInlineFieldError message={nameError} reserveSpace={false} />
        ) : null}
      </div>
      <div className="w-[8.5rem] shrink-0">
        <StageColorSelect
          id={`stage-color-${row.key}`}
          value={row.color}
          aria-label={`Stage ${index + 1} color`}
          controlState={colorError ? 'invalid' : 'neutral'}
          onValueChange={(color) => onChange(row.key, { color })}
        />
        {colorError ? (
          <CrmInlineFieldError message={colorError} reserveSpace={false} />
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive h-9 shrink-0 px-2"
        aria-label={`Remove stage ${row.name || index + 1}`}
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Remove
      </Button>
    </div>
  );
}

export function PipelineStagesEditor({
  stages,
  sectionRequired = false,
  fieldErrors,
  onAddStage,
  onPatchStage,
  onReorderStages,
  onRemoveStages,
}: {
  stages: readonly PipelineStageFormRow[];
  /** Red required asterisk on section title (create pipeline). */
  sectionRequired?: boolean;
  fieldErrors: Record<string, string>;
  onAddStage: () => void;
  onPatchStage: (key: string, patch: Partial<PipelineStageFormRow>) => void;
  onReorderStages: (stages: PipelineStageFormRow[]) => void;
  onRemoveStages: (stages: PipelineStageFormRow[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = stages.map((stage) => stage.key);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((row) => row.key === active.id);
    const newIndex = stages.findIndex((row) => row.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderStages(arrayMove([...stages], oldIndex, newIndex));
  };

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <CrmFieldLabel required={sectionRequired}>Pipeline stages</CrmFieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 rounded-lg border border-input bg-card shadow-none hover:bg-muted/50"
          onClick={onAddStage}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add stage
        </Button>
      </div>
      {fieldErrors.stages ? (
        <p className="text-destructive text-xs">{fieldErrors.stages}</p>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {stages.map((row, index) => (
              <SortableStageRow
                key={row.key}
                row={row}
                index={index}
                fieldErrors={fieldErrors}
                onChange={onPatchStage}
                onRemove={() => onRemoveStages(stages.filter((item) => item.key !== row.key))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
