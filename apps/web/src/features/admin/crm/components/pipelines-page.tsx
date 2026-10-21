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
import { GripVertical, Loader2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { DataTableFrame } from '@/features/admin/components/data-table';
import { StageColorSelect } from '@/features/admin/components/stage-color-select';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  activatePipelineStage,
  createPipelineStage,
  deactivatePipelineStage,
  deletePipelineStage,
  getDefaultPipeline,
  reorderPipelineStages,
  updatePipelineStage,
} from '../api/pipelines';
import { STAGE_COLOR_PRESETS } from '../constants';
import type { CrmPipeline, CrmPipelineStage, PipelineStageOutcome } from '../types';
import { describeCrmError } from '../utils/errors';
import { normalizeStageColor } from '../utils/stage-color';
import { labelStageOutcome } from '../utils/labels';
import {
  CrmEmptyState,
  CrmErrorAlert,
  CrmFieldLabel,
  CrmInlineFieldError,
  CrmLoadingRows,
} from './crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { PipelineStageSelectItems, PipelineStageSelectTrigger } from './pipeline-stage-select';
import { useAsyncAction } from '../hooks/use-async-action';

type StageForm = {
  name: string;
  description: string;
  color: string;
  outcome: PipelineStageOutcome;
};

const emptyStageForm = (): StageForm => ({
  name: '',
  description: '',
  color: normalizeStageColor(STAGE_COLOR_PRESETS[0]),
  outcome: 'NONE',
});

type StageTableRow =
  | { kind: 'active'; stage: CrmPipelineStage }
  | { kind: 'inactive'; stage: CrmPipelineStage };

type StageStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const STAGE_SEARCH_DEBOUNCE_MS = 400;

function stageMatchesSearch(stage: CrmPipelineStage, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    stage.name.toLowerCase().includes(normalized) ||
    (stage.description ?? '').toLowerCase().includes(normalized)
  );
}

