'use client';

import { API_ERROR_CODES } from '@techwin/contracts';
import { createLeadRequestSchema, leadListQuerySchema } from '@techwin/validation';
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
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/shared/lib/format';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { DataTableFrame } from '@/features/admin/components/data-table';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { StageBadge } from '@/features/admin/components/stage-badge';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { changeLeadStage, createLead, deleteLead, listLeads } from '../api/leads';
import { listPipelines } from '../api/pipelines';
import { CRM_LEAD_DIALOG_CLASS, DEFAULT_LEAD_CURRENCY, LEAD_PRIORITIES, LEAD_SOURCES } from '../constants';
import type { CrmLead, CrmPipeline, LeadListQuery, LeadPriority, LeadSource } from '../types';
import { formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelLeadPriority, labelLeadSource } from '../utils/labels';
import {
  CrmEmptyState,
  CrmErrorAlert,
  CrmFieldLabel,
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

    const parsed = createLeadRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: CreateFormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === 'fullName' ||
          key === 'stageId' ||
          key === 'email' ||
          key === 'phone' ||
          key === 'estimatedValue'
        ) {
          fieldErrors[key] ??= issue.message;
        }
        if (key === 'pipelineId')
          fieldErrors.pipelineId = 'Select a pipeline by configuring stages.';
      }
      if (!pipelineId) fieldErrors.pipelineId = 'No active pipeline is available.';
      if (!createForm.stageId && stages.length > 0) {
        fieldErrors.stageId = 'Select a stage.';
      }
      setCreateFieldErrors(fieldErrors);
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
    setCreateOpen(true);
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Leads' },
  ] as const;

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
              <div className="relative min-w-0">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
                  aria-hidden="true"
                />
                <Input
                  className="h-9 pl-8"
                  placeholder="Search leads..."
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search leads"
                />
              </div>
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

      {error ? <CrmErrorAlert message={error} /> : null}

      {loading ? <CrmLoadingRows rows={6} /> : null}

      {!loading && view === 'list' ? (
        <>
          {leads.length === 0 ? (
            <CrmEmptyState title="No leads match your filters" />
          ) : (
            <DataTableFrame
              footer={
                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
                  onPageSizeChange={(nextSize) =>
                    updateParams({ pageSize: String(nextSize), page: '1' })
                  }
                />
              }
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9">Lead</TableHead>
                    <TableHead className="h-9">Stage</TableHead>
                    <TableHead className="h-9">Priority</TableHead>
                    <TableHead className="h-9 text-right">Value</TableHead>
                    <TableHead className="h-9">Last activity</TableHead>
                    <TableHead className="h-9 w-[7.5rem] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="py-2.5">
                        <div className="grid">
                          <span className="font-medium">{lead.fullName}</span>
                          <span className="text-muted-foreground text-xs">
                            {lead.referenceNumber}
                            {lead.companyName ? ` · ${lead.companyName}` : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <StageBadge stage={stageById.get(lead.stageId)} />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <PriorityBadge priority={lead.priority} />
                      </TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">
                        {formatMoney(lead.estimatedValue, lead.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2.5">
                        {formatDateTime(lead.lastActivityAt)}
                      </TableCell>
                      <TableCell className="py-2.5">
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
                </TableBody>
              </Table>
            </DataTableFrame>
          )}
        </>
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
          <div className="grid max-h-[min(62vh,520px)] gap-3 overflow-y-auto px-6 py-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-full-name" required>
                Full name
              </CrmFieldLabel>
              <Input
                id="create-full-name"
                value={createForm.fullName}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, fullName: event.target.value }));
                  if (createFieldErrors.fullName) {
                    setCreateFieldErrors((current) => ({ ...current, fullName: undefined }));
                  }
                }}
              />
              <CrmInlineFieldError message={createFieldErrors.fullName} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-company" optional>
                Company
              </CrmFieldLabel>
              <Input
                id="create-company"
                value={createForm.companyName}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, companyName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-email" required>
                Email
              </CrmFieldLabel>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, email: event.target.value }));
                  if (createFieldErrors.email) {
                    setCreateFieldErrors((current) => ({ ...current, email: undefined }));
                  }
                }}
              />
              <CrmInlineFieldError message={createFieldErrors.email} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-phone" required>
                Phone
              </CrmFieldLabel>
              <Input
                id="create-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={createForm.phone}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, phone: event.target.value }));
                  if (createFieldErrors.phone) {
                    setCreateFieldErrors((current) => ({ ...current, phone: undefined }));
                  }
                }}
              />
              <CrmInlineFieldError message={createFieldErrors.phone} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel required>Stage</CrmFieldLabel>
              <Select
                value={createForm.stageId}
                onValueChange={(value) => {
                  setCreateForm((form) => ({ ...form, stageId: value }));
                  if (createFieldErrors.stageId) {
                    setCreateFieldErrors((current) => ({ ...current, stageId: undefined }));
                  }
                }}
              >
                <SelectTrigger aria-label="Stage">
                  <PipelineStageSelectTrigger
                    stages={stages}
                    stageId={createForm.stageId || undefined}
                    placeholder="Select stage"
                  />
                </SelectTrigger>
                <SelectContent>
                  <PipelineStageSelectItems stages={stages} />
                </SelectContent>
              </Select>
              <CrmInlineFieldError message={createFieldErrors.stageId} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel>Source</CrmFieldLabel>
              <Select
                value={createForm.source}
                onValueChange={(value) =>
                  setCreateForm((form) => ({ ...form, source: value as LeadSource }))
                }
              >
                <SelectTrigger aria-label="Source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {labelLeadSource(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel>Priority</CrmFieldLabel>
              <Select
                value={createForm.priority}
                onValueChange={(value) =>
                  setCreateForm((form) => ({ ...form, priority: value as LeadPriority }))
                }
              >
                <SelectTrigger aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_PRIORITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {labelLeadPriority(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-value" optional>
                Estimated value
              </CrmFieldLabel>
              <Input
                id="create-value"
                inputMode="decimal"
                value={createForm.estimatedValue}
                onChange={(event) => {
                  setCreateForm((value) => ({ ...value, estimatedValue: event.target.value }));
                  if (createFieldErrors.estimatedValue) {
                    setCreateFieldErrors((current) => ({ ...current, estimatedValue: undefined }));
                  }
                }}
              />
              <CrmInlineFieldError message={createFieldErrors.estimatedValue} />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-close" optional>
                Expected close date
              </CrmFieldLabel>
              <Input
                id="create-close"
                type="date"
                value={createForm.expectedCloseDate}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, expectedCloseDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-follow-up" optional>
                Next follow-up
              </CrmFieldLabel>
              <Input
                id="create-follow-up"
                type="datetime-local"
                value={createForm.nextFollowUpDate}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, nextFollowUpDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-website" optional>
                Website
              </CrmFieldLabel>
              <Input
                id="create-website"
                value={createForm.website}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, website: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="create-tags" optional>
                Tags
              </CrmFieldLabel>
              <Input
                id="create-tags"
                placeholder="Comma-separated"
                value={createForm.tags}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, tags: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <CrmFieldLabel htmlFor="create-description" optional>
                Description
              </CrmFieldLabel>
              <Textarea
                id="create-description"
                rows={2}
                className="min-h-[4.5rem] resize-y"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((value) => ({ ...value, description: event.target.value }))
                }
              />
            </div>
            <CrmInlineFieldError message={createFieldErrors.pipelineId} />
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
