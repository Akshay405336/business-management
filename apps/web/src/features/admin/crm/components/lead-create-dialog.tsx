'use client';

import { createLeadRequestSchema, updateLeadRequestSchema } from '@techwin/validation';
import { z } from 'zod';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import {
  clearFormFieldError,
  mergeFieldErrors,
  zodErrorToFieldMap,
} from '@/shared/form/zod-field-error';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
  DEFAULT_LEAD_CURRENCY,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
} from '../constants';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { createLead, getLead, updateLead } from '../api/leads';
import type { CrmLead, CrmPipeline, CrmPipelineStage, LeadPriority, LeadSource } from '../types';
import { toDateInputValue, toDateTimeLocalValue } from '../utils/format';
import { applyCrmLeadContactFieldErrors, describeCrmError } from '../utils/errors';
import { labelLeadPriority, labelLeadSource } from '../utils/labels';
import { useAdminToast } from '@/features/admin/components/toast';
import { useAsyncAction } from '../hooks/use-async-action';
import { CrmFieldLabel, CrmInlineFieldError, CrmLoadingRows } from './crm-feedback';
import { PipelineStageSelectItems, PipelineStageSelectTrigger } from './pipeline-stage-select';

export const LEAD_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

export const LEAD_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

export const LEAD_FORM_DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'sm:max-w-[640px]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

export const LEAD_FORM_SELECT_TRIGGER_CLASS = cn(
  CRM_PIPELINE_FORM_FIELD_CLASS,
  'w-full border-0 shadow-none data-[placeholder]:text-muted-foreground/55',
);

const EMPTY_STAGES: readonly CrmPipelineStage[] = [];

type FormErrors = Partial<
  Record<
    | 'subject'
    | 'fullName'
    | 'email'
    | 'phone'
    | 'stageId'
    | 'estimatedValue'
    | 'pipelineId',
    string
  >
>;

export type LeadFormState = {
  subject: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  source: LeadSource;
  pipelineId: string;
  stageId: string;
  priority: LeadPriority;
  estimatedValue: string;
  expectedCloseDate: string;
  nextFollowUpDate: string;
  tags: string;
  description: string;
};

function leadFormFromLead(lead: CrmLead): LeadFormState {
  return emptyLeadForm({
    subject: lead.subject,
    fullName: lead.fullName,
    companyName: lead.companyName ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    website: lead.website ?? '',
    source: lead.source,
    pipelineId: lead.pipelineId,
    stageId: lead.stageId,
    priority: lead.priority,
    estimatedValue: lead.estimatedValue,
    expectedCloseDate: toDateInputValue(lead.expectedCloseDate),
    nextFollowUpDate: toDateTimeLocalValue(lead.nextFollowUpDate),
    tags: lead.tags.join(', '),
    description: lead.description ?? '',
  });
}

function formHasMoreDetails(form: LeadFormState): boolean {
  return (
    form.companyName.trim().length > 0 ||
    form.website.trim().length > 0 ||
    form.tags.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.expectedCloseDate.trim().length > 0 ||
    form.nextFollowUpDate.trim().length > 0 ||
    form.source !== 'WEBSITE' ||
    form.priority !== 'MEDIUM' ||
    (form.estimatedValue.trim() !== '' && form.estimatedValue.trim() !== '0')
  );
}

