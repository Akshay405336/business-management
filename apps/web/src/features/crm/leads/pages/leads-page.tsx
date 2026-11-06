'use client';

import { leadListQuerySchema } from '@techwin/validation';
import { Eye, Kanban, LayoutList, Loader2, Plus, Search, SquarePen, Trash2, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  CRM_LEADS_TABLE_COLUMN_CLASS,
  CRM_LEADS_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { StageBadge } from '@/features/admin/components/stage-badge';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminToast } from '@/features/admin/components/toast';
import type { CrmLeadBulkActionResponse, CrmPipeline } from '@techwin/contracts';
import type { LeadListQuery } from '../types/lead.types';
import {
  useBulkDeleteLeads,
  useChangeLeadStage,
  useDeleteLead,
  useLeads,
} from '../hooks';
import { usePipelines } from '@/features/crm/pipelines/hooks';
import { formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { CrmEmptyState, CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_HEADER_SEARCH_FORM_CLASS,
  CRM_HEADER_TOOLBAR_ROW_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '../utils/lead-constants';
import { CRM_FORM_PLACEHOLDERS } from '../utils/form-placeholders';
import { KanbanBoard } from '../components/lead-kanban';
import { LeadCreateDialog } from '../components/lead-form-dialog';
import { LeadEditDialog } from '../components/lead-edit-dialog';
import { LeadDetailsDialog, type LeadDetailMode } from '../components/lead-details-dialog';
import { LeadImportDialog } from '../components/lead-import-dialog';
import { LeadTagBadge } from '../components/lead-tag-badge';
type ViewMode = 'list' | 'kanban';

const LEAD_SEARCH_DEBOUNCE_MS = 400;

function reportLeadBulkDeleteResult(
  toast: ReturnType<typeof useAdminToast>,
  result: CrmLeadBulkActionResponse,
) {
  const ok = result.succeededIds.length;
  const failed = result.failures.length;
  if (failed === 0) {
    toast.success(`${ok} lead${ok === 1 ? '' : 's'} deleted.`);
    return;
  }
  if (ok === 0) {
    toast.error(
      failed === 1
        ? (result.failures[0]?.message ?? 'Deletion failed.')
        : `${failed} leads could not be deleted.`,
    );
    return;
  }
  toast.error(`${ok} deleted, ${failed} failed. ${result.failures[0]?.message ?? ''}`.trim());
}

function orderActivePipelines(pipelines: readonly CrmPipeline[]): CrmPipeline[] {
  return pipelines
    .filter((pipeline) => pipeline.status === 'ACTIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function LeadsPage() {
  const router = useRouter();
  const { toPortalPath, dashboardBreadcrumb } = usePortalNavigation();
  const leadsHref = toPortalPath('/admin/leads');
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { changeLeadStage: changeLeadStageMutation, pending: stagePending } =
    useChangeLeadStage();
  const { deleteLead: deleteLeadMutation, pending: deletePending } = useDeleteLead();
  const { bulkDeleteLeads, pending: bulkDeletePending } = useBulkDeleteLeads();
  const pending = stagePending || deletePending || bulkDeletePending;

  const view: ViewMode = searchParams.get('view') === 'list' ? 'list' : 'kanban';
  const pipelineIdParam = searchParams.get('pipelineId') ?? '';
  const searchParam = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20') || 20));

  const [searchDraft, setSearchDraft] = useState(searchParam);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    pipelines,
    loading: pipelinesLoading,
    error: pipelinesError,
    refetch: refetchPipelines,
  } = usePipelines({ query: {} });
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);

  const openLeadDetail = (leadId: string, mode: LeadDetailMode) => {
    if (mode === 'edit') {
      setEditLeadId(leadId);
      setDetailLeadId(null);
      return;
    }
    setEditLeadId(null);
    setDetailLeadId(leadId);
  };
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createInitialStageId, setCreateInitialStageId] = useState<string | undefined>();
  const [selectedLeadIds, setSelectedLeadIds] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`${leadsHref}?${params.toString()}`);
    },
    [leadsHref, router, searchParams],
  );

  const applyLeadSearch = useCallback(
    (trimmed: string) => {
      setSelectedLeadIds(new Set());
      updateParams({ search: trimmed || null, page: '1' });
    },
    [updateParams],
  );

  useEffect(() => {
    setSearchDraft(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const trimmedDraft = searchDraft.trim();
    if (trimmedDraft === searchParam.trim()) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      applyLeadSearch(trimmedDraft);
    }, LEAD_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, searchParam, applyLeadSearch]);

  const pipelineList = useMemo(() => pipelines ?? [], [pipelines]);
  const activePipelines = useMemo(() => orderActivePipelines(pipelineList), [pipelineList]);

  const selectedPipeline = useMemo(() => {
    const fromParam = activePipelines.find((pipeline) => pipeline.id === pipelineIdParam);
    if (fromParam) return fromParam;
    return activePipelines[0] ?? null;
  }, [activePipelines, pipelineIdParam]);

  const selectedPipelineId = selectedPipeline?.id ?? '';

  useEffect(() => {
    if (pipelinesLoading) return;
    if (!selectedPipeline) {
      if (pipelineIdParam) {
        updateParams({ pipelineId: null, page: '1' });
      }
      return;
    }
    if (pipelineIdParam !== selectedPipeline.id) {
      updateParams({ pipelineId: selectedPipeline.id, page: '1' });
    }
  }, [pipelinesLoading, selectedPipeline, pipelineIdParam, updateParams]);

  const query = useMemo((): LeadListQuery | null => {
    if (!selectedPipelineId) return null;
    const trimmedSearch = searchParam.trim();
    const candidate: LeadListQuery = {
      pipelineId: selectedPipelineId,
      includeArchived: true,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(view === 'kanban'
        ? { kanbanOrder: true, page: 1, pageSize: 100 }
        : { page, pageSize }),
    };
    const parsed = leadListQuerySchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    return view === 'kanban'
      ? {
          pipelineId: selectedPipelineId,
          includeArchived: true,
          kanbanOrder: true,
          page: 1,
          pageSize: 100,
        }
      : {
          pipelineId: selectedPipelineId,
          includeArchived: true,
          page: 1,
          pageSize: 20,
        };
  }, [selectedPipelineId, view, page, pageSize, searchParam]);

  const {
    leads,
    total,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useLeads({ query, enabled: Boolean(query) });

  const stages = useMemo(
    () =>
      [...(selectedPipeline?.stages ?? [])]
        .filter((stage) => stage.status === 'ACTIVE')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [selectedPipeline?.stages],
  );

  const pipelineLeads = useMemo(
    () => leads.filter((lead) => lead.pipelineId === selectedPipelineId),
    [leads, selectedPipelineId],
  );

  const stageById = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);

  const reloadAll = useCallback(() => {
    refetchPipelines();
    refetchLeads();
  }, [refetchPipelines, refetchLeads]);

  const persistLeadKanbanMove = async ({
    leadId,
    stageId,
    beforeLeadId,
  }: {
    leadId: string;
    stageId: string;
    beforeLeadId: string | null;
  }) => {
    const lead = pipelineLeads.find((item) => item.id === leadId);
    const nextStageName = stages.find((stage) => stage.id === stageId)?.name ?? 'stage';
    const stageChanged = lead?.stageId !== stageId;
    try {
      await changeLeadStageMutation(leadId, { stageId, beforeLeadId });
      if (stageChanged) toast.success(`Lead moved to ${nextStageName}.`);
      refetchLeads();
    } catch (failure) {
      toast.error(describeCrmError(failure));
      throw failure;
    }
  };

  const moveLeadToStage = async (leadId: string, nextStageId: string) => {
    const lead = pipelineLeads.find((item) => item.id === leadId);
    if (lead?.stageId === nextStageId) return;
    await persistLeadKanbanMove({ leadId, stageId: nextStageId, beforeLeadId: null });
  };

  const deleteLeadTarget = useMemo(
    () => pipelineLeads.find((lead) => lead.id === deleteLeadId) ?? null,
    [pipelineLeads, deleteLeadId],
  );

  const confirmDeleteLead = async () => {
    if (!deleteLeadId) return;
    try {
      await deleteLeadMutation(deleteLeadId);
      if (detailLeadId === deleteLeadId) setDetailLeadId(null);
      setDeleteLeadId(null);
      toast.success('Lead deleted.');
      refetchLeads();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const openCreate = (preferredStageId?: string) => {
    if (!selectedPipeline) return;
    setCreateInitialStageId(preferredStageId);
    setCreateOpen(true);
  };

  const breadcrumbs = [
    dashboardBreadcrumb,
    { label: 'CRM' },
    { label: 'Leads' },
  ] as const;

  const pageError = pipelinesError ?? leadsError;
  const listTablePhase = deriveDataTablePhase({
    loading: (pipelinesLoading || leadsLoading) && view === 'list',
    error: pageError,
    rowCount: selectedPipeline ? pipelineLeads.length : 0,
  });
  const listTableRefreshing = isDataTableRefreshing({
    loading: leadsLoading && view === 'list',
    rowCount: pipelineLeads.length,
  });

  const onPipelineChange = (nextPipelineId: string) => {
    setSelectedLeadIds(new Set());
    updateParams({ pipelineId: nextPipelineId, page: '1' });
  };

  const pageLeadIds = useMemo(() => pipelineLeads.map((lead) => lead.id), [pipelineLeads]);
  const selectedCount = selectedLeadIds.size;
  const allPageLeadsSelected =
    pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedLeadIds.has(id));
  const somePageLeadsSelected =
    pageLeadIds.some((id) => selectedLeadIds.has(id)) && !allPageLeadsSelected;

  const toggleAllPageLeads = () => {
    setSelectedLeadIds((current) => {
      const next = new Set(current);
      if (allPageLeadsSelected) {
        for (const id of pageLeadIds) next.delete(id);
      } else {
        for (const id of pageLeadIds) next.add(id);
      }
      return next;
    });
  };

  const toggleLeadSelected = (leadId: string) => {
    setSelectedLeadIds((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const confirmBulkDeleteLeads = async () => {
    if (selectedCount === 0) return;
    const leadIds = [...selectedLeadIds];
    setBulkDeleteOpen(false);
    try {
      const result = await bulkDeleteLeads({ leadIds });
      if (!result) return;
      reportLeadBulkDeleteResult(toast, result);
      if (result.succeededIds.length > 0) {
        setSelectedLeadIds(new Set());
        refetchLeads();
        refetchPipelines();
        if (detailLeadId && result.succeededIds.includes(detailLeadId)) setDetailLeadId(null);
        if (editLeadId && result.succeededIds.includes(editLeadId)) setEditLeadId(null);
      }
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const searchActive = searchParam.trim().length > 0;

  const clearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchDraft('');
    applyLeadSearch('');
  };

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Leads"
            description=""
            descriptionClassName="hidden"
            className="rounded-none border-0 bg-card shadow-none"
            titleSectionClassName="shrink-0"
            headerRowClassName="gap-x-3 gap-y-2 lg:flex-nowrap lg:items-center"
            toolbarRowClassName={CRM_HEADER_TOOLBAR_ROW_CLASS}
            toolbar={
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="min-w-[10rem] w-[min(100%,14rem)] max-w-[14rem] shrink-0">
                      <Select
                        value={selectedPipelineId || undefined}
                        onValueChange={onPipelineChange}
                        disabled={pipelinesLoading || activePipelines.length === 0}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-9 w-full min-w-0 rounded-lg py-0',
                            '[&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:text-left',
                          )}
                          aria-label="Pipeline"
                          title={selectedPipeline?.name}
                        >
                          <SelectValue placeholder="Select pipeline" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(100vw-2rem,20rem)]">
                          {activePipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {selectedPipeline ? (
                    <TooltipContent side="bottom">{selectedPipeline.name}</TooltipContent>
                  ) : null}
                </Tooltip>
                <form
                  className={CRM_HEADER_SEARCH_FORM_CLASS}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    applyLeadSearch(searchDraft.trim());
                  }}
                >
                  <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                    <Input
                      className={cn(
                        CRM_PIPELINE_SEARCH_INPUT_CLASS,
                        inputGroupPaddingClass({ leading: true }),
                      )}
                      placeholder={CRM_FORM_PLACEHOLDERS.searchLeads}
                      value={searchDraft}
                      disabled={!selectedPipeline}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search leads"
                    />
                  </InputGroup>
                </form>
                <Tabs
                  value={view}
                  onValueChange={(value) => {
                    setSelectedLeadIds(new Set());
                    updateParams({ view: value === 'list' ? 'list' : null, page: '1' });
                  }}
                  className="shrink-0"
                >
                  <TabsList className="h-9 shrink-0">
                    <TabsTrigger
                      value="list"
                      className="flex-none px-2.5"
                      aria-label="List view"
                      title="List view"
                    >
                      <LayoutList className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sr-only">List view</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="kanban"
                      className="flex-none px-2.5"
                      aria-label="Kanban view"
                      title="Kanban view"
                    >
                      <Kanban className="size-4 shrink-0" aria-hidden="true" />
                      <span className="sr-only">Kanban view</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={activePipelines.length === 0}
                  onClick={() => setImportOpen(true)}
                >
                  <Upload aria-hidden="true" />
                  Import
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  disabled={!selectedPipeline || stages.length === 0}
                  onClick={() => openCreate()}
                >
                  <Plus aria-hidden="true" />
                  New Lead
                </Button>
              </>
            }
          />

          {pageError && pipelineLeads.length > 0 ? (
            <div className="border-border border-b px-4 sm:px-5">
              <CrmErrorAlert message={pageError} />
            </div>
          ) : null}

          <div aria-hidden className="table-header-edge" />

          {pipelinesLoading ? (
            <div className="px-4 py-6 sm:px-5">
              <CrmLoadingRows rows={4} />
            </div>
          ) : activePipelines.length === 0 ? (
            <div className="px-4 pb-6 sm:px-5">
              <CrmEmptyState
                title="No active pipelines"
                description="Activate a pipeline on the Pipeline page before managing leads."
              />
            </div>
          ) : leadsLoading && view === 'kanban' ? (
            <div className="px-4 py-6 sm:px-5">
              <CrmLoadingRows rows={6} />
            </div>
          ) : view === 'list' ? (
            <>
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
                      onClick={() => setSelectedLeadIds(new Set())}
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
              tableClassName="table-fixed min-w-[52rem] [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
              tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
              phase={listTablePhase}
              colSpan={8}
              skeletonColumns={CRM_LEADS_TABLE_SKELETON}
              header={
                <TableRow className="hover:bg-transparent">
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.select}>
                    <Checkbox
                      aria-label="Select all leads on this page"
                      checked={
                        allPageLeadsSelected ? true : somePageLeadsSelected ? 'indeterminate' : false
                      }
                      disabled={pageLeadIds.length === 0}
                      onCheckedChange={() => toggleAllPageLeads()}
                    />
                  </TableHead>
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.lead}>Lead</TableHead>
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.phone}>Phone</TableHead>
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.email}>Email</TableHead>
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.stage}>Stage</TableHead>
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.priority}>Priority</TableHead>
                  <TableHead
                    className={cn(
                      CRM_LEADS_TABLE_COLUMN_CLASS.value,
                      'text-right whitespace-nowrap',
                    )}
                  >
                    Value
                  </TableHead>
                  <TableHead
                    className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.actions, 'text-right')}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              }
              empty={{
                title: searchActive
                  ? 'No results match your search'
                  : 'No leads in this pipeline',
                description: searchActive
                  ? 'Try different keywords or clear search to see all leads in this pipeline.'
                  : stages.length === 0
                    ? 'Add active stages to this pipeline before creating leads.'
                    : 'Create a lead to start tracking opportunities in this workflow.',
                secondaryAction: searchActive
                  ? { label: 'Clear search', onClick: clearSearch }
                  : undefined,
              }}
              errorMessage={pageError}
              onRetry={() => void reloadAll()}
              refreshing={listTableRefreshing}
              footer={
                <TablePagination
                  className="border-border border-t px-4 py-3 sm:px-5"
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  loading={listTablePhase === 'initial-loading'}
                  hideWhenEmpty={false}
                  onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
                  onPageSizeChange={(nextSize) =>
                    updateParams({ pageSize: String(nextSize), page: '1' })
                  }
                />
              }
            >
              {pipelineLeads.map((lead) => {
                const displayName = lead.fullName.trim() || 'Unnamed lead';
                const contactPhone = lead.phone?.trim() ?? '';
                const contactEmail = lead.email?.trim() ?? '';
                return (
                  <TableRow key={lead.id} className="border-0">
                    <TableCell className={CRM_LEADS_TABLE_COLUMN_CLASS.select}>
                      <Checkbox
                        aria-label={`Select ${displayName}`}
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => toggleLeadSelected(lead.id)}
                      />
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.lead, 'min-w-0 align-top')}>
                      <div className="grid max-w-full min-w-0 gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-foreground block truncate text-[13px] font-semibold">
                              {displayName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{displayName}</TooltipContent>
                        </Tooltip>
                        {lead.convertedClientId ? (
                          <Badge variant="success" className="mt-0.5 h-5 w-fit px-1.5 text-[10px]">
                            Converted
                          </Badge>
                        ) : null}
                        {(lead.leadTags?.length ?? 0) > 0 ? (
                          <div className="mt-0.5 flex max-w-full flex-wrap gap-0.5">
                            {lead.leadTags.slice(0, 2).map((tag) => (
                              <LeadTagBadge key={tag.id} tag={tag} />
                            ))}
                            {lead.leadTags.length > 2 ? (
                              <span className="text-muted-foreground text-[10px]">
                                +{lead.leadTags.length - 2}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.phone, 'align-middle')}>
                      {contactPhone ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-foreground inline-block max-w-full truncate text-sm tabular-nums whitespace-nowrap">
                              {contactPhone}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{contactPhone}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/45 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.email, 'min-w-0 align-middle')}>
                      {contactEmail ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground block truncate text-sm">
                              {contactEmail}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{contactEmail}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/45 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.stage, 'align-middle')}>
                      <StageBadge stage={stageById.get(lead.stageId)} />
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.priority, 'align-middle')}>
                      <PriorityBadge priority={lead.priority} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        CRM_LEADS_TABLE_COLUMN_CLASS.value,
                        'text-right tabular-nums align-middle',
                      )}
                    >
                      {formatMoney(lead.estimatedValue, lead.currency)}
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.actions, 'min-w-0')}>
                      <div className="flex w-full shrink-0 items-center justify-end gap-1">
                        <TableIconButton
                          label={`View ${lead.fullName}`}
                          onClick={() => openLeadDetail(lead.id, 'view')}
                        >
                          <Eye className="size-4 stroke-[2]" aria-hidden="true" />
                        </TableIconButton>
                        <TableIconButton
                          label={`Edit ${lead.fullName}`}
                          tone="default"
                          className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                          disabled={Boolean(lead.convertedClientId)}
                          onClick={() => openLeadDetail(lead.id, 'edit')}
                        >
                          <SquarePen className="size-4" aria-hidden="true" />
                        </TableIconButton>
                        <TableIconButton
                          label={`Delete ${lead.fullName}`}
                          tone="default"
                          className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
                          disabled={pending}
                          onClick={() => setDeleteLeadId(lead.id)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </TableIconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTable>
            </>
          ) : selectedPipeline && stages.length === 0 ? (
            <div className="px-4 pb-6 sm:px-5">
              <CrmEmptyState
                title="No active stages"
                description="Add at least one active stage to this pipeline on the Pipeline page."
              />
            </div>
          ) : selectedPipeline ? (
            <div className="min-w-0 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
              <KanbanBoard
                stages={stages}
                leads={pipelineLeads}
                disabled={pending}
                onPersistMove={persistLeadKanbanMove}
                onAddLead={(stageId) => openCreate(stageId)}
                onView={(leadId) => openLeadDetail(leadId, 'view')}
                onEdit={(leadId) => openLeadDetail(leadId, 'edit')}
                onDelete={setDeleteLeadId}
                onStageChange={(leadId, stageId) => void moveLeadToStage(leadId, stageId)}
              />
            </div>
          ) : null}
        </div>
      </section>

      <LeadDetailsDialog
        leadId={detailLeadId}
        mode="view"
        pipelines={pipelineList}
        open={detailLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailLeadId(null);
        }}
        onUpdated={() => refetchLeads()}
        onEditLead={(leadId) => openLeadDetail(leadId, 'edit')}
      />

      <LeadEditDialog
        leadId={editLeadId}
        pipelines={pipelineList}
        open={editLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setEditLeadId(null);
        }}
        onUpdated={() => refetchLeads()}
        onError={(message) => {
          toast.error(message);
        }}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} selected lead{selectedCount === 1 ? '' : 's'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected leads will be permanently deleted, including
              their activity history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={selectedCount === 0 || pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmBulkDeleteLeads();
              }}
            >
              {bulkDeletePending ? (
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

      <AlertDialog
        open={deleteLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteLeadId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteLeadTarget ? (
                <>
                  Delete <span className="text-foreground font-medium">{deleteLeadTarget.fullName}</span>
                  {deleteLeadTarget.referenceNumber ? ` (${deleteLeadTarget.referenceNumber})` : ''}? This
                  removes the lead and its activity history. This action cannot be undone.
                </>
              ) : (
                'This removes the lead and its activity history. This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteLead();
              }}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        pipelines={activePipelines}
        defaultPipelineId={selectedPipelineId}
        onImported={() => {
          void refetchLeads();
          void refetchPipelines();
        }}
      />

      <LeadCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipeline={selectedPipeline}
        stages={stages}
        initialStageId={createInitialStageId}
        onCreated={() => refetchLeads()}
        onError={(message) => {
          toast.error(message);
        }}
      />
    </div>
  );
}
