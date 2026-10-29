'use client';

import {
  createProjectRequestSchema,
  projectFormLiveFieldSchemas,
  updateProjectRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { isApiError } from '@/shared/api/api-error';
import {
  apiDetailsToFieldMap,
  clearFormFieldError,
  mergeFieldErrors,
  zodIssuesToFieldMap,
} from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { listClients } from '@/features/admin/crm/api/clients';
import {
  CrmFieldLabel,
  CrmInlineFieldError,
} from '@/features/admin/crm/components/crm-feedback';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { toDateInputValue } from '@/features/admin/crm/utils/format';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import type { CrmClient } from '@/features/admin/crm/types';
import { cn } from '@/shared/lib/utils';
import {
  createProject,
  getProject,
  listClientQuotations,
  listProjectManagers,
  previewProjectNumber,
  updateProject,
} from '../api/projects';
import { ProjectPlanLockNotice } from './project-plan-lock-notice';
import { isProjectPlanLocked } from '../constants/plan-lock';
import type { ProjectExecutionLifecycle } from '../types';
import {
  CRM_PROJECT_FORM_DIALOG_CLASS,
  PROJECT_FORM_FIELD_CLASS,
  PROJECT_FORM_PRIMARY_BTN,
  PROJECT_FORM_SECONDARY_BTN,
  PROJECT_FORM_SELECT_TRIGGER_CLASS,
  PROJECT_FORM_TEXTAREA_CLASS,
  PROJECT_PRIORITIES,
} from '../constants';
import { PROJECT_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type { ClientQuotationOption, ProjectManagerOption } from '../types';
import { labelProjectPriority } from '../utils/labels';
import {
  emptyProjectForm,
  formToCreatePayload,
  formToUpdatePayload,
  projectToForm,
  type ProjectFormState,
} from '../utils/project-form';

const UNSELECTED = '__none__';

const PROJECT_END_BEFORE_START = 'Expected end date must be on or after the start date.';

function formatClientSelectLabel(client: CrmClient): string {
  return [client.name, client.primaryContact, client.phone]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ');
}

function formatQuotationSelectLabel(quote: ClientQuotationOption): string {
  return [quote.documentNumber, quote.title]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ');
}

export function ProjectFormDialog({
  open,
  editingId,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  editingId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const isCreate = editingId === null;
  const [form, setForm] = useState<ProjectFormState>(() => emptyProjectForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<readonly CrmClient[]>([]);
  const [managers, setManagers] = useState<readonly ProjectManagerOption[]>([]);
  const [quotations, setQuotations] = useState<readonly ClientQuotationOption[]>([]);
  const [loadingProject, setLoadingProject] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [executionLifecycle, setExecutionLifecycle] = useState<ProjectExecutionLifecycle | null>(
    null,
  );

  const planBaselineLocked = executionLifecycle
    ? isProjectPlanLocked(executionLifecycle)
    : false;
  const projectFullyReadOnly = executionLifecycle === 'COMPLETED';

  const activeClients = useMemo(
    () => clients.filter((client) => client.status === 'ACTIVE'),
    [clients],
  );

  const liveFieldValues = useMemo(
    () => ({
      name: form.name,
      priority: form.priority,
      startDate: toDateInputValue(form.startDate),
      expectedEndDate: toDateInputValue(form.expectedEndDate),
      clientId: form.clientId,
      projectManagerAdminId: form.projectManagerAdminId.trim() ? form.projectManagerAdminId : null,
      description: form.description.trim() || undefined,
      proposalId: form.proposalId.trim() ? form.proposalId : null,
      acceptedCommercialValue: form.acceptedCommercialValue.trim() || undefined,
      scopeAndRequirements: form.scopeAndRequirements.trim() || undefined,
    }),
    [form],
  );

  const liveFields = useZodFormFields(projectFormLiveFieldSchemas, liveFieldValues, {
    disabled: loadingProject,
  });

  const fieldError = (key: string) => {
    const liveKey = key as keyof typeof projectFormLiveFieldSchemas;
    if (liveKey in projectFormLiveFieldSchemas) {
      const liveErr = liveFields.errors[liveKey];
      if (liveErr) return liveErr;
      if (key === 'expectedEndDate' && fieldErrors.expectedEndDate === PROJECT_END_BEFORE_START) {
        return fieldErrors.expectedEndDate;
      }
      return undefined;
    }
    return mergeFieldErrors(liveFields.errors, fieldErrors, key);
  };

  const resetForm = useCallback(() => {
    setForm(emptyProjectForm());
    setFieldErrors({});
    setQuotations([]);
    setShowMoreDetails(false);
    setExecutionLifecycle(null);
    liveFields.reset();
  }, [liveFields]);

  useEffect(() => {
    if (!open) return;
    setFieldErrors((current) => {
      const next = { ...current };
      const start = toDateInputValue(form.startDate);
      const end = toDateInputValue(form.expectedEndDate);
      if (!start || !end) {
        if (next.expectedEndDate === PROJECT_END_BEFORE_START) {
          delete next.expectedEndDate;
        }
        return next;
      }
      if (end < start) {
        next.expectedEndDate = PROJECT_END_BEFORE_START;
      } else if (next.expectedEndDate === PROJECT_END_BEFORE_START) {
        delete next.expectedEndDate;
      }
      return next;
    });
  }, [open, form.startDate, form.expectedEndDate]);

  useEffect(() => {
    if (!open) return;
    void listClients()
      .then((result) => setClients(result.clients))
      .catch(() => setClients([]));
    void listProjectManagers()
      .then((result) => setManagers(result.managers))
      .catch(() => setManagers([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      resetForm();
      return;
    }
    setLoadingProject(true);
    void getProject(editingId)
      .then((project) => {
        const next = projectToForm(project);
        setForm(next);
        setShowMoreDetails(
          Boolean(next.description.trim()) || Boolean(next.scopeAndRequirements.trim()),
        );
        setExecutionLifecycle(project.executionLifecycle);
        setFieldErrors({});
        liveFields.reset();
      })
      .catch((failure) => toast.error(describeCrmError(failure)))
      .finally(() => setLoadingProject(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open + id
  }, [open, editingId, toast]);

  useEffect(() => {
    if (!open || editingId) return;
    const controller = new AbortController();
    setForm((current) => ({ ...current, projectNumber: '' }));
    void previewProjectNumber(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((current) => ({ ...current, projectNumber: result.projectNumber }));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
      });
    return () => controller.abort();
  }, [open, editingId]);

  useEffect(() => {
    if (!open || !form.clientId) {
      setQuotations([]);
      return;
    }
    const controller = new AbortController();
    void listClientQuotations(form.clientId, controller.signal)
      .then((result) => setQuotations(result.quotations))
      .catch(() => setQuotations([]));
    return () => controller.abort();
  }, [open, form.clientId]);

  const applyClient = (clientId: string) => {
    const client = activeClients.find((item) => item.id === clientId);
    if (!client) return;
    setForm((current) => ({
      ...current,
      clientId,
      clientName: client.name,
      companyName: client.primaryContact ?? '',
      clientPhone: '',
      clientEmail: '',
      proposalId: '',
      quotationNumber: '',
      quotationTitle: '',
      acceptedCommercialValue: '',
    }));
    liveFields.touch('clientId');
    clearFormFieldError(setFieldErrors, 'clientId');
  };

  const applyQuotation = (proposalId: string) => {
    if (proposalId === UNSELECTED) {
      setForm((current) => ({
        ...current,
        proposalId: '',
        quotationNumber: '',
        quotationTitle: '',
        acceptedCommercialValue: '',
      }));
      liveFields.touch('proposalId');
      clearFormFieldError(setFieldErrors, 'proposalId');
      return;
    }
    const quote = quotations.find((item) => item.id === proposalId);
    if (!quote) return;
    setForm((current) => ({
      ...current,
      proposalId,
      quotationNumber: quote.documentNumber,
      quotationTitle: quote.title,
      acceptedCommercialValue: quote.grandTotal,
    }));
    liveFields.touch('proposalId');
    clearFormFieldError(setFieldErrors, 'proposalId');
  };

  const onSubmit = async () => {
    if (projectFullyReadOnly) return;
    liveFields.prepareSubmit();
    let payload = editingId ? formToUpdatePayload(form) : formToCreatePayload(form);
    if (editingId && planBaselineLocked) {
      const {
        startDate: _start,
        expectedEndDate: _end,
        scopeAndRequirements: _scope,
        ...safePayload
      } = payload;
      payload = safePayload as typeof payload;
    }
    const schema = editingId ? updateProjectRequestSchema : createProjectRequestSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    setFieldErrors({});
    try {
      if (editingId) {
        await run(() => updateProject(editingId, parsed.data));
        toast.success('Project updated.');
      } else {
        await run(() => createProject(parsed.data as Parameters<typeof createProject>[0]));
        toast.success('Project created.');
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      if (isApiError(failure) && failure.details.length > 0) {
        setFieldErrors((current) => ({ ...current, ...apiDetailsToFieldMap(failure.details) }));
        focusFirstInvalidField();
      }
      toast.error(describeCrmError(failure));
    }
  };

  const nameError = fieldError('name');
  const priorityError = fieldError('priority');
  const managerError = fieldError('projectManagerAdminId');
  const startError = fieldError('startDate');
  const endError = fieldError('expectedEndDate');
  const clientError = fieldError('clientId');
  const proposalError = fieldError('proposalId');
  const descriptionError = fieldError('description');
  const scopeError = fieldError('scopeAndRequirements');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CRM_PROJECT_FORM_DIALOG_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Create project' : 'Edit project'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loadingProject ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading project…
            </div>
          ) : (
            <div className="grid gap-4 pb-2">
              {planBaselineLocked ? <ProjectPlanLockNotice className="my-0" /> : null}

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 sm:items-start">
                <div className="grid min-w-0 gap-2">
                  <CrmFieldLabel htmlFor="project-name" required>
                    Project name
                  </CrmFieldLabel>
                  <Input
                    id="project-name"
                    value={form.name}
                    disabled={pending || projectFullyReadOnly}
                    placeholder={PROJECT_FORM_PLACEHOLDERS.projectName}
                    aria-invalid={Boolean(nameError)}
                    className={cn(
                      PROJECT_FORM_FIELD_CLASS,
                      formControlStateClass(nameError ? 'invalid' : 'neutral'),
                    )}
                    {...liveFields.controlProps('name', 'project-name')}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, name: event.target.value }));
                      clearFormFieldError(setFieldErrors, 'name');
                    }}
                  />
                  <CrmInlineFieldError message={nameError} reserveSpace={false} />
                </div>
                <div className="grid min-w-0 gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <CrmFieldLabel htmlFor="project-number">Project number</CrmFieldLabel>
                    <span className="text-muted-foreground shrink-0 text-xs font-normal">
                      Auto-generated
                    </span>
                  </div>
                  <Input
                    id="project-number"
                    readOnly
                    value={form.projectNumber}
                    placeholder={!editingId && !form.projectNumber ? 'Loading…' : undefined}
                    className={cn(PROJECT_FORM_FIELD_CLASS, 'text-muted-foreground')}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="project-priority" required>
                    Priority
                  </CrmFieldLabel>
                  <Select
                    value={form.priority}
                    disabled={pending || projectFullyReadOnly}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) liveFields.touch('priority');
                    }}
                    onValueChange={(value) => {
                      setForm((current) => ({
                        ...current,
                        priority: value as ProjectFormState['priority'],
                      }));
                      liveFields.touch('priority');
                      clearFormFieldError(setFieldErrors, 'priority');
                    }}
                  >
                    <SelectTrigger
                      id="project-priority"
                      className={cn(
                        PROJECT_FORM_SELECT_TRIGGER_CLASS,
                        formControlStateClass(priorityError ? 'invalid' : 'neutral'),
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {labelProjectPriority(priority)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CrmInlineFieldError message={priorityError} reserveSpace={false} />
                </div>
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="project-manager">Project manager</CrmFieldLabel>
                  <Select
                    value={form.projectManagerAdminId || UNSELECTED}
                    disabled={pending || projectFullyReadOnly}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) liveFields.touch('projectManagerAdminId');
                    }}
                    onValueChange={(value) => {
                      setForm((current) => ({
                        ...current,
                        projectManagerAdminId: value === UNSELECTED ? '' : value,
                      }));
                      liveFields.touch('projectManagerAdminId');
                      clearFormFieldError(setFieldErrors, 'projectManagerAdminId');
                    }}
                  >
                    <SelectTrigger
                      id="project-manager"
                      className={cn(
                        PROJECT_FORM_SELECT_TRIGGER_CLASS,
                        formControlStateClass(managerError ? 'invalid' : 'neutral'),
                      )}
                    >
                      <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.selectManager} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSELECTED}>Unassigned</SelectItem>
                      {managers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CrmInlineFieldError message={managerError} reserveSpace={false} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="project-start" required>
                    Expected start date
                  </CrmFieldLabel>
                  <Input
                    id="project-start"
                    type="date"
                    value={form.startDate}
                    disabled={planBaselineLocked || projectFullyReadOnly || pending}
                    aria-invalid={Boolean(startError)}
                    className={cn(
                      PROJECT_FORM_FIELD_CLASS,
                      formControlStateClass(startError ? 'invalid' : 'neutral'),
                    )}
                    {...liveFields.controlProps('startDate', 'project-start')}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        startDate: toDateInputValue(event.target.value),
                      }));
                      liveFields.touch('startDate');
                      clearFormFieldError(setFieldErrors, 'startDate');
                    }}
                  />
                  <CrmInlineFieldError message={startError} reserveSpace={false} />
                </div>
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="project-end" required>
                    Expected end date
                  </CrmFieldLabel>
                  <Input
                    id="project-end"
                    type="date"
                    value={form.expectedEndDate}
                    disabled={planBaselineLocked || projectFullyReadOnly || pending}
                    aria-invalid={Boolean(endError)}
                    className={cn(
                      PROJECT_FORM_FIELD_CLASS,
                      formControlStateClass(endError ? 'invalid' : 'neutral'),
                    )}
                    {...liveFields.controlProps('expectedEndDate', 'project-end')}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        expectedEndDate: toDateInputValue(event.target.value),
                      }));
                      liveFields.touch('expectedEndDate');
                      clearFormFieldError(setFieldErrors, 'expectedEndDate');
                    }}
                  />
                  <CrmInlineFieldError message={endError} reserveSpace={false} />
                </div>
              </div>

              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="project-client" required>
                  Existing client
                </CrmFieldLabel>
                <Select
                  value={form.clientId || UNSELECTED}
                  disabled={pending || projectFullyReadOnly}
                  onOpenChange={(nextOpen) => {
                    if (!nextOpen) liveFields.touch('clientId');
                  }}
                  onValueChange={(value) => {
                    if (value === UNSELECTED) return;
                    applyClient(value);
                  }}
                >
                  <SelectTrigger
                    id="project-client"
                    className={cn(
                      PROJECT_FORM_SELECT_TRIGGER_CLASS,
                      formControlStateClass(clientError ? 'invalid' : 'neutral'),
                    )}
                  >
                    <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.selectClient} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSELECTED} disabled>
                      Select a client
                    </SelectItem>
                    {activeClients.map((client) => (
                      <SelectItem key={client.id} value={client.id} title={formatClientSelectLabel(client)}>
                        <span className="block truncate">{formatClientSelectLabel(client)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CrmInlineFieldError message={clientError} reserveSpace={false} />
              </div>

              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="project-quotation">Related quotation</CrmFieldLabel>
                <Select
                  value={form.proposalId || UNSELECTED}
                  disabled={!form.clientId || pending || projectFullyReadOnly}
                  onOpenChange={(nextOpen) => {
                    if (!nextOpen) liveFields.touch('proposalId');
                  }}
                  onValueChange={applyQuotation}
                >
                  <SelectTrigger
                    id="project-quotation"
                    className={cn(
                      PROJECT_FORM_SELECT_TRIGGER_CLASS,
                      formControlStateClass(proposalError ? 'invalid' : 'neutral'),
                    )}
                  >
                    <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.selectQuotation} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSELECTED}>No quotation</SelectItem>
                    {quotations.map((quote) => (
                      <SelectItem
                        key={quote.id}
                        value={quote.id}
                        title={formatQuotationSelectLabel(quote)}
                      >
                        <span className="block truncate">{formatQuotationSelectLabel(quote)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CrmInlineFieldError message={proposalError} reserveSpace={false} />
              </div>

              {!showMoreDetails ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className={PROJECT_FORM_SECONDARY_BTN}
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
                    <CrmFieldLabel htmlFor="project-description">Description</CrmFieldLabel>
                    <Textarea
                      id="project-description"
                      rows={3}
                      value={form.description}
                      disabled={pending || projectFullyReadOnly}
                      placeholder={PROJECT_FORM_PLACEHOLDERS.description}
                      aria-invalid={Boolean(descriptionError)}
                      className={cn(
                        PROJECT_FORM_TEXTAREA_CLASS,
                        formControlStateClass(descriptionError ? 'invalid' : 'neutral'),
                      )}
                      {...liveFields.controlProps('description', 'project-description')}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, description: event.target.value }));
                        clearFormFieldError(setFieldErrors, 'description');
                      }}
                    />
                    <CrmInlineFieldError message={descriptionError} reserveSpace={false} />
                  </div>
                  {!planBaselineLocked ? (
                    <div className="grid gap-2">
                      <CrmFieldLabel htmlFor="project-scope">Scope and requirements</CrmFieldLabel>
                      <Textarea
                        id="project-scope"
                        rows={3}
                        value={form.scopeAndRequirements}
                        disabled={pending || projectFullyReadOnly}
                        placeholder={PROJECT_FORM_PLACEHOLDERS.scope}
                        aria-invalid={Boolean(scopeError)}
                        className={cn(
                          PROJECT_FORM_TEXTAREA_CLASS,
                          formControlStateClass(scopeError ? 'invalid' : 'neutral'),
                        )}
                        {...liveFields.controlProps('scopeAndRequirements', 'project-scope')}
                        onChange={(event) => {
                          setForm((current) => ({
                            ...current,
                            scopeAndRequirements: event.target.value,
                          }));
                          clearFormFieldError(setFieldErrors, 'scopeAndRequirements');
                        }}
                      />
                      <CrmInlineFieldError message={scopeError} reserveSpace={false} />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={PROJECT_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', PROJECT_FORM_PRIMARY_BTN)}
            disabled={pending || loadingProject || projectFullyReadOnly}
            onClick={() => void onSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create project'
            ) : (
              'Save project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
