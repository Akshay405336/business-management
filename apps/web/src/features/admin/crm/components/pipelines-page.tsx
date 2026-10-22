'use client';

import { Loader2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  CRM_PIPELINES_TABLE_COLUMN_CLASS,
  CRM_PIPELINES_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import { deletePipeline, listPipelines, updatePipeline } from '../api/pipelines';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type { CrmPipeline } from '../types';
import { describeCrmError } from '../utils/errors';
import { CrmErrorAlert } from './crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { PipelineFormDialog } from './pipeline-form-dialog';
import { useAsyncAction } from '../hooks/use-async-action';

type PipelineStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const SEARCH_DEBOUNCE_MS = 400;

function activeStageCount(pipeline: CrmPipeline): number {
  return pipeline.stages.filter((stage) => stage.status === 'ACTIVE').length;
}

function formatStageCount(count: number): string {
  return `${count} stage${count === 1 ? '' : 's'}`;
}

function pipelineMatchesSearch(pipeline: CrmPipeline, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const haystack = [pipeline.name, pipeline.description].join(' ').toLowerCase();
  return haystack.includes(term);
}

export function PipelinesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [pipelines, setPipelines] = useState<readonly CrmPipeline[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PipelineStatusFilter>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmPipeline | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPipelines();
      setPipelines(result.pipelines);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (searchDraft === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const items = pipelines ?? [];
    return items
      .filter((pipeline) => {
        if (statusFilter !== 'ALL' && pipeline.status !== statusFilter) return false;
        return pipelineMatchesSearch(pipeline, search);
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [pipelines, search, statusFilter]);

  const hasAnyPipelines = (pipelines?.length ?? 0) > 0;
  const filtersActive = statusFilter !== 'ALL' || search.trim().length > 0;
  const searchActive = search.trim().length > 0;
  const totalPipelines = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalPipelines / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedPipelines = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: hasAnyPipelines ? filtered.length : 0,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: filtered.length });

  const emptyTitle = searchActive
    ? 'No pipelines match your search.'
    : filtersActive
      ? 'No pipelines match your filters'
      : 'No pipelines yet';

  const emptyDescription = searchActive
    ? 'Try different search terms or clear filters to see all pipelines.'
    : filtersActive
      ? 'Try different filters or clear them to see all pipelines.'
      : 'Add a pipeline to define how leads move through your workflow.';

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (pipeline: CrmPipeline) => {
    setEditingId(pipeline.id);
    setFormOpen(true);
  };

  const toggleStatus = async (pipeline: CrmPipeline) => {
    const next = pipeline.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => updatePipeline(pipeline.id, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Pipeline activated.' : 'Pipeline deactivated.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deletePipeline(target.id));
      toast.success(`Pipeline "${target.name}" deleted.`);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Pipeline' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Pipeline"
        description="Manage lead workflows and their stages."
        className="shadow-xs"
        titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
        toolbar={
          <>
            <form
              className={CRM_HEADER_SEARCH_FORM_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                <Input
                  className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                  placeholder="Search pipelines"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search pipelines by name or description"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PipelineStatusFilter)}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 sm:w-[9.375rem] sm:max-w-[10rem]"
                aria-label="Filter by status"
              >
                <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="h-9 shrink-0" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add pipeline
            </Button>
          </>
        }
      />

      {error && (pipelines?.length ?? 0) > 0 ? <CrmErrorAlert message={error} /> : null}

      <DataTable
        className="min-w-0 max-w-full"
        tableClassName="table-fixed"
        phase={tablePhase}
        colSpan={6}
        skeletonColumns={CRM_PIPELINES_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.name}>Pipeline name</TableHead>
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.description}>
              Description
            </TableHead>
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.stages}>Stages</TableHead>
            <TableHead className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.leads, 'text-right')}>
              Leads
            </TableHead>
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.status}>Status</TableHead>
            <TableHead
              className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.actions, 'text-right')}
            >
              Actions
            </TableHead>
          </TableRow>
        }
        empty={{
          title: emptyTitle,
          description: emptyDescription,
          secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={totalPipelines}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {pagedPipelines.map((pipeline) => {
          const stageCount = activeStageCount(pipeline);
          const description = pipeline.description.trim();
          return (
            <TableRow key={pipeline.id}>
              <TableCell
                className={cn(
                  CRM_PIPELINES_TABLE_COLUMN_CLASS.name,
                  'min-w-0 font-medium',
                )}
                title={pipeline.name}
              >
                <span className="block truncate">{pipeline.name}</span>
              </TableCell>
              <TableCell
                className={cn(
                  CRM_PIPELINES_TABLE_COLUMN_CLASS.description,
                  'min-w-0 whitespace-normal align-middle',
                )}
              >
                {description ? (
                  <span className="line-clamp-2 text-sm break-words">{description}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className={CRM_PIPELINES_TABLE_COLUMN_CLASS.stages}>
                <Badge variant="secondary" className="max-w-full font-normal tabular-nums">
                  {formatStageCount(stageCount)}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.leads, 'text-right tabular-nums')}
              >
                {pipeline.leadCount}
              </TableCell>
              <TableCell className={CRM_PIPELINES_TABLE_COLUMN_CLASS.status}>
                {pipeline.status === 'ACTIVE' ? (
                  <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
                    Active
                  </Badge>
                ) : (
                  <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.actions, 'min-w-0')}>
                <div className="flex shrink-0 items-center justify-end gap-0.5">
                  <TableIconButton
                    label={
                      pipeline.status === 'ACTIVE'
                        ? `Deactivate ${pipeline.name}`
                        : `Activate ${pipeline.name}`
                    }
                    tone={pipeline.status === 'ACTIVE' ? 'success' : 'danger'}
                    disabled={pending}
                    onClick={() => void toggleStatus(pipeline)}
                  >
                    <Power className="size-4" aria-hidden="true" />
                  </TableIconButton>
                  <TableIconButton
                    label={`Edit ${pipeline.name}`}
                    tone="primary"
                    disabled={pending}
                    onClick={() => openEdit(pipeline)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </TableIconButton>
                  <TableIconButton
                    label={`Delete ${pipeline.name}`}
                    tone="danger"
                    disabled={pending || pipeline.isDefault}
                    onClick={() => setDeleteTarget(pipeline)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </TableIconButton>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>

      <PipelineFormDialog
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={load}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? deleteTarget.leadCount > 0
                  ? `“${deleteTarget.name}” has ${deleteTarget.leadCount} lead${
                      deleteTarget.leadCount === 1 ? '' : 's'
                    }. Move or remove those leads before deleting this pipeline.`
                  : `“${deleteTarget.name}” and its stages will be permanently removed. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteTarget || deleteTarget.leadCount > 0 || pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Deleting…
                </>
              ) : (
                'Delete pipeline'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