function activeStagesForPipeline(
  pipeline: CrmPipeline | null | undefined,
): readonly CrmPipelineStage[] {
  if (!pipeline) return [];
  return [...pipeline.stages]
    .filter((stage) => stage.status === 'ACTIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function emptyLeadForm(partial?: Partial<LeadFormState>): LeadFormState {
  return {
    subject: '',
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    website: '',
    source: 'WEBSITE',
    pipelineId: '',
    stageId: '',
    priority: 'MEDIUM',
    estimatedValue: '0',
    expectedCloseDate: '',
    nextFollowUpDate: '',
    tags: '',
    description: '',
    ...partial,
  };
}

export function LeadCreateDialog({
  open,
  onOpenChange,
  pipeline,
  stages,
  initialStageId,
  onCreated,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: CrmPipeline | null;
  stages: readonly CrmPipelineStage[];
  initialStageId?: string;
  onCreated: () => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  return (
    <LeadFormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      pipeline={pipeline}
      stages={stages}
      initialStageId={initialStageId}
      onSaved={onCreated}
      onError={onError}
      dialogKey="create"
    />
  );
}

export function LeadFormDialog({
  open,
  onOpenChange,
  mode,
  pipeline = null,
  stages: stagesProp = EMPTY_STAGES,
  initialStageId,
  editLeadId = null,
  pipelines = [],
  onSaved,
  onError,
  dialogKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  pipeline?: CrmPipeline | null;
  stages?: readonly CrmPipelineStage[];
  initialStageId?: string;
  editLeadId?: string | null;
  pipelines?: readonly CrmPipeline[];
  onSaved: () => void | Promise<void>;
  onError?: (message: string) => void;
  dialogKey?: string;
}) {
  const isEdit = mode === 'edit';
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [form, setForm] = useState<LeadFormState>(() => emptyLeadForm());
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
  const [editLead, setEditLead] = useState<CrmLead | null>(null);

  const editPipeline = isEdit
    ? pipelines.find((item) => item.id === form.pipelineId) ?? null
    : pipeline;
  const stages = isEdit ? activeStagesForPipeline(editPipeline) : stagesProp;

  const {
    errors: liveErrors,
    controlProps: liveControlProps,
    touch: touchLiveField,
    prepareSubmit: prepareLiveSubmit,
    reset: resetLiveFields,
  } = useZodFormFields(
    {
      subject: createLeadRequestSchema.shape.subject,
      fullName: createLeadRequestSchema.shape.fullName,
      email: createLeadRequestSchema.shape.email,
      phone: createLeadRequestSchema.shape.phone,
      stageId: stages.length > 0 ? z.string().min(1, 'Select a stage.') : z.string(),
      estimatedValue: createLeadRequestSchema.shape.estimatedValue,
    },
    {
      subject: form.subject,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      stageId: form.stageId,
      estimatedValue: form.estimatedValue,
    },
  );

  const fieldError = (key: keyof FormErrors) =>
    mergeFieldErrors(liveErrors, fieldErrors, key);

  const onErrorRef = useRef(onError);
  const onOpenChangeRef = useRef(onOpenChange);
  onErrorRef.current = onError;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) {
      setEditLead(null);
      setLoadingLead(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isEdit || !editLeadId) return;

    const controller = new AbortController();
    setLoadingLead(true);
    setEditLead(null);

    void (async () => {
      try {
        const lead = await getLead(editLeadId, controller.signal);
        if (controller.signal.aborted) return;
        const nextForm = leadFormFromLead(lead);
        setEditLead(lead);
        setForm(nextForm);
        setShowMoreDetails(formHasMoreDetails(nextForm));
        setFieldErrors({});
        resetLiveFields();
      } catch (failure) {
        if (!controller.signal.aborted) {
          onErrorRef.current?.(describeCrmError(failure));
          onOpenChangeRef.current(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingLead(false);
      }
    })();

    return () => controller.abort();
  }, [open, isEdit, editLeadId]);

  useEffect(() => {
    if (!open || isEdit) return;

    const pipelineId = pipeline?.id ?? '';
    const stageId =
      initialStageId && stagesProp.some((stage) => stage.id === initialStageId)
        ? initialStageId
        : (stagesProp[0]?.id ?? '');
    setForm(emptyLeadForm({ pipelineId, stageId }));
    setFieldErrors({});
    setShowMoreDetails(false);
    resetLiveFields();
  }, [open, isEdit, pipeline?.id, initialStageId, stagesProp, resetLiveFields]);

  useEffect(() => {
    if (!open || isEdit || !pipeline) return;
    setForm((current) => {
      const stageValid = stagesProp.some((stage) => stage.id === current.stageId);
      return {
        ...current,
        pipelineId: pipeline.id,
        stageId: stageValid ? current.stageId : (stagesProp[0]?.id ?? ''),
      };
    });
  }, [open, isEdit, pipeline, stagesProp]);

  const onSubmit = async () => {
    const pipelineId = editPipeline?.id ?? pipeline?.id ?? form.pipelineId;
    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      subject: form.subject.trim(),
      fullName: form.fullName.trim(),
      companyName: form.companyName.trim() || undefined,
      email: form.email,
      phone: form.phone,
      website: form.website.trim() || null,
      source: form.source,
      pipelineId,
      currency: DEFAULT_LEAD_CURRENCY,
      stageId: form.stageId || undefined,
      priority: form.priority,
      estimatedValue: form.estimatedValue.trim() || '0',
      expectedCloseDate: form.expectedCloseDate.trim() || null,
      nextFollowUpDate: form.nextFollowUpDate
        ? new Date(form.nextFollowUpDate).toISOString()
        : null,
      description: form.description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    prepareLiveSubmit();
    const parsed = createLeadRequestSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = zodErrorToFieldMap(parsed.error) as FormErrors;
      if (!pipelineId) errors.pipelineId = 'No active pipeline is available.';
      setFieldErrors(errors);
      const coreKeys = new Set([
        'subject',
        'fullName',
        'email',
        'phone',
        'stageId',
        'pipelineId',
        'estimatedValue',
      ]);
      if (Object.keys(errors).some((key) => !coreKeys.has(key))) {
        setShowMoreDetails(true);
      }
      focusFirstInvalidField();
      return;
    }
    if (!pipelineId) {
      setFieldErrors({ pipelineId: 'No active pipeline is available.' });
      return;
    }

    setFieldErrors({});
    try {
      if (isEdit) {
        if (!editLead) return;
        const parsedUpdate = updateLeadRequestSchema.safeParse(payload);
        if (!parsedUpdate.success) {
          setFieldErrors(zodErrorToFieldMap(parsedUpdate.error) as FormErrors);
          focusFirstInvalidField();
          return;
        }
        await run(() => updateLead(editLead.id, parsedUpdate.data));
        toast.success('Lead updated.');
      } else {
        await run(() => createLead(parsed.data));
        toast.success('Lead created.');
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      if (!applyCrmLeadContactFieldErrors(failure, setFieldErrors)) {
        onError?.(describeCrmError(failure));
      } else {
        focusFirstInvalidField();
      }
    }
  };

  const subjectError = fieldError('subject');
  const fullNameError = fieldError('fullName');
  const emailError = fieldError('email');
  const phoneError = fieldError('phone');
  const stageError = fieldError('stageId');
  const valueError = fieldError('estimatedValue');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={dialogKey ?? (isEdit ? `edit-${editLeadId ?? 'none'}` : 'create')}
        className={cn(LEAD_FORM_DIALOG_SHELL_CLASS, 'flex max-w-[640px] flex-col gap-0 p-0 sm:max-w-[640px]')}
      >
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isEdit ? 'Edit lead' : 'Create lead'}
          </DialogTitle>
          {editPipeline ? (
            <p className="text-muted-foreground pt-1 text-sm">
              {isEdit ? (
                <>
                  In pipeline{' '}
                  <span className="text-foreground font-medium">{editPipeline.name}</span>
                </>
              ) : (
                <>
                  Adds to <span className="text-foreground font-medium">{editPipeline.name}</span>
                </>
              )}
            </p>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loadingLead ? (
            <CrmLoadingRows rows={5} />
          ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="lead-subject" required>
                Lead subject
              </CrmFieldLabel>
              <Input
                id="lead-subject"
                placeholder={CRM_FORM_PLACEHOLDERS.leadSubject}
                value={form.subject}
                disabled={pending}
                aria-invalid={Boolean(subjectError)}
                className={cn(
                  CRM_PIPELINE_FORM_FIELD_CLASS,
                  formControlStateClass(subjectError ? 'invalid' : 'neutral'),
                )}
                {...liveControlProps('subject', 'lead-subject')}
                onChange={(event) => {
                  setForm((current) => ({ ...current, subject: event.target.value }));
                  clearFormFieldError(setFieldErrors, 'subject');
                }}
              />
              <CrmInlineFieldError message={subjectError} reserveSpace={false} />
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="lead-full-name" required>
                Full name
              </CrmFieldLabel>
              <Input
                id="lead-full-name"
                placeholder={CRM_FORM_PLACEHOLDERS.fullName}
                value={form.fullName}
                disabled={pending}
                aria-invalid={Boolean(fullNameError)}
                className={cn(
                  CRM_PIPELINE_FORM_FIELD_CLASS,
                  formControlStateClass(fullNameError ? 'invalid' : 'neutral'),
                )}
                {...liveControlProps('fullName', 'lead-full-name')}
                onChange={(event) => {
                  setForm((current) => ({ ...current, fullName: event.target.value }));
                  clearFormFieldError(setFieldErrors, 'fullName');
                }}
              />
              <CrmInlineFieldError message={fullNameError} reserveSpace={false} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="lead-email" required>
                  Email
                </CrmFieldLabel>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder={CRM_FORM_PLACEHOLDERS.email}
                  value={form.email}
                  disabled={pending}
                  aria-invalid={Boolean(emailError)}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(emailError ? 'invalid' : 'neutral'),
                  )}
                  {...liveControlProps('email', 'lead-email')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'email');
                  }}
                />
                <CrmInlineFieldError message={emailError} reserveSpace={false} />
              </div>
              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="lead-phone" required>
                  Phone
                </CrmFieldLabel>
                <Input
                  id="lead-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder={CRM_FORM_PLACEHOLDERS.phone}
                  value={form.phone}
                  disabled={pending}
                  aria-invalid={Boolean(phoneError)}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(phoneError ? 'invalid' : 'neutral'),
                  )}
                  {...liveControlProps('phone', 'lead-phone')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, phone: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'phone');
                  }}
                />
                <CrmInlineFieldError message={phoneError} reserveSpace={false} />
              </div>
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="lead-stage" required>
                Stage
              </CrmFieldLabel>
              <Select
                value={form.stageId}
                disabled={pending || stages.length === 0}
                onValueChange={(value) => {
                  setForm((current) => ({ ...current, stageId: value }));
                  touchLiveField('stageId');
                  clearFormFieldError(setFieldErrors, 'stageId');
                }}
              >
                <SelectTrigger
                  id="lead-stage"
                  aria-label="Stage"
                  className={cn(
                    LEAD_FORM_SELECT_TRIGGER_CLASS,
                    formControlStateClass(stageError ? 'invalid' : 'neutral'),
                  )}
                  {...liveControlProps('stageId', 'lead-stage')}
                >
                  <PipelineStageSelectTrigger
                    stages={stages}
                    stageId={form.stageId || undefined}
                    placeholder={CRM_FORM_PLACEHOLDERS.selectStage}
                  />
                </SelectTrigger>
                <SelectContent>
                  <PipelineStageSelectItems stages={stages} />
                </SelectContent>
              </Select>
              <CrmInlineFieldError message={stageError} reserveSpace={false} />
            </div>

            {!showMoreDetails ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className={LEAD_FORM_SECONDARY_BTN}
                  disabled={pending}
                  onClick={() => setShowMoreDetails(true)}
                >
                  Add more details
                </Button>
              </div>
            ) : null}

            {showMoreDetails ? (
              <>
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="lead-company">Company</CrmFieldLabel>
                  <Input
                    id="lead-company"
                    placeholder={CRM_FORM_PLACEHOLDERS.company}
                    value={form.companyName}
                    disabled={pending}
                    className={CRM_PIPELINE_FORM_FIELD_CLASS}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, companyName: event.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="lead-source">Source</CrmFieldLabel>
                    <Select
                      value={form.source}
                      disabled={pending}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, source: value as LeadSource }))
                      }
                    >
                      <SelectTrigger id="lead-source" className={LEAD_FORM_SELECT_TRIGGER_CLASS}>
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
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="lead-priority">Priority</CrmFieldLabel>
                    <Select
                      value={form.priority}
                      disabled={pending}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, priority: value as LeadPriority }))
                      }
                    >
                      <SelectTrigger id="lead-priority" className={LEAD_FORM_SELECT_TRIGGER_CLASS}>
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
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="lead-value">Estimated value</CrmFieldLabel>
                    <Input
                      id="lead-value"
                      inputMode="decimal"
                      placeholder={CRM_FORM_PLACEHOLDERS.estimatedValue}
                      value={form.estimatedValue}
                      disabled={pending}
                      aria-invalid={Boolean(valueError)}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(valueError ? 'invalid' : 'neutral'),
                      )}
                      {...liveControlProps('estimatedValue', 'lead-value')}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, estimatedValue: event.target.value }));
                        clearFormFieldError(setFieldErrors, 'estimatedValue');
                      }}
                    />
                    <CrmInlineFieldError message={valueError} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="lead-website">Website</CrmFieldLabel>
                    <Input
                      id="lead-website"
                      placeholder={CRM_FORM_PLACEHOLDERS.website}
                      value={form.website}
                      disabled={pending}
                      className={CRM_PIPELINE_FORM_FIELD_CLASS}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, website: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="lead-close">Expected close date</CrmFieldLabel>
                    <Input
                      id="lead-close"
                      type="date"
                      value={form.expectedCloseDate}
                      disabled={pending}
                      className={CRM_PIPELINE_FORM_FIELD_CLASS}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          expectedCloseDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="lead-follow-up">Next follow-up</CrmFieldLabel>
                    <Input
                      id="lead-follow-up"
                      type="datetime-local"
                      value={form.nextFollowUpDate}
                      disabled={pending}
                      className={CRM_PIPELINE_FORM_FIELD_CLASS}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          nextFollowUpDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="lead-tags">Tags</CrmFieldLabel>
                  <Input
                    id="lead-tags"
                    placeholder={CRM_FORM_PLACEHOLDERS.tags}
                    value={form.tags}
                    disabled={pending}
                    className={CRM_PIPELINE_FORM_FIELD_CLASS}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, tags: event.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="lead-description">Description</CrmFieldLabel>
                  <Textarea
                    id="lead-description"
                    rows={3}
                    placeholder={CRM_FORM_PLACEHOLDERS.description}
                    value={form.description}
                    disabled={pending}
                    className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </div>
              </>
            ) : null}

            <CrmInlineFieldError message={fieldErrors.pipelineId} reserveSpace={false} />
          </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={LEAD_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', LEAD_FORM_PRIMARY_BTN)}
            disabled={pending || loadingLead || stages.length === 0 || (isEdit && !editLead)}
            onClick={() => void onSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isEdit ? 'Saving…' : 'Creating…'}
              </>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Create lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