function SortableStageRow({
  stage,
  pending,
  dragEnabled,
  onEdit,
  onDeactivate,
  onDelete,
}: {
  stage: CrmPipelineStage;
  pending: boolean;
  dragEnabled: boolean;
  onEdit: (stage: CrmPipelineStage) => void;
  onDeactivate: (stage: CrmPipelineStage) => void;
  onDelete: (stage: CrmPipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    disabled: !dragEnabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="bg-background">
      <TableCell className="w-10">
        {dragEnabled ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex cursor-grab items-center rounded p-1 active:cursor-grabbing"
            aria-label={`Drag to reorder ${stage.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <span
            className="text-muted-foreground/40 inline-flex items-center rounded p-1"
            aria-hidden="true"
          >
            <GripVertical className="size-4" />
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground w-12 tabular-nums">{stage.sortOrder}</TableCell>
      <TableCell className="min-w-[8rem] font-medium">{stage.name}</TableCell>
      <TableCell className="text-muted-foreground max-w-xs truncate text-sm">
        {stage.description || '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground font-mono text-xs">{stage.color}</span>
        </div>
      </TableCell>
      <TableCell className="tabular-nums">{stage.leadCount}</TableCell>
      <TableCell>
        <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
          Active
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          <TableIconButton
            label={`Deactivate ${stage.name}`}
            tone="success"
            disabled={pending}
            onClick={() => onDeactivate(stage)}
          >
            <Power className="size-4" aria-hidden="true" />
          </TableIconButton>
          <TableIconButton
            label={`Edit ${stage.name}`}
            tone="primary"
            disabled={pending}
            onClick={() => onEdit(stage)}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </TableIconButton>
          <TableIconButton
            label={`Delete ${stage.name}`}
            tone="danger"
            disabled={pending}
            onClick={() => onDelete(stage)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </TableIconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}

function InactiveStageRow({
  stage,
  pending,
  onEdit,
  onActivate,
  onDelete,
}: {
  stage: CrmPipelineStage;
  pending: boolean;
  onEdit: (stage: CrmPipelineStage) => void;
  onActivate: (stage: CrmPipelineStage) => void;
  onDelete: (stage: CrmPipelineStage) => void;
}) {
  return (
    <TableRow className="bg-muted/20">
      <TableCell />
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell className="font-medium">{stage.name}</TableCell>
      <TableCell className="text-muted-foreground max-w-xs truncate text-sm">
        {stage.description || '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 rounded-full border border-black/10 opacity-70"
            style={{ backgroundColor: stage.color }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground font-mono text-xs">{stage.color}</span>
        </div>
      </TableCell>
      <TableCell className="tabular-nums">{stage.leadCount}</TableCell>
      <TableCell>
        <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
          Inactive
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          <TableIconButton
            label={`Activate ${stage.name}`}
            tone="danger"
            disabled={pending}
            onClick={() => onActivate(stage)}
          >
            <Power className="size-4" aria-hidden="true" />
          </TableIconButton>
          <TableIconButton
            label={`Edit ${stage.name}`}
            tone="primary"
            disabled={pending}
            onClick={() => onEdit(stage)}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </TableIconButton>
          <TableIconButton
            label={`Delete ${stage.name}`}
            tone="danger"
            disabled={pending}
            onClick={() => onDelete(stage)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </TableIconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PipelinesPage() {
  const toast = useAdminToast();
  const [pipeline, setPipeline] = useState<CrmPipeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StageStatusFilter>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pending, run } = useAsyncAction();

  const [stageDialog, setStageDialog] = useState<'create' | 'edit' | null>(null);
  const [stageForm, setStageForm] = useState<StageForm>(emptyStageForm);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const [deleteStage, setDeleteStage] = useState<CrmPipelineStage | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState('');

  const [deactivateStage, setDeactivateStage] = useState<CrmPipelineStage | null>(null);
  const [deactivateTargetId, setDeactivateTargetId] = useState('');

  const [optimisticActive, setOptimisticActive] = useState<CrmPipelineStage[] | null>(null);
  const [stageFieldErrors, setStageFieldErrors] = useState<{ name?: string; color?: string }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async (signal: AbortSignal) => {
    const result = await getDefaultPipeline(signal);
    setPipeline(result);
    setOptimisticActive(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        await load(controller.signal);
        if (!controller.signal.aborted) setError(null);
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeCrmError(failure));
      }
    })();
    return () => controller.abort();
  }, [load, reloadKey]);

  const stages = useMemo(() => pipeline?.stages ?? [], [pipeline?.stages]);
  const activeStages = useMemo(() => {
    const source = optimisticActive ?? stages.filter((s) => s.status === 'ACTIVE');
    return [...source].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [stages, optimisticActive]);

  const inactiveStages = useMemo(
    () =>
      [...stages.filter((s) => s.status === 'INACTIVE')].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [stages],
  );

  const reassignmentTargets = (excludeId: string) =>
    activeStages.filter((stage) => stage.id !== excludeId);

  const refresh = () => setReloadKey((value) => value + 1);

  const openCreateStage = () => {
    setStageForm(emptyStageForm());
    setEditingStageId(null);
    setStageFieldErrors({});
    setStageDialog('create');
  };

  const openEditStage = (stage: CrmPipelineStage) => {
    setStageForm({
      name: stage.name,
      description: stage.description,
      color: normalizeStageColor(stage.color),
      outcome: stage.outcome,
    });
    setEditingStageId(stage.id);
    setStageFieldErrors({});
    setStageDialog('edit');
  };

  const submitStage = async () => {
    if (!pipeline) return;
    const name = stageForm.name.trim();
    const colorValid = /^#[0-9a-fA-F]{6}$/.test(stageForm.color);
    const errors: { name?: string; color?: string } = {};
    if (!name) errors.name = 'Stage name is required.';
    if (!colorValid) errors.color = 'Select a valid color.';
    if (Object.keys(errors).length > 0) {
      setStageFieldErrors(errors);
      return;
    }
    setStageFieldErrors({});
    try {
      await run(async () => {
        const body = {
          name,
          description: stageForm.description.trim() || undefined,
          color: normalizeStageColor(stageForm.color),
          outcome: stageForm.outcome,
        };
        if (stageDialog === 'create') {
          await createPipelineStage(pipeline.id, body);
          toast.success('Stage created.');
        } else if (editingStageId) {
          await updatePipelineStage(pipeline.id, editingStageId, body);
          toast.success('Stage updated.');
        }
      });
      setStageDialog(null);
      refresh();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!pipeline || !deleteStage) return;
    if (deleteStage.leadCount > 0 && !deleteTargetId) {
      toast.error('Select a stage to move leads before deleting.');
      return;
    }
    try {
      await run(() =>
        deletePipelineStage(pipeline.id, deleteStage.id, deleteTargetId || undefined),
      );
      setDeleteStage(null);
      setDeleteTargetId('');
      toast.success('Stage permanently deleted.');
      refresh();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDeactivate = async () => {
    if (!pipeline || !deactivateStage) return;
    if (deactivateStage.leadCount > 0 && !deactivateTargetId) {
      toast.error('Select a stage to move leads before deactivating.');
      return;
    }
    try {
      await run(() =>
        deactivatePipelineStage(pipeline.id, deactivateStage.id, deactivateTargetId || undefined),
      );
      setDeactivateStage(null);
      setDeactivateTargetId('');
      toast.success('Stage deactivated.');
      refresh();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const handleActivateStage = (stage: CrmPipelineStage) => {
    if (!pipeline) return;
    void (async () => {
      try {
        await run(() => activatePipelineStage(pipeline.id, stage.id));
        toast.success('Stage activated.');
        refresh();
      } catch (failure) {
        toast.error(describeCrmError(failure));
      }
    })();
  };

  const applyReorder = async (ordered: readonly CrmPipelineStage[]) => {
    if (!pipeline) return;
    const previous = activeStages;
    setOptimisticActive([...ordered]);
    try {
      await run(() =>
        reorderPipelineStages(pipeline.id, {
          orderedStageIds: ordered.map((stage) => stage.id),
        }),
      );
      toast.success('Stage order saved.');
      refresh();
    } catch (failure) {
      setOptimisticActive(previous);
      toast.error(describeCrmError(failure));
    }
  };

  useEffect(() => {
    if (searchDraft === searchQuery) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchDraft);
    }, STAGE_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const filtersActive =
    searchQuery.trim().length > 0 || statusFilter !== 'ALL';

  const filteredActiveStages = useMemo(() => {
    if (statusFilter === 'INACTIVE') return [];
    return activeStages.filter((stage) => stageMatchesSearch(stage, searchQuery));
  }, [activeStages, searchQuery, statusFilter]);

  const filteredInactiveStages = useMemo(() => {
    if (statusFilter === 'ACTIVE') return [];
    return inactiveStages.filter((stage) => stageMatchesSearch(stage, searchQuery));
  }, [inactiveStages, searchQuery, statusFilter]);

  const onDragEnd = (event: DragEndEvent) => {
    if (filtersActive) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeStages.findIndex((stage) => stage.id === active.id);
    const newIndex = activeStages.findIndex((stage) => stage.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void applyReorder(arrayMove(activeStages, oldIndex, newIndex));
  };

  const tableRows = useMemo((): StageTableRow[] => {
    return [
      ...filteredActiveStages.map((stage) => ({ kind: 'active' as const, stage })),
      ...filteredInactiveStages.map((stage) => ({ kind: 'inactive' as const, stage })),
    ];
  }, [filteredActiveStages, filteredInactiveStages]);

  const hasAnyStages = activeStages.length > 0 || inactiveStages.length > 0;

  const totalStages = tableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalStages / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const paginatedRows = useMemo(
    () => tableRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [tableRows, safePage, pageSize],
  );

  const paginatedActiveIds = useMemo(
    () => paginatedRows.filter((row) => row.kind === 'active').map((row) => row.stage.id),
    [paginatedRows],
  );

  const stageDialogKey =
    stageDialog === 'edit' && editingStageId ? `edit-${editingStageId}` : 'create';

  const loading = pipeline === null && !error;

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Pipeline' },
  ] as const;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Pipeline"
        description="Manage the stages leads move through."
        className="shadow-xs"
        toolbar={
          <>
            {pipeline ? (
              <>
                <form
                  className={CRM_HEADER_SEARCH_FORM_CLASS}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    setSearchQuery(searchDraft);
                    setPage(1);
                  }}
                >
                  <div className="relative min-w-0">
                    <Search
                      className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
                      aria-hidden="true"
                    />
                    <Input
                      className="h-9 pl-8"
                      placeholder="Search stages..."
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search stages by name or description"
                    />
                  </div>
                </form>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StageStatusFilter)}
                >
                  <SelectTrigger
                    className="h-9 w-full shrink-0 sm:w-[11rem]"
                    aria-label="Filter by status"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              disabled={pending || loading}
              onClick={openCreateStage}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              <Plus aria-hidden="true" />
              Add Pipeline
            </Button>
          </>
        }
      />

      {error ? <CrmErrorAlert message={error} /> : null}

      {loading ? <CrmLoadingRows rows={5} /> : null}

      {pipeline && !hasAnyStages ? (
        <CrmEmptyState
          title="No stages yet"
          description="Add your first stage to define how leads progress through the pipeline."
        />
      ) : null}

      {pipeline && hasAnyStages && filtersActive ? (
        <p className="text-muted-foreground text-sm" role="status">
          Stage reordering is disabled while search or status filters are active. Clear filters to
          drag and reorder active stages.
        </p>
      ) : null}

      {pipeline && hasAnyStages ? (
        <DataTableFrame
          footer={
            tableRows.length > 0 ? (
              <TablePagination
                page={safePage}
                pageSize={pageSize}
                total={totalStages}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
              />
            ) : null
          }
        >
          {tableRows.length === 0 ? (
            <div className="text-muted-foreground px-4 py-10 text-center text-sm">
              <p className="text-foreground font-medium">No stages match your search</p>
              <p className="mt-1">
                Try a different search term or status filter, or clear filters to see all stages.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <Table>
                <TableHeader variant="gradient">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10" />
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Stage Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[7.5rem]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={paginatedActiveIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {(() => {
                      let inactiveHeaderShown = false;
                      return paginatedRows.flatMap((row) => {
                        const elements: ReactNode[] = [];
                        if (row.kind === 'inactive' && !inactiveHeaderShown) {
                          inactiveHeaderShown = true;
                          elements.push(
                            <TableRow key="inactive-header" className="hover:bg-transparent">
                              <TableCell
                                colSpan={8}
                                className="bg-muted/40 text-muted-foreground py-2 text-xs font-semibold tracking-wide uppercase"
                              >
                                Inactive stages
                              </TableCell>
                            </TableRow>,
                          );
                        }
                        if (row.kind === 'active') {
                          elements.push(
                            <SortableStageRow
                              key={row.stage.id}
                              stage={row.stage}
                              pending={pending}
                              dragEnabled={!filtersActive}
                              onEdit={openEditStage}
                              onDeactivate={setDeactivateStage}
                              onDelete={setDeleteStage}
                            />,
                          );
                        } else {
                          elements.push(
                            <InactiveStageRow
                              key={row.stage.id}
                              stage={row.stage}
                              pending={pending}
                              onEdit={openEditStage}
                              onActivate={handleActivateStage}
                              onDelete={setDeleteStage}
                            />,
                          );
                        }
                        return elements;
                      });
                    })()}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </DataTableFrame>
      ) : null}

      <Dialog open={stageDialog !== null} onOpenChange={(open) => !open && setStageDialog(null)}>
        <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="space-y-1 px-6 pt-6 pb-2">
            <DialogTitle>{stageDialog === 'create' ? 'Add stage' : 'Edit stage'}</DialogTitle>
            <DialogDescription>
              {stageDialog === 'create'
                ? 'New stages are added at the end of the active pipeline.'
                : 'Update stage details. Order and status are managed from the table.'}
            </DialogDescription>
          </DialogHeader>
          <div
            key={stageDialogKey}
            className="grid max-h-[min(60vh,420px)] gap-3 overflow-y-auto px-6 py-2 sm:grid-cols-2"
          >
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="stage-name" required>
                Stage name
              </CrmFieldLabel>
              <Input
                id="stage-name"
                value={stageForm.name}
                maxLength={120}
                onChange={(event) => {
                  setStageForm((f) => ({ ...f, name: event.target.value }));
                  if (stageFieldErrors.name) {
                    setStageFieldErrors((current) => ({ ...current, name: undefined }));
                  }
                }}
              />
              <CrmInlineFieldError message={stageFieldErrors.name} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="stage-color" required>
                Color
              </CrmFieldLabel>
              <StageColorSelect
                id="stage-color"
                value={stageForm.color}
                onValueChange={(value) => {
                  setStageForm((f) => ({ ...f, color: value }));
                  if (stageFieldErrors.color) {
                    setStageFieldErrors((current) => ({ ...current, color: undefined }));
                  }
                }}
              />
              <CrmInlineFieldError message={stageFieldErrors.color} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <CrmFieldLabel htmlFor="stage-description" optional>
                Description
              </CrmFieldLabel>
              <Textarea
                id="stage-description"
                value={stageForm.description}
                maxLength={2000}
                rows={2}
                className="min-h-[4.5rem] resize-y"
                onChange={(event) =>
                  setStageForm((f) => ({ ...f, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2 sm:col-start-1 sm:max-w-sm">
              <CrmFieldLabel htmlFor="stage-outcome" optional>
                Outcome type
              </CrmFieldLabel>
              <Select
                value={stageForm.outcome}
                onValueChange={(value) =>
                  setStageForm((f) => ({ ...f, outcome: value as PipelineStageOutcome }))
                }
              >
                <SelectTrigger id="stage-outcome">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['NONE', 'WON', 'LOST'] as const).map((outcome) => (
                    <SelectItem key={outcome} value={outcome}>
                      {labelStageOutcome(outcome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setStageDialog(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void submitStage()}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {pending
                ? stageDialog === 'edit'
                  ? 'Updating...'
                  : 'Saving...'
                : stageDialog === 'edit'
                  ? 'Update'
                  : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteStage !== null}
        onOpenChange={(open) => !open && setDeleteStage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete &quot;{deleteStage?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The stage record will be removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteStage && deleteStage.leadCount > 0 ? (
            <div className="grid gap-2 py-2">
              <Label htmlFor="delete-target">
                Move {deleteStage.leadCount} lead(s) to another active stage
              </Label>
              <Select value={deleteTargetId} onValueChange={setDeleteTargetId}>
                <SelectTrigger id="delete-target">
                  <PipelineStageSelectTrigger
                    stages={reassignmentTargets(deleteStage.id)}
                    stageId={deleteTargetId || undefined}
                    placeholder="Select stage"
                  />
                </SelectTrigger>
                <SelectContent>
                  <PipelineStageSelectItems stages={reassignmentTargets(deleteStage.id)} />
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deactivateStage !== null}
        onOpenChange={(open) => !open && setDeactivateStage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate &quot;{deactivateStage?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Inactive stages are hidden from the leads Kanban. You can reactivate this stage later;
              it will be appended to the end of the active order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deactivateStage && deactivateStage.leadCount > 0 ? (
            <div className="grid gap-2 py-2">
              <Label htmlFor="deactivate-target">
                Move {deactivateStage.leadCount} lead(s) to another active stage
              </Label>
              <Select value={deactivateTargetId} onValueChange={setDeactivateTargetId}>
                <SelectTrigger id="deactivate-target">
                  <PipelineStageSelectTrigger
                    stages={reassignmentTargets(deactivateStage.id)}
                    stageId={deactivateTargetId || undefined}
                    placeholder="Select stage"
                  />
                </SelectTrigger>
                <SelectContent>
                  <PipelineStageSelectItems stages={reassignmentTargets(deactivateStage.id)} />
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDeactivate();
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
