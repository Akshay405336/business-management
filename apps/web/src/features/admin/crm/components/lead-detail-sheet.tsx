'use client';

import { updateLeadRequestSchema } from '@techwin/validation';
import { Loader2, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { useAdminToast } from '@/features/admin/components/toast';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  PipelineStageSelectItems,
  PipelineStageSelectTrigger,
} from './pipeline-stage-select';
import { createLeadActivity, getLead, listLeadActivities, updateLead } from '../api/leads';
import { convertClientFromLead } from '../api/clients';
import { ACTIVITY_TYPES, CRM_LEAD_DIALOG_CLASS, LEAD_PRIORITIES, LEAD_SOURCES } from '../constants';
import type {
  CrmLead,
  CrmLeadActivity,
  CrmPipeline,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  UpdateLeadRequest,
} from '../types';
import {
  dateTimeLocalToIso,
  formatMoney,
  toDateInputValue,
  toDateTimeLocalValue,
} from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelActivityType, labelLeadPriority, labelLeadSource } from '../utils/labels';
import { formatDateTime } from '@/shared/lib/format';
import {
  CrmEmptyState,
  CrmErrorAlert,
  CrmFieldLabel,
  CrmInlineFieldError,
  CrmLoadingRows,
} from './crm-feedback';
import { useAsyncAction } from '../hooks/use-async-action';

export type LeadDetailMode = 'view' | 'edit';

type LeadDraft = {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  source: LeadSource;
  stageId: string;
  priority: LeadPriority;
  estimatedValue: string;
  expectedCloseDate: string;
  nextFollowUpDate: string;
  tags: string;
  description: string;
};

type LeadDraftErrors = Partial<
  Record<'fullName' | 'email' | 'phone' | 'estimatedValue', string>
>;

function leadToDraft(lead: CrmLead): LeadDraft {
  return {
    fullName: lead.fullName,
    companyName: lead.companyName,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    website: lead.website ?? '',
    source: lead.source,
    stageId: lead.stageId,
    priority: lead.priority,
    estimatedValue: lead.estimatedValue,
    expectedCloseDate: toDateInputValue(lead.expectedCloseDate),
    nextFollowUpDate: toDateTimeLocalValue(lead.nextFollowUpDate ?? undefined),
    tags: lead.tags.join(', '),
    description: lead.description,
  };
}

function draftToUpdateBody(draft: LeadDraft): UpdateLeadRequest {
  const tags = draft.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    fullName: draft.fullName.trim(),
    companyName: draft.companyName.trim() || undefined,
    email: draft.email,
    phone: draft.phone,
    website: draft.website.trim() || null,
    source: draft.source,
    stageId: draft.stageId,
    priority: draft.priority,
    estimatedValue: draft.estimatedValue.trim() || '0',
    expectedCloseDate: draft.expectedCloseDate.trim() || null,
    nextFollowUpDate: draft.nextFollowUpDate.trim()
      ? dateTimeLocalToIso(draft.nextFollowUpDate)
      : null,
    description: draft.description,
    tags,
  };
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <p className="border-input bg-muted/30 text-foreground min-h-10 rounded-md border px-3 py-2 text-sm">
      {value || '—'}
    </p>
  );
}

