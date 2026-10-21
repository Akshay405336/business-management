'use client';

import { API_ERROR_CODES } from '@techwin/contracts';
import { createLeadRequestSchema, leadListQuerySchema } from '@techwin/validation';
import { z } from 'zod';
import { isApiError } from '@/shared/api/api-error';
import { Eye, Kanban, LayoutList, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { focusFirstInvalidField } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { clearFormFieldError, mergeFieldErrors, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { formGridClass, formGridFullWidthClass } from '@/shared/form/form-layout';
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
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/shared/lib/format';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_LEADS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { StageBadge } from '@/features/admin/components/stage-badge';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { changeLeadStage, createLead, deleteLead, listLeads } from '../api/leads';
import { listPipelines } from '../api/pipelines';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { CRM_LEAD_DIALOG_CLASS, DEFAULT_LEAD_CURRENCY, LEAD_PRIORITIES, LEAD_SOURCES } from '../constants';
import type { CrmLead, CrmPipeline, LeadListQuery, LeadPriority, LeadSource } from '../types';
import { formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelLeadPriority, labelLeadSource } from '../utils/labels';
import {
  CrmEmptyState,
  CrmErrorAlert,
  CrmFormField,
  CrmInlineFieldError,
  CrmLoadingRows,
} from './crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { KanbanBoard } from './kanban-board';
import { LeadDetailDialog, type LeadDetailMode } from './lead-detail-sheet';
import { PipelineStageSelectItems, PipelineStageSelectTrigger } from './pipeline-stage-select';
import { useAsyncAction } from '../hooks/use-async-action';

type ViewMode = 'list' | 'kanban';

type CreateFormErrors = Partial<
  Record<'fullName' | 'stageId' | 'email' | 'phone' | 'estimatedValue' | 'pipelineId', string>
>;

const SEARCH_DEBOUNCE_MS = 400;

export function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const view: ViewMode = searchParams.get('view') === 'list' ? 'list' : 'kanban';
  const search = searchParams.get('search') ?? '';
  const pipelineId = searchParams.get('pipelineId') ?? '';
  const stageId = searchParams.get('stageId') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const source = searchParams.get('source') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20') || 20));

  const [pipelines, setPipelines] = useState<readonly CrmPipeline[]>([]);
  const [leads, setLeads] = useState<readonly CrmLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(search);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<LeadDetailMode>('view');

  const openLeadDetail = (leadId: string, mode: LeadDetailMode) => {
    setDetailMode(mode);
    setDetailLeadId(leadId);
  };
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    website: '',
    source: 'WEBSITE' as LeadSource,
    pipelineId: '',
    stageId: '',
    priority: 'MEDIUM' as LeadPriority,
    estimatedValue: '0',
    expectedCloseDate: '',
    nextFollowUpDate: '',
    tags: '',
    description: '',
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<CreateFormErrors>({});
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const applySearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      updateParams({ search: trimmed || null, page: '1' });
    },
    [updateParams],
  );

  const query = useMemo((): LeadListQuery => {
    const candidate: LeadListQuery = {
      search: search.trim() || undefined,
      pipelineId: pipelineId || undefined,
      stageId: stageId || undefined,
      priority: priority ? (priority as LeadPriority) : undefined,
      source: source ? (source as LeadSource) : undefined,
      includeArchived: true,
      ...(view === 'kanban'
        ? { kanbanOrder: true, page: 1, pageSize: 100 }
        : { page, pageSize }),
    };
    const parsed = leadListQuerySchema.safeParse(candidate);
    if (parsed.success) return parsed.data;
    return view === 'kanban'
      ? { includeArchived: true, kanbanOrder: true, page: 1, pageSize: 100 }
      : { includeArchived: true, page: 1, pageSize: 20 };
  }, [search, pipelineId, stageId, priority, source, view, page, pageSize]);

  const activePipeline = useMemo(() => {
    const defaultPipeline = pipelines.find((item) => item.isDefault);
    const id = pipelineId || defaultPipeline?.id || pipelines[0]?.id;
    return pipelines.find((item) => item.id === id) ?? defaultPipeline ?? pipelines[0] ?? null;
  }, [pipelineId, pipelines]);

  const stages = useMemo(
    () =>
      [...(activePipeline?.stages ?? [])]
        .filter((stage) => stage.status === 'ACTIVE')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [activePipeline?.stages],
  );

  const createLiveFields = useZodFormFields(
    {
      fullName: createLeadRequestSchema.shape.fullName,
      email: createLeadRequestSchema.shape.email,
      phone: createLeadRequestSchema.shape.phone,
      stageId: stages.length > 0 ? z.string().min(1, 'Select a stage.') : z.string(),
      estimatedValue: createLeadRequestSchema.shape.estimatedValue,
    },
    {
      fullName: createForm.fullName,
      email: createForm.email,
      phone: createForm.phone,
      stageId: createForm.stageId,
      estimatedValue: createForm.estimatedValue,
    },
  );

  const createFieldError = (key: keyof CreateFormErrors) =>
    mergeFieldErrors(createLiveFields.errors, createFieldErrors, key);

  const stageById = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pipelineResult = await listPipelines();
      setPipelines(pipelineResult.pipelines);

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
      setError(null);
      if (!pipelineId) {
        const preferred =
          pipelineResult.pipelines.find((item) => item.isDefault) ?? pipelineResult.pipelines[0];
        if (preferred) updateParams({ pipelineId: preferred.id });
      }
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, [query, pipelineId, updateParams]);

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
      applySearch(searchDraft);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search, applySearch]);

  useEffect(() => {
    if (!createOpen || !activePipeline) return;
    setCreateForm((form) => {
      const stageValid = stages.some((stage) => stage.id === form.stageId);
      return {
        ...form,
        pipelineId: activePipeline.id,
        stageId: stageValid ? form.stageId : (stages[0]?.id ?? ''),
      };
    });
  }, [createOpen, activePipeline, stages]);

  const onCreateLead = async () => {
    const pipelineId = activePipeline?.id ?? createForm.pipelineId;
    const tags = createForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      fullName: createForm.fullName.trim(),
      companyName: createForm.companyName.trim() || undefined,
      email: createForm.email,
      phone: createForm.phone,
      website: createForm.website.trim() || null,
      source: createForm.source,
      pipelineId,
      currency: DEFAULT_LEAD_CURRENCY,
      stageId: createForm.stageId || undefined,
      priority: createForm.priority,
      estimatedValue: createForm.estimatedValue.trim() || '0',
      expectedCloseDate: createForm.expectedCloseDate.trim() || null,
      nextFollowUpDate: createForm.nextFollowUpDate
        ? new Date(createForm.nextFollowUpDate).toISOString()
        : null,
      description: createForm.description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    createLiveFields.prepareSubmit();
    const parsed = createLeadRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = zodErrorToFieldMap(parsed.error) as CreateFormErrors;
      if (!pipelineId) fieldErrors.pipelineId = 'No active pipeline is available.';
      setCreateFieldErrors(fieldErrors);
      focusFirstInvalidField();
      return;
    }
    if (!pipelineId) {
      setCreateFieldErrors({ pipelineId: 'No active pipeline is available.' });
      return;
    }

    setCreateFieldErrors({});
    setError(null);
    try {
      await run(() => createLead(parsed.data));
      setCreateOpen(false);
      await load();
    } catch (failure) {
      setError(describeCrmError(failure));
    }
  };

  const persistLeadKanbanMove = async ({
    leadId,
    stageId,
    beforeLeadId,
  }: {
    leadId: string;
    stageId: string;
    beforeLeadId: string | null;
  }) => {
    const lead = leads.find((item) => item.id === leadId);
    const nextStageName = stages.find((stage) => stage.id === stageId)?.name ?? 'stage';
    const stageChanged = lead?.stageId !== stageId;
    try {
      await run(() => changeLeadStage(leadId, { stageId, beforeLeadId }));
      if (stageChanged) toast.success(`Lead moved to ${nextStageName}.`);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
      throw failure;
    }
  };

  const moveLeadToStage = async (leadId: string, nextStageId: string) => {
    const lead = leads.find((item) => item.id === leadId);
    if (lead?.stageId === nextStageId) return;
    await persistLeadKanbanMove({ leadId, stageId: nextStageId, beforeLeadId: null });
  };

  const deleteLeadTarget = useMemo(
    () => leads.find((lead) => lead.id === deleteLeadId) ?? null,
    [leads, deleteLeadId],
  );

  const confirmDeleteLead = async () => {
    if (!deleteLeadId) return;
    setError(null);
    try {
      await run(() => deleteLead(deleteLeadId));
      if (detailLeadId === deleteLeadId) setDetailLeadId(null);
      setDeleteLeadId(null);
      toast.success('Lead deleted.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const openCreate = () => {
    const defaultPipeline =
      activePipeline ?? pipelines.find((item) => item.isDefault) ?? pipelines[0];
    const firstActiveStage = [...(defaultPipeline?.stages ?? [])]
      .filter((stage) => stage.status === 'ACTIVE')
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    setCreateForm({
      fullName: '',
      companyName: '',
      email: '',
      phone: '',
      website: '',
      source: 'WEBSITE',
      pipelineId: defaultPipeline?.id ?? '',
      stageId: firstActiveStage?.id ?? '',
      priority: 'MEDIUM',
      estimatedValue: '0',
      expectedCloseDate: '',
      nextFollowUpDate: '',
      tags: '',
      description: '',
    });
    setCreateFieldErrors({});
    createLiveFields.reset();
    setCreateOpen(true);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Leads' },
  ] as const;

  const listFiltersActive = Boolean(
    search.trim() || stageId || priority || source || pipelineId,
  );
  const listTablePhase = deriveDataTablePhase({
    loading: loading && view === 'list',
    error,
    rowCount: leads.length,
  });
  const listTableRefreshing = isDataTableRefreshing({
    loading: loading && view === 'list',
    rowCount: leads.length,
  });

  const clearListFilters = () => {
    setSearchDraft('');
    updateParams({
      search: null,
      stageId: null,
      priority: null,
      source: null,
      page: '1',
    });
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Leads"
        description="Track opportunities in a list or kanban board."
        toolbar={
          <>
            <form
              className={CRM_HEADER_SEARCH_FORM_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                applySearch(searchDraft);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0">
                <Input
                  className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                  placeholder={CRM_FORM_PLACEHOLDERS.searchLeads}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search leads"
                />
              </InputGroup>
            </form>
            <div className="flex shrink-0 items-center gap-2">
              <Tabs
                value={view}
                onValueChange={(value) =>
                  updateParams({ view: value === 'list' ? 'list' : null, page: '1' })
                }
              >
                <TabsList className="h-9 shrink-0">
                  <TabsTrigger value="list" className="text-xs">
                    <LayoutList aria-hidden="true" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="text-xs">
                    <Kanban aria-hidden="true" />
                    Kanban
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button type="button" size="sm" className="h-9 shrink-0" onClick={openCreate}>
                <Plus aria-hidden="true" />
                New Lead
              </Button>
            </div>
          </>
        }
      />

      {error && leads.length > 0 ? <CrmErrorAlert message={error} /> : null}

      {loading && view === 'kanban' ? <CrmLoadingRows rows={6} /> : null}

      {view === 'list' ? (
        <DataTable
          phase={listTablePhase}
          colSpan={6}
          skeletonColumns={CRM_LEADS_TABLE_SKELETON}
          header={
            <TableRow className="hover:bg-transparent">
              <TableHead>Lead</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="w-[7.5rem] text-right">Actions</TableHead>
            </TableRow>
          }
          empty={{
            title: listFiltersActive ? 'No results match your filters' : 'No leads yet',
            description: listFiltersActive
              ? 'Try a different search term or filter, or clear filters to see all leads.'
              : 'Create a lead to start tracking opportunities in your pipeline.',
            action: listFiltersActive ? undefined : { label: 'Create lead', onClick: openCreate },
            secondaryAction: listFiltersActive
              ? { label: 'Clear filters', onClick: clearListFilters }
              : undefined,
          }}
          errorMessage={error}
          onRetry={() => void load()}
          refreshing={listTableRefreshing}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              loading={listTablePhase === 'initial-loading'}
              onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
              onPageSizeChange={(nextSize) =>
                updateParams({ pageSize: String(nextSize), page: '1' })
              }
            />
          }
        >
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <div className="grid">
                  <span className="font-medium">{lead.fullName}</span>
                  <span className="text-muted-foreground text-xs">
                    {lead.referenceNumber}
                    {lead.companyName ? ` · ${lead.companyName}` : ''}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StageBadge stage={stageById.get(lead.stageId)} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={lead.priority} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(lead.estimatedValue, lead.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(lead.lastActivityAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-0.5">
                  <TableIconButton
                    label="View lead"
                    onClick={() => openLeadDetail(lead.id, 'view')}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                  </TableIconButton>
                  <TableIconButton
                    label="Edit lead"
                    tone="primary"
                    onClick={() => openLeadDetail(lead.id, 'edit')}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </TableIconButton>
                  <TableIconButton
                    label="Delete lead"
                    tone="danger"
                    disabled={pending}
                    onClick={() => setDeleteLeadId(lead.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </TableIconButton>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      ) : null}

      {!loading && view === 'kanban' ? (
        activePipeline && stages.length === 0 ? (
          <CrmEmptyState
            title="No active pipeline stages"
            description="Configure at least one active stage on the Pipeline page before using the Kanban board."
          />
        ) : activePipeline ? (
          <KanbanBoard
            stages={stages}
            leads={leads}
            disabled={pending}
            onPersistMove={persistLeadKanbanMove}
            onView={(leadId) => openLeadDetail(leadId, 'view')}
            onEdit={(leadId) => openLeadDetail(leadId, 'edit')}
            onDelete={setDeleteLeadId}
            onStageChange={(leadId, stageId) => void moveLeadToStage(leadId, stageId)}
          />
        ) : (
          <CrmEmptyState
            title="Select a pipeline"
            description="Choose a pipeline to view the board."
          />
        )
      ) : null}

      <LeadDetailDialog
        leadId={detailLeadId}
        mode={detailMode}
        pipelines={pipelines}
        open={detailLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailLeadId(null);
        }}
        onUpdated={() => void load()}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={CRM_LEAD_DIALOG_CLASS}>
          <DialogHeader className="space-y-1 px-6 pt-6 pb-2">
            <DialogTitle>Create lead</DialogTitle>
            <DialogDescription>
              Adds to {activePipeline?.name ?? 'your default pipeline'}. Pipeline is chosen
              automatically.
            </DialogDescription>
          </DialogHeader>
          <div className={cn('max-h-[min(62vh,520px)] overflow-y-auto px-6 py-2', formGridClass)}>
            <CrmFormField
              id="create-full-name"
              label="Full name"
              required
              validated
              error={createFieldError('fullName')}
            >
              <Input
                id="create-full-name"
                placeholder={CRM_FORM_PLACEHOLDERS.fullName}
                value={createForm.fullName}
                {...createLiveFields.controlProps('fullName', 'create-full-name')}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, fullName: event.target.value }));
                  clearFormFieldError(setCreateFieldErrors, 'fullName');
                }}
              />
            </CrmFormField>
            <CrmFormField id="create-company" label="Company" optional>
              <Input
                id="create-company"
                placeholder={CRM_FORM_PLACEHOLDERS.company}
                value={createForm.companyName}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, companyName: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField
              id="create-email"
              label="Email"
              required
              validated
              error={createFieldError('email')}
            >
              <Input
                id="create-email"
                type="email"
                placeholder={CRM_FORM_PLACEHOLDERS.email}
                value={createForm.email}
                {...createLiveFields.controlProps('email', 'create-email')}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, email: event.target.value }));
                  clearFormFieldError(setCreateFieldErrors, 'email');
                }}
              />
            </CrmFormField>
            <CrmFormField
              id="create-phone"
              label="Phone"
              required
              validated
              error={createFieldError('phone')}
            >
              <Input
                id="create-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={CRM_FORM_PLACEHOLDERS.phone}
                value={createForm.phone}
                {...createLiveFields.controlProps('phone', 'create-phone')}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, phone: event.target.value }));
                  clearFormFieldError(setCreateFieldErrors, 'phone');
                }}
              />
            </CrmFormField>
            <CrmFormField
              id="create-stage"
              label="Stage"
              required
              validated
              error={createFieldError('stageId')}
            >
              <Select
                value={createForm.stageId}
                onValueChange={(value) => {
                  setCreateForm((form) => ({ ...form, stageId: value }));
                  createLiveFields.touch('stageId');
                  clearFormFieldError(setCreateFieldErrors, 'stageId');
                }}
              >
                <SelectTrigger
                  id="create-stage"
                  aria-label="Stage"
                  {...createLiveFields.controlProps('stageId', 'create-stage')}
                >
                  <PipelineStageSelectTrigger
                    stages={stages}
                    stageId={createForm.stageId || undefined}
                    placeholder={CRM_FORM_PLACEHOLDERS.selectStage}
                  />
                </SelectTrigger>
                <SelectContent>
                  <PipelineStageSelectItems stages={stages} />
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField id="create-source" label="Source">
              <Select
                value={createForm.source}
                onValueChange={(value) =>
                  setCreateForm((form) => ({ ...form, source: value as LeadSource }))
                }
              >
                <SelectTrigger id="create-source" aria-label="Source">
                  <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectSource} />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {labelLeadSource(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField id="create-priority" label="Priority">
              <Select
                value={createForm.priority}
                onValueChange={(value) =>
                  setCreateForm((form) => ({ ...form, priority: value as LeadPriority }))
                }
              >
                <SelectTrigger id="create-priority" aria-label="Priority">
                  <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectPriority} />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {labelLeadPriority(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField
              id="create-value"
              label="Estimated value"
              optional
              validated
              error={createFieldError('estimatedValue')}
            >
              <Input
                id="create-value"
                inputMode="decimal"
                placeholder={CRM_FORM_PLACEHOLDERS.estimatedValue}
                value={createForm.estimatedValue}
                {...createLiveFields.controlProps('estimatedValue', 'create-value')}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, estimatedValue: event.target.value }));
                  clearFormFieldError(setCreateFieldErrors, 'estimatedValue');
                }}
              />
            </CrmFormField>
            <CrmFormField id="create-close" label="Expected close date" optional>
              <Input
                id="create-close"
                type="date"
                placeholder={CRM_FORM_PLACEHOLDERS.expectedCloseDate}
                value={createForm.expectedCloseDate}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, expectedCloseDate: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField id="create-follow-up" label="Next follow-up" optional>
              <Input
                id="create-follow-up"
                type="datetime-local"
                placeholder={CRM_FORM_PLACEHOLDERS.nextFollowUp}
                value={createForm.nextFollowUpDate}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, nextFollowUpDate: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField id="create-website" label="Website" optional>
              <Input
                id="create-website"
                placeholder={CRM_FORM_PLACEHOLDERS.website}
                value={createForm.website}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, website: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField id="create-tags" label="Tags" optional>
              <Input
                id="create-tags"
                placeholder={CRM_FORM_PLACEHOLDERS.tags}
                value={createForm.tags}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, tags: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField
              id="create-description"
              label="Description"
              optional
              className={formGridFullWidthClass}
            >
              <Textarea
                id="create-description"
                rows={2}
                className="min-h-[4.5rem] resize-y"
                placeholder={CRM_FORM_PLACEHOLDERS.description}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, description: event.target.value }))
                }
              />
            </CrmFormField>
            <div className={formGridFullWidthClass}>
              <CrmInlineFieldError message={createFieldErrors.pipelineId} reserveSpace={false} />
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || stages.length === 0}
              onClick={() => void onCreateLead()}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
