'use client';

import {
  createLeadRequestSchema,
  leadEmailSchema,
  leadFullNameFieldSchema,
  leadPhoneSchema,
  updateLeadRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { clearFormFieldError, mergeFieldErrors, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { Loader2, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/features/admin/components/priority-badge';
import { useAdminToast } from '@/features/admin/components/toast';
import { Input } from '@/components/ui/input';
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
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
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
import { applyCrmLeadContactFieldErrors, describeCrmError } from '../utils/errors';
import { labelActivityType, labelLeadPriority, labelLeadSource } from '../utils/labels';
import { formatDateTime } from '@/shared/lib/format';
import {
  CrmEmptyState,
  CrmErrorAlert,
  CrmFormField,
  CrmLoadingRows,
  CrmReadOnlyField,
  formGridClass,
  formGridFullWidthClass,
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

  const draftLiveFields = useZodFormFields(
    {
      fullName: leadFullNameFieldSchema,
      email: leadEmailSchema,
      phone: leadPhoneSchema,
      estimatedValue: createLeadRequestSchema.shape.estimatedValue,
    },
    {
      fullName: draft?.fullName ?? '',
      email: draft?.email ?? '',
      phone: draft?.phone ?? '',
      estimatedValue: draft?.estimatedValue ?? '0',
    },
  );

  const draftFieldError = (key: keyof LeadDraftErrors) =>
    mergeFieldErrors(draftLiveFields.errors, draftErrors, key);

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
    draftLiveFields.prepareSubmit();
    const parsed = updateLeadRequestSchema.safeParse(body);
    if (!parsed.success) {
      setDraftErrors(zodErrorToFieldMap(parsed.error));
      toast.error('Fix the highlighted fields before updating.');
      focusFirstInvalidField();
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
      if (applyCrmLeadContactFieldErrors(failure, setDraftErrors)) {
        toast.error('Fix the highlighted fields before updating.');
        focusFirstInvalidField();
      } else {
        toast.error(describeCrmError(failure));
      }
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

              <div className={formGridClass}>
                {isEdit ? (
                  <CrmFormField
                    id="lead-full-name"
                    label="Full name"
                    required
                    validated
                    error={draftFieldError('fullName')}
                  >
                    <Input
                      ref={fullNameRef}
                      id="lead-full-name"
                      placeholder={CRM_FORM_PLACEHOLDERS.fullName}
                      value={draft.fullName}
                      {...draftLiveFields.controlProps('fullName', 'lead-full-name')}
                      onChange={(event) => {
                        setDraft((current) =>
                          current ? { ...current, fullName: event.target.value } : current,
                        );
                        clearFormFieldError(setDraftErrors, 'fullName');
                      }}
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Full name" required>
                    <ReadOnlyValue value={lead.fullName} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-company" label="Company" optional>
                    <Input
                      id="lead-company"
                      placeholder={CRM_FORM_PLACEHOLDERS.company}
                      value={draft.companyName}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, companyName: event.target.value } : current,
                        )
                      }
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Company" optional>
                    <ReadOnlyValue value={lead.companyName} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField
                    id="lead-email"
                    label="Email"
                    required
                    validated
                    error={draftFieldError('email')}
                  >
                    <Input
                      ref={emailRef}
                      id="lead-email"
                      type="email"
                      placeholder={CRM_FORM_PLACEHOLDERS.email}
                      value={draft.email}
                      {...draftLiveFields.controlProps('email', 'lead-email')}
                      onChange={(event) => {
                        setDraft((current) =>
                          current ? { ...current, email: event.target.value } : current,
                        );
                        clearFormFieldError(setDraftErrors, 'email');
                      }}
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Email" required>
                    <ReadOnlyValue value={lead.email ?? ''} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField
                    id="lead-phone"
                    label="Phone"
                    required
                    validated
                    error={draftFieldError('phone')}
                  >
                    <Input
                      ref={phoneRef}
                      id="lead-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder={CRM_FORM_PLACEHOLDERS.phone}
                      value={draft.phone}
                      {...draftLiveFields.controlProps('phone', 'lead-phone')}
                      onChange={(event) => {
                        setDraft((current) =>
                          current ? { ...current, phone: event.target.value } : current,
                        );
                        clearFormFieldError(setDraftErrors, 'phone');
                      }}
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Phone" required>
                    <ReadOnlyValue value={lead.phone ?? ''} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-stage" label="Stage">
                    <Select
                      value={draft.stageId}
                      onValueChange={(value) =>
                        setDraft((current) => (current ? { ...current, stageId: value } : current))
                      }
                    >
                      <SelectTrigger id="lead-stage" aria-label="Stage">
                        <PipelineStageSelectTrigger
                          stages={stages}
                          stageId={draft.stageId}
                          placeholder={CRM_FORM_PLACEHOLDERS.selectStage}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <PipelineStageSelectItems stages={stages} />
                      </SelectContent>
                    </Select>
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Stage">
                    <ReadOnlyValue value={stageName(lead.stageId)} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-source" label="Source">
                    <Select
                      value={draft.source}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current ? { ...current, source: value as LeadSource } : current,
                        )
                      }
                    >
                      <SelectTrigger id="lead-source" aria-label="Source">
                        <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectSource} />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((source) => (
                          <SelectItem key={source} value={source}>
                            {labelLeadSource(source)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Source">
                    <ReadOnlyValue value={labelLeadSource(lead.source)} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-priority" label="Priority">
                    <Select
                      value={draft.priority}
                      onValueChange={(value) =>
                        setDraft((current) =>
                          current ? { ...current, priority: value as LeadPriority } : current,
                        )
                      }
                    >
                      <SelectTrigger id="lead-priority" aria-label="Priority">
                        <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectPriority} />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {labelLeadPriority(priority)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Priority">
                    <ReadOnlyValue value={labelLeadPriority(lead.priority)} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField
                    id="lead-value"
                    label="Estimated value"
                    optional
                    validated
                    error={draftFieldError('estimatedValue')}
                  >
                    <Input
                      ref={estimatedValueRef}
                      id="lead-value"
                      inputMode="decimal"
                      placeholder={CRM_FORM_PLACEHOLDERS.estimatedValue}
                      value={draft.estimatedValue}
                      {...draftLiveFields.controlProps('estimatedValue', 'lead-value')}
                      onChange={(event) => {
                        setDraft((current) =>
                          current ? { ...current, estimatedValue: event.target.value } : current,
                        );
                        clearFormFieldError(setDraftErrors, 'estimatedValue');
                      }}
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Estimated value" optional>
                    <ReadOnlyValue value={formatMoney(lead.estimatedValue, lead.currency)} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-close" label="Expected close date" optional>
                    <Input
                      id="lead-close"
                      type="date"
                      placeholder={CRM_FORM_PLACEHOLDERS.expectedCloseDate}
                      value={draft.expectedCloseDate}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, expectedCloseDate: event.target.value }
                            : current,
                        )
                      }
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Expected close date" optional>
                    <ReadOnlyValue value={toDateInputValue(lead.expectedCloseDate) || ''} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-follow-up" label="Next follow-up" optional>
                    <Input
                      id="lead-follow-up"
                      type="datetime-local"
                      placeholder={CRM_FORM_PLACEHOLDERS.nextFollowUp}
                      value={draft.nextFollowUpDate}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, nextFollowUpDate: event.target.value }
                            : current,
                        )
                      }
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Next follow-up" optional>
                    <ReadOnlyValue
                      value={lead.nextFollowUpDate ? formatDateTime(lead.nextFollowUpDate) : ''}
                    />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-website" label="Website" optional>
                    <Input
                      id="lead-website"
                      placeholder={CRM_FORM_PLACEHOLDERS.website}
                      value={draft.website}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, website: event.target.value } : current,
                        )
                      }
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Website" optional>
                    <ReadOnlyValue value={lead.website ?? ''} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField id="lead-tags" label="Tags" optional>
                    <Input
                      id="lead-tags"
                      value={draft.tags}
                      placeholder={CRM_FORM_PLACEHOLDERS.tags}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, tags: event.target.value } : current,
                        )
                      }
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Tags" optional>
                    <ReadOnlyValue value={lead.tags.join(', ')} />
                  </CrmReadOnlyField>
                )}
                {isEdit ? (
                  <CrmFormField
                    id="lead-description"
                    label="Description"
                    optional
                    className={formGridFullWidthClass}
                  >
                    <Textarea
                      id="lead-description"
                      rows={2}
                      className="min-h-[4.5rem] resize-y"
                      placeholder={CRM_FORM_PLACEHOLDERS.description}
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, description: event.target.value } : current,
                        )
                      }
                    />
                  </CrmFormField>
                ) : (
                  <CrmReadOnlyField label="Description" optional className={formGridFullWidthClass}>
                    <ReadOnlyValue value={lead.description} />
                  </CrmReadOnlyField>
                )}
                <p className="text-muted-foreground text-xs sm:col-span-2">
                  Pipeline: {pipeline?.name ?? '—'} · Value{' '}
                  {formatMoney(lead.estimatedValue, lead.currency)} · Last activity{' '}
                  {formatDateTime(lead.lastActivityAt)}
                </p>
              </div>

              <section className="grid gap-3">
                <h2 className="text-sm font-semibold">Activity</h2>
                <div className="grid gap-2 rounded-md border p-3">
                  <div className={formGridClass}>
                    <CrmFormField id="activity-type" label="Type">
                      <Select
                        value={activityType}
                        onValueChange={(value) => setActivityType(value as LeadActivityType)}
                      >
                        <SelectTrigger id="activity-type">
                          <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectType} />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {labelActivityType(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CrmFormField>
                    <CrmFormField id="activity-when" label="When">
                      <Input
                        id="activity-when"
                        type="datetime-local"
                        placeholder={CRM_FORM_PLACEHOLDERS.activityWhen}
                        value={activityOccurredAt}
                        onChange={(event) => setActivityOccurredAt(event.target.value)}
                      />
                    </CrmFormField>
                  </div>
                  <CrmFormField id="activity-title" label="Title">
                    <Input
                      id="activity-title"
                      placeholder={CRM_FORM_PLACEHOLDERS.activityTitle}
                      value={activityTitle}
                      onChange={(event) => setActivityTitle(event.target.value)}
                    />
                  </CrmFormField>
                  <CrmFormField id="activity-description" label="Notes">
                    <Textarea
                      id="activity-description"
                      placeholder={CRM_FORM_PLACEHOLDERS.activityDescription}
                      value={activityDescription}
                      onChange={(event) => setActivityDescription(event.target.value)}
                    />
                  </CrmFormField>
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
