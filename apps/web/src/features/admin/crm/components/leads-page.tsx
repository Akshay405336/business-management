'use client';

import { API_ERROR_CODES } from '@techwin/contracts';
import { leadListQuerySchema } from '@techwin/validation';
import { isApiError } from '@/shared/api/api-error';
import { Eye, Kanban, LayoutList, Loader2, Plus, Search, SquarePen, Trash2 } from 'lucide-react';
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
import { formatDateTime } from '@/shared/lib/format';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { changeLeadStage, deleteLead, listLeads } from '../api/leads';
import { listPipelines } from '../api/pipelines';
import type { CrmLead, CrmPipeline, LeadListQuery } from '../types';
import { formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { CrmEmptyState, CrmErrorAlert, CrmLoadingRows } from './crm-feedback';
import { CrmToolbarHeader } from './crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '../constants';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { KanbanBoard } from './kanban-board';
import { LeadCreateDialog } from './lead-create-dialog';
import { LeadEditDialog } from './lead-edit-dialog';
import { LeadDetailDialog, type LeadDetailMode } from './lead-detail-sheet';
import { useAsyncAction } from '../hooks/use-async-action';

type ViewMode = 'list' | 'kanban';

const LEAD_SEARCH_DEBOUNCE_MS = 400;

function orderActivePipelines(pipelines: readonly CrmPipeline[]): CrmPipeline[] {
  return pipelines
    .filter((pipeline) => pipeline.status === 'ACTIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const view: ViewMode = searchParams.get('view') === 'list' ? 'list' : 'kanban';
  const pipelineIdParam = searchParams.get('pipelineId') ?? '';
  const searchParam = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20') || 20));

  const [searchDraft, setSearchDraft] = useState(searchParam);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pipelines, setPipelines] = useState<readonly CrmPipeline[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(true);
  const [pipelinesError, setPipelinesError] = useState<string | null>(null);
  const [leads, setLeads] = useState<readonly CrmLead[]>([]);
  const [total, setTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
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
  const [createInitialStageId, setCreateInitialStageId] = useState<string | undefined>();

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/leads?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    setSearchDraft(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const trimmedDraft = searchDraft.trim();
    if (trimmedDraft === searchParam.trim()) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      updateParams({ search: trimmedDraft || null, page: '1' });
    }, LEAD_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, searchParam, updateParams]);

  const activePipelines = useMemo(() => orderActivePipelines(pipelines), [pipelines]);

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

  const loadPipelines = useCallback(async () => {
    setPipelinesLoading(true);
    try {
      const pipelineResult = await listPipelines();
      setPipelines(pipelineResult.pipelines);
      setPipelinesError(null);
    } catch (failure) {
      setPipelinesError(describeCrmError(failure));
    } finally {
      setPipelinesLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    if (!query) {
      setLeads([]);
      setTotal(0);
      return;
    }
    setLeads([]);
    setLeadsLoading(true);
    try {
      let leadQuery = query;
      let leadResult;
      try {
        leadResult = await listLeads(leadQuery);
      } catch (failure) {
        const canRetryWithoutKanbanOrder =
          isApiError(failure) &&
          failure.code === API_ERROR_CODES.VALIDATION_FAILED &&
          leadQuery.kanbanOrder === true;
        if (!canRetryWithoutKanbanOrder) throw failure;
        leadQuery = { ...leadQuery, kanbanOrder: undefined };
        leadResult = await listLeads(leadQuery);
      }

      setLeads(leadResult.items);
      setTotal(leadResult.total);
      setLeadsError(null);
    } catch (failure) {
      setLeadsError(describeCrmError(failure));
    } finally {
      setLeadsLoading(false);
    }
  }, [query]);

  const reloadAll = useCallback(async () => {
    await loadPipelines();
    await loadLeads();
  }, [loadPipelines, loadLeads]);

  useEffect(() => {
    void loadPipelines();
  }, [loadPipelines]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

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
      await run(() => changeLeadStage(leadId, { stageId, beforeLeadId }));
      if (stageChanged) toast.success(`Lead moved to ${nextStageName}.`);
      await loadLeads();
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
    setLeadsError(null);
    try {
      await run(() => deleteLead(deleteLeadId));
      if (detailLeadId === deleteLeadId) setDetailLeadId(null);
      setDeleteLeadId(null);
      toast.success('Lead deleted.');
      await loadLeads();
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
    { label: 'Dashboard', href: '/admin/dashboard' },
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
    updateParams({ pipelineId: nextPipelineId, page: '1' });
  };

  const searchActive = searchParam.trim().length > 0;

  const clearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchDraft('');
    updateParams({ search: null, page: '1' });
  };

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Leads"
            description="Track opportunities in a list or kanban board."
            className="rounded-none border-0 bg-card shadow-none"
            headerRowClassName="flex-nowrap items-center gap-3 min-w-0 overflow-hidden"
            titleSectionClassName="min-w-0 flex-shrink overflow-hidden sm:max-w-[11rem] lg:max-w-[13rem]"
            descriptionClassName="hidden truncate lg:block"
            toolbarRowClassName="ml-auto flex min-w-0 flex-1 flex-nowrap items-center justify-end overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            toolbar={
              <div className="flex w-max max-w-full flex-nowrap items-center justify-end gap-2 pl-1">
                <div className="w-[14rem] shrink-0 sm:w-[15.5rem]">
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
                    >
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                  <SelectContent>
                    {activePipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  </Select>
                </div>
                <form
                  className="w-[11.5rem] shrink-0 sm:w-[12.5rem]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    updateParams({ search: searchDraft.trim() || null, page: '1' });
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
                  onValueChange={(value) =>
                    updateParams({ view: value === 'list' ? 'list' : null, page: '1' })
                  }
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
                  size="sm"
                  className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  disabled={!selectedPipeline || stages.length === 0}
                  onClick={() => openCreate()}
                >
                  <Plus aria-hidden="true" />
                  New Lead
                </Button>
              </div>
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
            <DataTable
              frame="flush"
              headerVariant="plain"
              className="min-w-0 max-w-full gap-0"
              tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
              tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
              phase={listTablePhase}
              colSpan={7}
              skeletonColumns={CRM_LEADS_TABLE_SKELETON}
              header={
                <TableRow className="hover:bg-transparent">
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.lead}>Lead</TableHead>
                  <TableHead className={CRM_LEADS_TABLE_COLUMN_CLASS.contact}>Contact</TableHead>
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
                  <TableHead className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.activity, 'whitespace-nowrap')}>
                    Last activity
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
                action:
                  !searchActive && stages.length > 0 && selectedPipeline
                    ? { label: 'Create lead', onClick: () => openCreate() }
                    : undefined,
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
                const subject = lead.subject.trim() || lead.fullName;
                const contactPhone = lead.phone?.trim() ?? '';
                const contactEmail = lead.email?.trim() ?? '';
                return (
                  <TableRow key={lead.id} className="border-0">
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.lead, 'min-w-0')}>
                      <div className="grid min-w-0 gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-foreground block truncate text-[13px] font-semibold">
                              {subject}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">{subject}</TooltipContent>
                        </Tooltip>
                        {lead.subject.trim() ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground block truncate text-sm">
                                {lead.fullName}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">{lead.fullName}</TooltipContent>
                          </Tooltip>
                        ) : null}
                        {lead.convertedClientId ? (
                          <Badge variant="success" className="mt-0.5 h-5 w-fit px-1.5 text-[10px]">
                            Converted
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.contact, 'min-w-0 align-middle')}
                    >
                      <div className="grid min-w-0 gap-0.5 text-sm">
                        <span className="text-foreground truncate tabular-nums">
                          {contactPhone || '—'}
                        </span>
                        <span className="text-muted-foreground truncate">{contactEmail || '—'}</span>
                      </div>
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
                    <TableCell
                      className={cn(
                        CRM_LEADS_TABLE_COLUMN_CLASS.activity,
                        'text-muted-foreground align-middle text-sm',
                      )}
                    >
                      {formatDateTime(lead.lastActivityAt)}
                    </TableCell>
                    <TableCell className={cn(CRM_LEADS_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
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

      <LeadDetailDialog
        leadId={detailLeadId}
        mode="view"
        pipelines={pipelines}
        open={detailLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailLeadId(null);
        }}
        onUpdated={() => void loadLeads()}
        onEditLead={(leadId) => openLeadDetail(leadId, 'edit')}
      />

      <LeadEditDialog
        leadId={editLeadId}
        pipelines={pipelines}
        open={editLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setEditLeadId(null);
        }}
        onUpdated={() => void loadLeads()}
        onError={(message) => {
          setLeadsError(message);
          toast.error(message);
        }}
      />

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

      <LeadCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipeline={selectedPipeline}
        stages={stages}
        initialStageId={createInitialStageId}
        onCreated={() => loadLeads()}
        onError={(message) => {
          setLeadsError(message);
          toast.error(message);
        }}
      />
    </div>
  );
}