export function LeadDetailDialog({
  leadId,
  mode,
  pipelines,
  open,
  onOpenChange,
  onUpdated,
}: {
  leadId: string | null;
  mode: LeadDetailMode;
  pipelines: readonly CrmPipeline[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const toast = useAdminToast();
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [draftErrors, setDraftErrors] = useState<LeadDraftErrors>({});
  const [activities, setActivities] = useState<readonly CrmLeadActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const estimatedValueRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const { pending: updatePending, run: runUpdate } = useAsyncAction();
  const { pending: convertPending, run: runConvert } = useAsyncAction();
  const { pending: activityPending, run: runActivity } = useAsyncAction();

  const [activityType, setActivityType] = useState<LeadActivityType>('NOTE');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityOccurredAt, setActivityOccurredAt] = useState('');

  const isEdit = mode === 'edit';

  const pipeline = pipelines.find((item) => item.id === lead?.pipelineId);
  const stages = useMemo(
    () =>
      [...(pipeline?.stages ?? [])]
        .filter((stage) => stage.status === 'ACTIVE')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [pipeline?.stages],
  );

  const stageName = (stageId: string) => stages.find((stage) => stage.id === stageId)?.name ?? '—';

  useEffect(() => {
    if (!open) {
      setLead(null);
      setDraft(null);
      setDraftErrors({});
      setActivities(null);
      setError(null);
      return;
    }
    if (!leadId) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const [leadResult, activityResult] = await Promise.all([
          getLead(leadId, controller.signal),
          listLeadActivities(leadId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setLead(leadResult);
        setDraft(leadToDraft(leadResult));
        setDraftErrors({});
        setActivities(activityResult.activities);
        setError(null);
        setActivityOccurredAt(toDateTimeLocalValue(new Date().toISOString()));
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeCrmError(failure));
      }
    })();
    return () => controller.abort();
  }, [leadId, open]);

  const submitUpdate = async () => {
    if (!lead || !draft) return;
    const body = draftToUpdateBody(draft);
    const parsed = updateLeadRequestSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: LeadDraftErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === 'fullName' ||
          key === 'email' ||
          key === 'phone' ||
          key === 'estimatedValue'
        ) {
          fieldErrors[key] ??= issue.message;
        }
      }
      setDraftErrors(fieldErrors);
      toast.error('Fix the highlighted fields before updating.');
      if (fieldErrors.fullName) fullNameRef.current?.focus();
      else if (fieldErrors.email) emailRef.current?.focus();
      else if (fieldErrors.phone) phoneRef.current?.focus();
      else if (fieldErrors.estimatedValue) estimatedValueRef.current?.focus();
      return;
    }
    setDraftErrors({});
    setError(null);
    try {
      const updated = await runUpdate(() => updateLead(lead.id, parsed.data));
      if (updated) {
        toast.success('Lead updated.');
        onUpdated();
        onOpenChange(false);
      }
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const logActivity = async () => {
    if (!lead || !activityTitle.trim() || !activityOccurredAt) return;
    setError(null);
    try {
      const created = await runActivity(() =>
        createLeadActivity(lead.id, {
          type: activityType,
          title: activityTitle.trim(),
          description: activityDescription.trim() || undefined,
          occurredAt: dateTimeLocalToIso(activityOccurredAt),
        }),
      );
      if (created) {
        setActivities((current) => [created, ...(current ?? [])]);
        setActivityTitle('');
        setActivityDescription('');
        toast.success('Activity logged.');
        onUpdated();
      }
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const convert = async () => {
    if (!lead || lead.convertedClientId) return;
    setError(null);
    try {
      const result = await runConvert(() => convertClientFromLead(lead.id));
      if (result) {
        setLead(result.lead);
        setDraft(leadToDraft(result.lead));
        toast.success('Lead converted to client.');
        onUpdated();
      }
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const dialogKey = `${leadId ?? 'none'}-${mode}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CRM_LEAD_DIALOG_CLASS} key={dialogKey}>
        <DialogHeader className="space-y-1 border-b px-6 pt-6 pb-4">
          <DialogTitle>{isEdit ? 'Edit lead' : 'Lead details'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update lead information and save your changes.' : 'View lead information.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-5.5rem)] overflow-y-auto px-6 py-4">
          {error ? (
            <div className="mb-4">
              <CrmErrorAlert message={error} />
            </div>
          ) : null}

          {!lead && open ? <CrmLoadingRows rows={6} /> : null}

          {lead && draft ? (
            <div className="grid gap-6 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{lead.referenceNumber}</Badge>
                <PriorityBadge priority={lead.priority} />
                {lead.convertedClientId ? <Badge variant="success">Converted</Badge> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-full-name" required={isEdit}>
                    Full name
                  </CrmFieldLabel>
                  {isEdit ? (
                    <>
                      <Input
                        ref={fullNameRef}
                        id="lead-full-name"
                        value={draft.fullName}
                        onChange={(event) => {
                          setDraft((current) =>
                            current ? { ...current, fullName: event.target.value } : current,
                          );
                          if (draftErrors.fullName) {
                            setDraftErrors((current) => ({ ...current, fullName: undefined }));
                          }
                        }}
                      />
                      <CrmInlineFieldError message={draftErrors.fullName} />
                    </>
                  ) : (
                    <ReadOnlyValue value={lead.fullName} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-company" optional>
                    Company
                  </CrmFieldLabel>
                  {isEdit ? (
                    <Input
                      id="lead-company"
                      value={draft.companyName}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, companyName: event.target.value } : current,
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyValue value={lead.companyName} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-email" required={isEdit}>
                    Email
                  </CrmFieldLabel>
                  {isEdit ? (
                    <>
                      <Input
                        ref={emailRef}
                        id="lead-email"
                        type="email"
                        value={draft.email}
                        onChange={(event) => {
                          setDraft((current) =>
                            current ? { ...current, email: event.target.value } : current,
                          );
                          if (draftErrors.email) {
                            setDraftErrors((current) => ({ ...current, email: undefined }));
                          }
                        }}
                      />
                      <CrmInlineFieldError message={draftErrors.email} />
                    </>
                  ) : (
                    <ReadOnlyValue value={lead.email ?? ''} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-phone" required={isEdit}>
                    Phone
                  </CrmFieldLabel>
                  {isEdit ? (
                    <>
                      <Input
                        ref={phoneRef}
                        id="lead-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={draft.phone}
                        onChange={(event) => {
                          setDraft((current) =>
                            current ? { ...current, phone: event.target.value } : current,
                          );
                          if (draftErrors.phone) {
                            setDraftErrors((current) => ({ ...current, phone: undefined }));
                          }
                        }}
                      />
                      <CrmInlineFieldError message={draftErrors.phone} />
                    </>
                  ) : (
                    <ReadOnlyValue value={lead.phone ?? ''} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Stage</CrmFieldLabel>
                  {isEdit ? (
                    <Select
                      value={draft.stageId}
                      onValueChange={(value) =>
                        setDraft((current) => (current ? { ...current, stageId: value } : current))
                      }
                    >
                      <SelectTrigger aria-label="Stage">
                        <PipelineStageSelectTrigger stages={stages} stageId={draft.stageId} />
                      </SelectTrigger>
                      <SelectContent>
                        <PipelineStageSelectItems stages={stages} />
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadOnlyValue value={stageName(lead.stageId)} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Source</CrmFieldLabel>
                  {isEdit ? (
                    <Select
                      value={draft.source}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current ? { ...current, source: value as LeadSource } : current,
                        )
                      }
                    >
                      <SelectTrigger aria-label="Source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((source) => (
                          <SelectItem key={source} value={source}>
                            {labelLeadSource(source)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadOnlyValue value={labelLeadSource(lead.source)} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel>Priority</CrmFieldLabel>
                  {isEdit ? (
                    <Select
                      value={draft.priority}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current ? { ...current, priority: value as LeadPriority } : current,
                        )
                      }
                    >
                      <SelectTrigger aria-label="Priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {labelLeadPriority(priority)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadOnlyValue value={labelLeadPriority(lead.priority)} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-value" optional>
                    Estimated value
                  </CrmFieldLabel>
                  {isEdit ? (
                    <>
                      <Input
                        ref={estimatedValueRef}
                        id="lead-value"
                        inputMode="decimal"
                        value={draft.estimatedValue}
                        onChange={(event) => {
                          setDraft((current) =>
                            current ? { ...current, estimatedValue: event.target.value } : current,
                          );
                          if (draftErrors.estimatedValue) {
                            setDraftErrors((current) => ({
                              ...current,
                              estimatedValue: undefined,
                            }));
                          }
                        }}
                      />
                      <CrmInlineFieldError message={draftErrors.estimatedValue} />
                    </>
                  ) : (
                    <ReadOnlyValue value={formatMoney(lead.estimatedValue, lead.currency)} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-close" optional>
                    Expected close date
                  </CrmFieldLabel>
                  {isEdit ? (
                    <Input
                      id="lead-close"
                      type="date"
                      value={draft.expectedCloseDate}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, expectedCloseDate: event.target.value }
                            : current,
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyValue value={toDateInputValue(lead.expectedCloseDate) || ''} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-follow-up" optional>
                    Next follow-up
                  </CrmFieldLabel>
                  {isEdit ? (
                    <Input
                      id="lead-follow-up"
                      type="datetime-local"
                      value={draft.nextFollowUpDate}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, nextFollowUpDate: event.target.value }
                            : current,
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyValue
                      value={
                        lead.nextFollowUpDate ? formatDateTime(lead.nextFollowUpDate) : ''
                      }
                    />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-website" optional>
                    Website
                  </CrmFieldLabel>
                  {isEdit ? (
                    <Input
                      id="lead-website"
                      value={draft.website}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, website: event.target.value } : current,
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyValue value={lead.website ?? ''} />
                  )}
                </div>
                <div className="grid gap-1.5">
                  <CrmFieldLabel htmlFor="lead-tags" optional>
                    Tags
                  </CrmFieldLabel>
                  {isEdit ? (
                    <Input
                      id="lead-tags"
                      value={draft.tags}
                      placeholder="Comma-separated"
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, tags: event.target.value } : current,
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyValue value={lead.tags.join(', ')} />
                  )}
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <CrmFieldLabel htmlFor="lead-description" optional>
                    Description
                  </CrmFieldLabel>
                  {isEdit ? (
                    <Textarea
                      id="lead-description"
                      rows={2}
                      className="min-h-[4.5rem] resize-y"
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, description: event.target.value } : current,
                        )
                      }
                    />
                  ) : (
                    <ReadOnlyValue value={lead.description} />
                  )}
                </div>
                <p className="text-muted-foreground text-xs sm:col-span-2">
                  Pipeline: {pipeline?.name ?? '—'} · Value{' '}
                  {formatMoney(lead.estimatedValue, lead.currency)} · Last activity{' '}
                  {formatDateTime(lead.lastActivityAt)}
                </p>
              </div>

              <section className="grid gap-3">
                <h2 className="text-sm font-semibold">Activity</h2>
                <div className="grid gap-2 rounded-md border p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>Type</Label>
                      <Select
                        value={activityType}
                        onValueChange={(value) => setActivityType(value as LeadActivityType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {labelActivityType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="activity-when">When</Label>
                      <Input
                        id="activity-when"
                        type="datetime-local"
                        value={activityOccurredAt}
                        onChange={(event) => setActivityOccurredAt(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="activity-title">Title</Label>
                    <Input
                      id="activity-title"
                      value={activityTitle}
                      onChange={(event) => setActivityTitle(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="activity-description">Notes</Label>
                    <Textarea
                      id="activity-description"
                      value={activityDescription}
                      onChange={(event) => setActivityDescription(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-fit"
                    disabled={activityPending || !activityTitle.trim()}
                    onClick={() => void logActivity()}
                  >
                    {activityPending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : null}
                    Log activity
                  </Button>
                </div>

                {activities === null ? <CrmLoadingRows rows={3} /> : null}
                {activities?.length === 0 ? (
                  <CrmEmptyState
                    title="No activity yet"
                    description="Log calls, emails, and notes here."
                  />
                ) : null}
                <ol className="grid gap-2">
                  {activities?.map((activity) => (
                    <li key={activity.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{activity.title}</p>
                        <span className="text-muted-foreground text-xs">
                          {labelActivityType(activity.type)}
                        </span>
                      </div>
                      {activity.description ? (
                        <p className="text-muted-foreground mt-1 text-xs">{activity.description}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDateTime(activity.occurredAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}
        </div>

        {lead ? (
          <DialogFooter className="border-t px-6 py-3 sm:justify-between">
            {isEdit ? (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={updatePending || !draft}
                  onClick={() => void submitUpdate()}
                >
                  {updatePending ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : null}
                  Update Lead
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {lead.convertedClientId ? (
                  <Button type="button" asChild>
                    <Link href={`/admin/clients?clientId=${lead.convertedClientId}`}>
                      View client
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={convertPending}
                    onClick={() => void convert()}
                  >
                    {convertPending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <UserCheck className="size-4" aria-hidden="true" />
                    )}
                    Convert to Client
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Use LeadDetailDialog */
export const LeadDetailSheet = LeadDetailDialog;
