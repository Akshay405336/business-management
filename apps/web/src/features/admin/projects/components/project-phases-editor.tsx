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
import { projectPhaseInputSchema } from '@techwin/validation';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formControlStateClass } from '@/shared/form/form-control-state';
import { toDateInputValue } from '@/features/admin/crm/utils/format';
import { cn } from '@/shared/lib/utils';
import {
  CrmFieldLabel,
  CrmFormField,
} from '@/features/admin/crm/components/crm-feedback';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import {
  validatePhaseScheduleFieldErrors,
  type ProjectPhaseFormRow,
} from '../utils/project-phase-schedule';

const compactFieldClass = 'min-w-0 gap-1.5';

function phaseFieldKey(index: number, field: string) {
  return `phases.${index}.${field}`;
}

function SortablePhaseCard({
  row,
  index,
  phases,
  projectStartDate,
  projectExpectedEndDate,
  touched,
  submitAttempted,
  fieldErrors,
  onChange,
  onDelete,
  onTouch,
  variant = 'default',
}: {
  row: ProjectPhaseFormRow;
  index: number;
  phases: readonly ProjectPhaseFormRow[];
  projectStartDate: string;
  projectExpectedEndDate: string;
  touched: Record<string, boolean>;
  submitAttempted: boolean;
  fieldErrors: Record<string, string>;
  onChange: (
    key: string,
    patch: Partial<ProjectPhaseFormRow>,
    manualDateField?: 'startDate' | 'expectedEndDate',
  ) => void;
  onDelete: () => void;
  onTouch: (field: string) => void;
  variant?: 'default' | 'pipeline';
}) {
  const pipelineVariant = variant === 'pipeline';
  const fieldClass = pipelineVariant ? CRM_PIPELINE_FORM_FIELD_CLASS : undefined;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const scheduleContext = useMemo(
    () => ({
      projectStartDate: toDateInputValue(projectStartDate),
      projectExpectedEndDate: toDateInputValue(projectExpectedEndDate),
    }),
    [projectStartDate, projectExpectedEndDate],
  );

  const liveValue = {
    name: row.name.trim(),
    description: row.description.trim() || undefined,
    startDate: toDateInputValue(row.startDate),
    expectedEndDate: toDateInputValue(row.expectedEndDate),
  };

  const shouldValidate = (field: string) => {
    const key = phaseFieldKey(index, field);
    return submitAttempted || touched[key] || Boolean(liveValue[field as keyof typeof liveValue]);
  };

  const scheduleErrors = useMemo(
    () => validatePhaseScheduleFieldErrors(phases, scheduleContext),
    [phases, scheduleContext],
  );

  const resolveError = (field: 'name' | 'startDate' | 'expectedEndDate') => {
    const key = phaseFieldKey(index, field);
    if (fieldErrors[key]) return fieldErrors[key];
    if (scheduleErrors[key] && shouldValidate(field)) return scheduleErrors[key];
    if (!shouldValidate(field)) return undefined;
    const parsed = projectPhaseInputSchema.safeParse({
      ...liveValue,
      ...(row.id ? { id: row.id } : {}),
    });
    if (parsed.success) return undefined;
    const issue = parsed.error.issues.find((item) => item.path[0] === field);
    return issue?.message;
  };

  const nameError = resolveError('name');
  const startError = resolveError('startDate');
  const endError = resolveError('expectedEndDate');
  const headerName = row.name.trim() || 'Untitled phase';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid min-w-0 gap-3 rounded-lg border shadow-xs',
        pipelineVariant
          ? 'border-border bg-white p-3'
          : 'border-border/70 bg-muted/25 px-2.5 py-2',
        isDragging && 'ring-primary z-10 opacity-95 ring-2',
      )}
    >
      <div
        className={cn(
          'flex min-w-0 items-center gap-2',
          pipelineVariant ? 'pb-0' : 'border-b border-border/50 pb-1.5',
        )}
      >
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
          aria-label={`Reorder phase ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium tracking-wide uppercase">
          <span>Phase {index + 1}</span>
          <span className="text-muted-foreground/70 px-1.5">·</span>
          <span className="text-foreground normal-case">{headerName}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 shrink-0 px-2 text-xs',
            pipelineVariant
              ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
              : 'text-muted-foreground hover:text-destructive',
          )}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Remove
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3">
        <CrmFormField
          id={`phase-name-${row.key}`}
          label="Phase name"
          required
          validated={Boolean(nameError)}
          error={nameError}
          className={compactFieldClass}
        >
          <Input
            id={`phase-name-${row.key}`}
            value={row.name}
            placeholder="Requirement gathering"
            className={cn(
              fieldClass,
              formControlStateClass(nameError ? 'invalid' : 'neutral'),
            )}
            onBlur={() => onTouch('name')}
            onChange={(event) => onChange(row.key, { name: event.target.value })}
          />
        </CrmFormField>
        {!pipelineVariant ? (
          <CrmFormField
            id={`phase-desc-${row.key}`}
            label="Description"
            optional
            className={compactFieldClass}
          >
            <Input
              id={`phase-desc-${row.key}`}
              value={row.description}
              placeholder="Optional summary"
              className={fieldClass}
              onChange={(event) => onChange(row.key, { description: event.target.value })}
            />
          </CrmFormField>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <CrmFormField
            id={`phase-start-${row.key}`}
            label="Start date"
            required
            validated={Boolean(startError)}
            error={startError}
            className={compactFieldClass}
          >
            <Input
              id={`phase-start-${row.key}`}
              type="date"
              value={row.startDate}
              className={cn(
                'min-w-0 w-full',
                fieldClass,
                formControlStateClass(startError ? 'invalid' : 'neutral'),
              )}
              onBlur={() => onTouch('startDate')}
              onChange={(event) =>
                onChange(
                  row.key,
                  { startDate: toDateInputValue(event.target.value) },
                  'startDate',
                )
              }
            />
          </CrmFormField>
          <CrmFormField
            id={`phase-end-${row.key}`}
            label="Expected end"
            required
            validated={Boolean(endError)}
            error={endError}
            className={compactFieldClass}
          >
            <Input
              id={`phase-end-${row.key}`}
              type="date"
              value={row.expectedEndDate}
              className={cn(
                'min-w-0 w-full',
                fieldClass,
                formControlStateClass(endError ? 'invalid' : 'neutral'),
              )}
              onBlur={() => onTouch('expectedEndDate')}
              onChange={(event) =>
                onChange(
                  row.key,
                  { expectedEndDate: toDateInputValue(event.target.value) },
                  'expectedEndDate',
                )
              }
            />
          </CrmFormField>
        </div>
      </div>
    </div>
  );
}

export function ProjectPhasesEditor({
  phases,
  projectStartDate,
  projectExpectedEndDate,
  fieldErrors,
  submitAttempted,
  onAddPhase,
  onPatchPhase,
  onReorderPhases,
  onRemovePhases,
  variant = 'default',
}: {
  phases: readonly ProjectPhaseFormRow[];
  projectStartDate: string;
  projectExpectedEndDate: string;
  fieldErrors: Record<string, string>;
  submitAttempted: boolean;
  variant?: 'default' | 'pipeline';
  onAddPhase: () => void;
  onPatchPhase: (
    key: string,
    patch: Partial<ProjectPhaseFormRow>,
    manualDateField?: 'startDate' | 'expectedEndDate',
  ) => void;
  onReorderPhases: (phases: ProjectPhaseFormRow[]) => void;
  onRemovePhases: (phases: ProjectPhaseFormRow[]) => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<ProjectPhaseFormRow | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = useMemo(() => phases.map((phase) => phase.key), [phases]);

  const touch = (index: number, field: string) => {
    setTouched((current) => ({ ...current, [phaseFieldKey(index, field)]: true }));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = phases.findIndex((row) => row.key === active.id);
    const newIndex = phases.findIndex((row) => row.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderPhases(arrayMove([...phases], oldIndex, newIndex));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onRemovePhases(phases.filter((row) => row.key !== deleteTarget.key));
    setDeleteTarget(null);
  };

  const pipelineVariant = variant === 'pipeline';

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        {pipelineVariant ? (
          <CrmFieldLabel>Project phases</CrmFieldLabel>
        ) : (
          <h3 className="text-sm font-semibold">Project phases</h3>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={
            pipelineVariant
              ? 'h-11 rounded-lg border border-input bg-card shadow-none hover:bg-muted/50'
              : 'h-8'
          }
          onClick={onAddPhase}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add phase
        </Button>
      </div>
      {phases.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-5 text-sm">
          No phases yet. Add phases to define how this project will be delivered.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="grid gap-2">
              {phases.map((row, index) => (
                <SortablePhaseCard
                  key={row.key}
                  row={row}
                  index={index}
                  phases={phases}
                  projectStartDate={projectStartDate}
                  projectExpectedEndDate={projectExpectedEndDate}
                  touched={touched}
                  submitAttempted={submitAttempted}
                  fieldErrors={fieldErrors}
                  onChange={onPatchPhase}
                  onTouch={(field) => touch(index, field)}
                  onDelete={() => {
                    if (row.persisted) setDeleteTarget(row);
                    else onRemovePhases(phases.filter((item) => item.key !== row.key));
                  }}
                  variant={variant}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove phase?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name || 'Untitled phase'}” will be removed when you save. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove phase</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function validatePhaseFormRows(
  phases: readonly ProjectPhaseFormRow[],
  projectStartDate: string,
  projectExpectedEndDate: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const scheduleContext = {
    projectStartDate: toDateInputValue(projectStartDate),
    projectExpectedEndDate: toDateInputValue(projectExpectedEndDate),
  };

  Object.assign(errors, validatePhaseScheduleFieldErrors(phases, scheduleContext));

  phases.forEach((row, index) => {
    const parsed = projectPhaseInputSchema.safeParse({
      ...(row.id ? { id: row.id } : {}),
      name: row.name.trim(),
      description: row.description.trim() || undefined,
      startDate: toDateInputValue(row.startDate),
      expectedEndDate: toDateInputValue(row.expectedEndDate),
    });
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== 'string') continue;
      const key = phaseFieldKey(index, field);
      if (!errors[key]) errors[key] = issue.message;
    }
  });
  return errors;
}
