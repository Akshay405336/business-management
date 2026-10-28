'use client';

import {
  ArrowUpDown,
  Download,
  ListFilter,
  Loader2,
  SquarePen,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '../constants';
import {
  bulkDeletePipelines,
  bulkUpdatePipelineStatus,
  deletePipeline,
  listPipelines,
  updatePipeline,
} from '../api/pipelines';
import type { CrmPipeline, CrmPipelineBulkActionResponse } from '../types';
import { describeCrmError } from '../utils/errors';
import { CrmErrorAlert } from './crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { PipelineFormDialog } from './pipeline-form-dialog';
import { PipelineStageDots } from './pipeline-stage-dots';
import { useAsyncAction } from '../hooks/use-async-action';

type PipelineStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type PipelineSortKey = 'default' | 'name-asc' | 'name-desc' | 'leads-desc' | 'leads-asc';

const SEARCH_DEBOUNCE_MS = 400;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadPipelinesCsv(pipelines: readonly CrmPipeline[], filename = 'pipelines.csv') {
  const headers = ['Name', 'Description', 'Status', 'Default', 'Sort order', 'Leads', 'Stages'];
  const rows = pipelines.map((pipeline) =>
    [
      escapeCsvCell(pipeline.name),
      escapeCsvCell(pipeline.description),
      pipeline.status,
      pipeline.isDefault ? 'Yes' : 'No',
      String(pipeline.sortOrder),
      String(pipeline.leadCount),
      String(pipeline.stages.length),
    ].join(','),
  );
  const content = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportBulkActionResult(
  toast: ReturnType<typeof useAdminToast>,
  result: CrmPipelineBulkActionResponse,
  successPastTense: string,
) {
  const ok = result.succeededIds.length;
  const failed = result.failures.length;
  if (failed === 0) {
    toast.success(`${ok} pipeline${ok === 1 ? '' : 's'} ${successPastTense}.`);
    return;
  }
  if (ok === 0) {
    toast.error(
      failed === 1
        ? (result.failures[0]?.message ?? 'Action failed.')
        : `${failed} pipelines could not be updated.`,
    );
    return;
  }
  toast.error(`${ok} succeeded, ${failed} failed. ${result.failures[0]?.message ?? ''}`.trim());
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
  const [sortKey, setSortKey] = useState<PipelineSortKey>('default');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmPipeline | null>(null);
  const [statusTarget, setStatusTarget] = useState<CrmPipeline | null>(null);
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [bulkStatusTarget, setBulkStatusTarget] = useState<'ACTIVE' | 'INACTIVE' | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPipelines({
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setPipelines(result.pipelines);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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
  }, [statusFilter, sortKey]);

  useEffect(() => {
    setSelectedPipelineIds(new Set());
  }, [search, statusFilter]);

  const sortedFiltered = useMemo(() => {
    const items = [...(pipelines ?? [])];
    switch (sortKey) {
      case 'name-asc':
        return items.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return items.sort((a, b) => b.name.localeCompare(a.name));
      case 'leads-desc':
        return items.sort(
          (a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name),
        );
      case 'leads-asc':
        return items.sort(
          (a, b) => a.leadCount - b.leadCount || a.name.localeCompare(b.name),
        );
      default:
        return items.sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );
    }
  }, [pipelines, sortKey]);

  const selectedCount = selectedPipelineIds.size;

  const hasAnyPipelines = (pipelines?.length ?? 0) > 0;
  const filtersActive = statusFilter !== 'ALL' || search.trim().length > 0;
  const searchActive = search.trim().length > 0;
  const totalPipelines = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalPipelines / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedPipelines = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, pageSize, safePage]);

  const pagedPipelineIds = useMemo(
    () => pagedPipelines.map((pipeline) => pipeline.id),
    [pagedPipelines],
  );

  const allPagePipelinesSelected =
    pagedPipelineIds.length > 0 &&
    pagedPipelineIds.every((id) => selectedPipelineIds.has(id));
  const somePagePipelinesSelected =
    pagedPipelineIds.some((id) => selectedPipelineIds.has(id)) && !allPagePipelinesSelected;

  const toggleAllPagePipelines = () => {
    setSelectedPipelineIds((current) => {
      const next = new Set(current);
      if (allPagePipelinesSelected) {
        for (const id of pagedPipelineIds) next.delete(id);
      } else {
        for (const id of pagedPipelineIds) next.add(id);
      }
      return next;
    });
  };

  const togglePipelineSelected = (pipelineId: string) => {
    setSelectedPipelineIds((current) => {
      const next = new Set(current);
      if (next.has(pipelineId)) next.delete(pipelineId);
      else next.add(pipelineId);
      return next;
    });
  };

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: hasAnyPipelines ? sortedFiltered.length : 0,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: sortedFiltered.length });

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

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const pipeline = statusTarget;
    const next = pipeline.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusTarget(null);
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

  const confirmBulkStatus = async () => {
    if (!bulkStatusTarget || selectedCount === 0) return;
    const status = bulkStatusTarget;
    const pipelineIds = [...selectedPipelineIds];
    setBulkStatusTarget(null);
    try {
      const result = await run(() => bulkUpdatePipelineStatus({ pipelineIds, status }));
      if (!result) return;
      reportBulkActionResult(
        toast,
        result,
        status === 'ACTIVE' ? 'activated' : 'deactivated',
      );
      setSelectedPipelineIds(new Set());
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedCount === 0) return;
    const pipelineIds = [...selectedPipelineIds];
    setBulkDeleteOpen(false);
    try {
      const result = await run(() => bulkDeletePipelines({ pipelineIds }));
      if (!result) return;
      reportBulkActionResult(toast, result, 'deleted');
      setSelectedPipelineIds(new Set());
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

  const handleExport = () => {
    if (sortedFiltered.length === 0) {
      toast.error('No pipelines to export.');
      return;
    }
    downloadPipelinesCsv(sortedFiltered);
  };

  const statusFilterActive = statusFilter !== 'ALL';
  const sortActive = sortKey !== 'default';
  const statusChangeIsDeactivate = statusTarget?.status === 'ACTIVE';

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Pipeline' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
        <CrmToolbarHeader
          title="Pipeline"
          description="Manage lead workflows and their stages."
          className="rounded-none border-0 bg-card shadow-none"
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
                  className={cn(
                    CRM_PIPELINE_SEARCH_INPUT_CLASS,
                    inputGroupPaddingClass({ leading: true }),
                  )}
                  placeholder="Search pipelines"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search pipelines by name or description"
                />
              </InputGroup>
            </form>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        'shrink-0',
                        statusFilterActive && 'border-primary/40 bg-primary/5',
                      )}
                      aria-label="Filter pipelines"
                    >
                      <ListFilter aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Filter</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as PipelineStatusFilter)}
                >
                  <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ACTIVE">Active</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="INACTIVE">Inactive</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn('shrink-0', sortActive && 'border-primary/40 bg-primary/5')}
                      aria-label="Sort pipelines"
                    >
                      <ArrowUpDown aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Sort</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={(value) => setSortKey(value as PipelineSortKey)}
                >
                  <DropdownMenuRadioItem value="default">Default order</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name-asc">Name (A–Z)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name-desc">Name (Z–A)</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="leads-desc">Most leads</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="leads-asc">Fewest leads</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-input h-9 shrink-0 border bg-neutral-100 text-foreground shadow-none hover:bg-neutral-200/80"
              onClick={handleExport}
            >
              <Download aria-hidden="true" />
              Export
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
              onClick={openCreate}
            >
              <Plus aria-hidden="true" />
              Add pipeline
            </Button>
          </>
          }
        />

        {error && (pipelines?.length ?? 0) > 0 ? (
          <div className="border-border border-b px-4 sm:px-5">
            <CrmErrorAlert message={error} />
          </div>
        ) : null}

        <div aria-hidden className="table-header-edge" />

        {selectedCount > 0 ? (
          <div className="border-border flex flex-wrap items-center gap-2 border-b bg-[#f7faff] px-4 py-2.5 sm:px-5">
            <span className="text-foreground text-sm font-medium tabular-nums">
              {selectedCount} selected
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                disabled={pending}
                onClick={() => setBulkStatusTarget('ACTIVE')}
              >
                <ToggleLeft className="size-4" aria-hidden="true" />
                Activate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-red-200 bg-white text-red-800 hover:bg-red-50"
                disabled={pending}
                onClick={() => setBulkStatusTarget('INACTIVE')}
              >
                <ToggleRight className="size-4" aria-hidden="true" />
                Deactivate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                disabled={pending}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                disabled={pending}
                onClick={() => setSelectedPipelineIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <DataTable
          frame="flush"
          headerVariant="plain"
          className="min-w-0 max-w-full gap-0"
          tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
          tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
          phase={tablePhase}
        colSpan={7}
        skeletonColumns={CRM_PIPELINES_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.select}>
              <Checkbox
                aria-label="Select all pipelines on this page"
                checked={
                  allPagePipelinesSelected
                    ? true
                    : somePagePipelinesSelected
                      ? 'indeterminate'
                      : false
                }
                disabled={pagedPipelineIds.length === 0}
                onCheckedChange={() => toggleAllPagePipelines()}
              />
            </TableHead>
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.name}>Pipeline name</TableHead>
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.description}>
              Description
            </TableHead>
            <TableHead className={CRM_PIPELINES_TABLE_COLUMN_CLASS.stages}>Stages</TableHead>
            <TableHead
              className={cn(
                CRM_PIPELINES_TABLE_COLUMN_CLASS.leads,
                'text-right whitespace-nowrap',
              )}
            >
              Leads
            </TableHead>
            <TableHead className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
              Status
            </TableHead>
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
              className="border-border border-t px-4 py-3 sm:px-5"
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
          const description = pipeline.description.trim();
          return (
            <TableRow key={pipeline.id} className="border-0">
              <TableCell className={CRM_PIPELINES_TABLE_COLUMN_CLASS.select}>
                <Checkbox
                  aria-label={`Select ${pipeline.name}`}
                  checked={selectedPipelineIds.has(pipeline.id)}
                  onCheckedChange={() => togglePipelineSelected(pipeline.id)}
                />
              </TableCell>
              <TableCell
                className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.name, 'min-w-0')}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-foreground block truncate text-[13px] font-semibold">
                      {pipeline.name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{pipeline.name}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell
                className={cn(
                  CRM_PIPELINES_TABLE_COLUMN_CLASS.description,
                  'min-w-0 whitespace-normal align-middle',
                )}
              >
                {description ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground line-clamp-2 text-sm break-words">
                        {description}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      {description}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell
                className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.stages, 'align-middle')}
              >
                <PipelineStageDots stages={pipeline.stages} />
              </TableCell>
              <TableCell
                className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.leads, 'text-right tabular-nums')}
              >
                {pipeline.leadCount}
              </TableCell>
              <TableCell className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.status, 'text-left')}>
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
              <TableCell className={cn(CRM_PIPELINES_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
                <div className="flex w-full shrink-0 items-center justify-end gap-1">
                  <TableIconButton
                    label={
                      pipeline.status === 'ACTIVE'
                        ? `Deactivate ${pipeline.name}`
                        : `Activate ${pipeline.name}`
                    }
                    tone="default"
                    className={
                      pipeline.status === 'ACTIVE'
                        ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                        : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                    }
                    disabled={pending}
                    onClick={() => setStatusTarget(pipeline)}
                  >
                    {pipeline.status === 'ACTIVE' ? (
                      <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                    ) : (
                      <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                    )}
                  </TableIconButton>
                  <TableIconButton
                    label={`Edit ${pipeline.name}`}
                    tone="default"
                    className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                    disabled={pending}
                    onClick={() => openEdit(pipeline)}
                  >
                    <SquarePen className="size-4" aria-hidden="true" />
                  </TableIconButton>
                  <TableIconButton
                    label={
                      pipeline.isDefault
                        ? `Default pipeline “${pipeline.name}” cannot be deleted`
                        : `Delete ${pipeline.name}`
                    }
                    tone="default"
                    className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black disabled:opacity-100 disabled:hover:bg-transparent"
                    disabled={pending}
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
        </div>
      </section>

      <PipelineFormDialog
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={load}
      />

      <AlertDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate pipeline?' : 'Activate pipeline?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? statusChangeIsDeactivate
                  ? `“${statusTarget.name}” will be marked inactive. Existing leads stay in this pipeline, but it will not be used for new lead workflows until you activate it again.`
                  : `“${statusTarget.name}” will be marked active and available for lead workflows.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!statusTarget || pending}
              className={
                statusChangeIsDeactivate
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                void confirmStatusChange();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {statusChangeIsDeactivate ? 'Deactivating…' : 'Activating…'}
                </>
              ) : statusChangeIsDeactivate ? (
                'Deactivate'
              ) : (
                'Activate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkStatusTarget !== null}
        onOpenChange={(open) => !open && setBulkStatusTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkStatusTarget === 'INACTIVE'
                ? 'Deactivate selected pipelines?'
                : 'Activate selected pipelines?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkStatusTarget === 'INACTIVE'
                ? `${selectedCount} pipeline${selectedCount === 1 ? '' : 's'} will be marked inactive. Existing leads stay in those pipelines until you activate them again.`
                : `${selectedCount} pipeline${selectedCount === 1 ? '' : 's'} will be marked active and available for lead workflows.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!bulkStatusTarget || pending}
              className={
                bulkStatusTarget === 'INACTIVE'
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                void confirmBulkStatus();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {bulkStatusTarget === 'INACTIVE' ? 'Deactivating…' : 'Activating…'}
                </>
              ) : bulkStatusTarget === 'INACTIVE' ? (
                'Deactivate'
              ) : (
                'Activate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected pipelines?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${selectedCount} pipeline${selectedCount === 1 ? '' : 's'} selected. Empty non-default pipelines will be permanently removed. The default pipeline and pipelines with leads cannot be deleted and will be skipped with an error message.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={selectedCount === 0 || pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmBulkDelete();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? deleteTarget.isDefault
                  ? `“${deleteTarget.name}” is the default pipeline and cannot be deleted. Set another pipeline as default first, or remove it only after it is no longer the default.`
                  : deleteTarget.leadCount > 0
                    ? `“${deleteTarget.name}” has ${deleteTarget.leadCount} lead${
                        deleteTarget.leadCount === 1 ? '' : 's'
                      }. Move or remove those leads before you can delete this pipeline.`
                    : `“${deleteTarget.name}” and all of its stages will be permanently removed. This action cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{deleteTarget?.isDefault ? 'Close' : 'Cancel'}</AlertDialogCancel>
            {deleteTarget?.isDefault ? null : (
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
                  'Delete'
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
