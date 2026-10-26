'use client';

import {
  createProjectRequestSchema,
  projectFormLiveFieldSchemas,
  updateProjectRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { formGridClass, formGridFullWidthClass } from '@/shared/form/form-layout';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { isApiError } from '@/shared/api/api-error';
import {
  apiDetailsToFieldMap,
  clearFormFieldError,
  mergeFieldErrors,
  zodIssuesToFieldMap,
} from '@/shared/form/zod-field-error';
import { FolderKanban, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { listClients } from '@/features/admin/crm/api/clients';
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { toDateInputValue } from '@/features/admin/crm/utils/format';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import type { CrmClient } from '@/features/admin/crm/types';
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
import { CRM_PROJECT_FORM_DIALOG_CLASS, PROJECT_PRIORITIES } from '../constants';
import { PROJECT_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type { ClientQuotationOption, ProjectManagerOption } from '../types';
import { labelProjectPriority } from '../utils/labels';
import {
  ProjectPhasesEditor,
  validatePhaseFormRows,
} from './project-phases-editor';
import {
  addProjectPhase,
  applyProjectTimelineChange,
  emptyProjectForm,
  formToCreatePayload,
  formToUpdatePayload,
  patchProjectPhaseRow,
  projectToForm,
  reorderProjectPhases,
  replaceProjectPhases,
  type ProjectFormState,
} from '../utils/project-form';

const clientFieldsRowClass =
  'grid grid-cols-1 items-start gap-x-[18px] gap-y-5 sm:grid-cols-2 lg:grid-cols-4';

const UNSELECTED = '__none__';

const PROJECT_END_BEFORE_START = 'Expected end date must be on or after the start date.';

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
  const [form, setForm] = useState<ProjectFormState>(() => emptyProjectForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<readonly CrmClient[]>([]);
  const [managers, setManagers] = useState<readonly ProjectManagerOption[]>([]);
  const [quotations, setQuotations] = useState<readonly ClientQuotationOption[]>([]);
  const [numberPreviewHint, setNumberPreviewHint] = useState('');
  const [loadingProject, setLoadingProject] = useState(false);
  const [phaseSubmitAttempted, setPhaseSubmitAttempted] = useState(false);
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
    setPhaseSubmitAttempted(false);
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
        setForm(projectToForm(project));
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
    setNumberPreviewHint('Loading next project number…');
    void previewProjectNumber(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((current) => ({ ...current, projectNumber: result.projectNumber }));
        setNumberPreviewHint('Preview only — the server assigns the final number when you save.');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setNumberPreviewHint('Could not load project number preview.');
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
      companyName: client.primaryContact,
      clientPhone: client.phone ?? '',
      clientEmail: client.email ?? '',
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
      clearFormFieldError(setFieldErrors, 'acceptedCommercialValue');
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
    clearFormFieldError(setFieldErrors, 'acceptedCommercialValue');
  };

  const onSubmit = async () => {
    if (projectFullyReadOnly) return;
    liveFields.prepareSubmit();
    setPhaseSubmitAttempted(true);
    const phaseErrors =
      editingId && planBaselineLocked
        ? {}
        : validatePhaseFormRows(form.phases, form.startDate, form.expectedEndDate);
    let payload = editingId ? formToUpdatePayload(form) : formToCreatePayload(form);
    if (editingId && planBaselineLocked) {
      const {
        startDate: _start,
        expectedEndDate: _end,
        phases: _phases,
        scopeAndRequirements: _scope,
        ...safePayload
      } = payload;
      payload = safePayload as typeof payload;
    }
    const schema = editingId ? updateProjectRequestSchema : createProjectRequestSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const errors = { ...zodIssuesToFieldMap(parsed.error), ...phaseErrors };
      setFieldErrors(errors);
      focusFirstInvalidField();
      return;
    }
    if (Object.keys(phaseErrors).length > 0) {
      setFieldErrors(phaseErrors);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CRM_PROJECT_FORM_DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="size-4" aria-hidden="true" />
            {editingId ? 'Edit project' : 'New project'}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? 'Update project details, delivery phases, and client link.'
              : 'Create a project with client details, optional quotation link, and custom delivery phases.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loadingProject ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading project…
            </div>
          ) : (
            <div className="grid gap-8">
              <section className="grid gap-4">
                <h3 className="text-sm font-semibold">Project details</h3>
                <div className={formGridClass}>
                  <CrmFormField label="Project number" id="projectNumber">
                    <Input
                      id="projectNumber"
                      readOnly
                      value={form.projectNumber}
                      className="bg-muted/40"
                    />
                    {!editingId && numberPreviewHint ? (
                      <p className="text-muted-foreground mt-1 text-xs">{numberPreviewHint}</p>
                    ) : null}
                  </CrmFormField>
                  <CrmFormField
                    label="Project name"
                    id="name"
                    required
                    validated
                    error={fieldError('name')}
                  >
                    <Input
                      id="name"
                      value={form.name}
                      placeholder={PROJECT_FORM_PLACEHOLDERS.projectName}
                      className={formControlStateClass(liveFields.controlState('name'))}
                      {...liveFields.controlProps('name', 'name')}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, name: event.target.value }));
                        clearFormFieldError(setFieldErrors, 'name');
                      }}
                    />
                  </CrmFormField>
                  <CrmFormField
                    label="Priority"
                    id="priority"
                    required
                    validated
                    error={fieldError('priority')}
                  >
                    <Select
                      value={form.priority}
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
                        id="priority"
                        className={formControlStateClass(liveFields.controlState('priority'))}
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
                  </CrmFormField>
                  <CrmFormField
                    label="Project manager"
                    id="projectManager"
                    optional
                    validated={Boolean(fieldError('projectManagerAdminId'))}
                    error={fieldError('projectManagerAdminId')}
                  >
                    <Select
                      value={form.projectManagerAdminId || UNSELECTED}
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
                        id="projectManager"
                        className={formControlStateClass(
                          liveFields.controlState('projectManagerAdminId'),
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
                  </CrmFormField>
                  <CrmFormField
                    label="Expected start date"
                    id="startDate"
                    required
                    validated
                    error={fieldError('startDate')}
                  >
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      disabled={planBaselineLocked || projectFullyReadOnly}
                      className={formControlStateClass(liveFields.controlState('startDate'))}
                      {...liveFields.controlProps('startDate', 'startDate')}
                      onChange={(event) => {
                        setForm((current) => {
                          const startDate = toDateInputValue(event.target.value);
                          return {
                            ...current,
                            startDate,
                            phases: applyProjectTimelineChange(
                              current.phases,
                              startDate,
                              current.expectedEndDate,
                            ),
                          };
                        });
                        liveFields.touch('startDate');
                        clearFormFieldError(setFieldErrors, 'startDate');
                      }}
                    />
                  </CrmFormField>
                  <CrmFormField
                    label="Expected end date"
                    id="expectedEndDate"
                    required
                    validated
                    error={fieldError('expectedEndDate')}
                  >
                    <Input
                      id="expectedEndDate"
                      type="date"
                      value={form.expectedEndDate}
                      disabled={planBaselineLocked || projectFullyReadOnly}
                      className={formControlStateClass(liveFields.controlState('expectedEndDate'))}
                      {...liveFields.controlProps('expectedEndDate', 'expectedEndDate')}
                      onChange={(event) => {
                        setForm((current) => {
                          const expectedEndDate = toDateInputValue(event.target.value);
                          return {
                            ...current,
                            expectedEndDate,
                            phases: applyProjectTimelineChange(
                              current.phases,
                              current.startDate,
                              expectedEndDate,
                            ),
                          };
                        });
                        liveFields.touch('expectedEndDate');
                        clearFormFieldError(setFieldErrors, 'expectedEndDate');
                      }}
                    />
                  </CrmFormField>
                  <div className={formGridFullWidthClass}>
                    <CrmFormField
                      label="Description"
                      id="description"
                      optional
                      validated={Boolean(fieldError('description'))}
                      error={fieldError('description')}
                    >
                      <Textarea
                        id="description"
                        rows={3}
                        value={form.description}
                        placeholder={PROJECT_FORM_PLACEHOLDERS.description}
                        className={formControlStateClass(liveFields.controlState('description'))}
                        {...liveFields.controlProps('description', 'description')}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, description: event.target.value }));
                          clearFormFieldError(setFieldErrors, 'description');
                        }}
                      />
                    </CrmFormField>
                  </div>
                </div>
              </section>

              <section className="grid gap-4">
                <h3 className="text-sm font-semibold">Client information</h3>
                <CrmFormField
                  label="Existing client"
                  id="clientId"
                  required
                  validated
                  error={fieldError('clientId')}
                >
                  <Select
                    value={form.clientId || UNSELECTED}
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) liveFields.touch('clientId');
                    }}
                    onValueChange={(value) => {
                      if (value === UNSELECTED) return;
                      applyClient(value);
                    }}
                  >
                    <SelectTrigger
                      id="clientId"
                      className={formControlStateClass(liveFields.controlState('clientId'))}
                    >
                      <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.selectClient} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSELECTED} disabled>
                        Select a client
                      </SelectItem>
                      {activeClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                          {client.primaryContact ? ` · ${client.primaryContact}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CrmFormField>
                <div className={clientFieldsRowClass}>
                  <CrmFormField label="Client name">
                    <Input readOnly value={form.clientName} className="bg-muted/40" />
                  </CrmFormField>
                  <CrmFormField label="Company / contact">
                    <Input readOnly value={form.companyName} className="bg-muted/40" />
                  </CrmFormField>
                  <CrmFormField label="Phone">
                    <Input readOnly value={form.clientPhone} className="bg-muted/40" />
                  </CrmFormField>
                  <CrmFormField label="Email">
                    <Input readOnly value={form.clientEmail} className="bg-muted/40" />
                  </CrmFormField>
                </div>
              </section>

              <section className="grid gap-4">
                <h3 className="text-sm font-semibold">Quotation and commercial information</h3>
                <div className={formGridClass}>
                  <CrmFormField
                    label="Related quotation"
                    id="proposalId"
                    optional
                    validated={Boolean(fieldError('proposalId'))}
                    error={fieldError('proposalId')}
                  >
                    <Select
                      value={form.proposalId || UNSELECTED}
                      onOpenChange={(nextOpen) => {
                        if (!nextOpen) liveFields.touch('proposalId');
                      }}
                      onValueChange={applyQuotation}
                      disabled={!form.clientId}
                    >
                      <SelectTrigger
                        id="proposalId"
                        className={formControlStateClass(liveFields.controlState('proposalId'))}
                      >
                        <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.selectQuotation} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNSELECTED}>No quotation</SelectItem>
                        {quotations.map((quote) => (
                          <SelectItem key={quote.id} value={quote.id}>
                            {quote.documentNumber} · {quote.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CrmFormField>
                  <CrmFormField label="Quotation number">
                    <Input readOnly value={form.quotationNumber} className="bg-muted/40" />
                  </CrmFormField>
                  <CrmFormField label="Quotation summary">
                    <Input readOnly value={form.quotationTitle} className="bg-muted/40" />
                  </CrmFormField>
                  <CrmFormField
                    label="Project budget / commercial value"
                    id="acceptedCommercialValue"
                    optional
                    validated={Boolean(fieldError('acceptedCommercialValue'))}
                    error={fieldError('acceptedCommercialValue')}
                  >
                    <Input
                      id="acceptedCommercialValue"
                      value={form.acceptedCommercialValue}
                      placeholder="Optional amount in INR"
                      className={formControlStateClass(
                        liveFields.controlState('acceptedCommercialValue'),
                      )}
                      {...liveFields.controlProps(
                        'acceptedCommercialValue',
                        'acceptedCommercialValue',
                      )}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          acceptedCommercialValue: event.target.value,
                        }));
                        clearFormFieldError(setFieldErrors, 'acceptedCommercialValue');
                      }}
                    />
                  </CrmFormField>
                </div>
              </section>

              {planBaselineLocked ? (
                <ProjectPlanLockNotice className="my-2" />
              ) : (
                <>
                  <section className="grid gap-4">
                    <h3 className="text-sm font-semibold">Project scope</h3>
                    <div className={formGridClass}>
                      <div className={formGridFullWidthClass}>
                        <CrmFormField
                          label="Scope and requirements"
                          id="scopeAndRequirements"
                          optional
                          validated={Boolean(fieldError('scopeAndRequirements'))}
                          error={fieldError('scopeAndRequirements')}
                        >
                          <Textarea
                            id="scopeAndRequirements"
                            rows={3}
                            value={form.scopeAndRequirements}
                            placeholder={PROJECT_FORM_PLACEHOLDERS.scope}
                            className={formControlStateClass(
                              liveFields.controlState('scopeAndRequirements'),
                            )}
                            {...liveFields.controlProps(
                              'scopeAndRequirements',
                              'scopeAndRequirements',
                            )}
                            onChange={(event) => {
                              setForm((current) => ({
                                ...current,
                                scopeAndRequirements: event.target.value,
                              }));
                              clearFormFieldError(setFieldErrors, 'scopeAndRequirements');
                            }}
                          />
                        </CrmFormField>
                      </div>
                    </div>
                  </section>

                  <ProjectPhasesEditor
                    phases={form.phases}
                    projectStartDate={form.startDate}
                    projectExpectedEndDate={form.expectedEndDate}
                    fieldErrors={fieldErrors}
                    submitAttempted={phaseSubmitAttempted}
                    onAddPhase={() =>
                      setForm((current) => ({
                        ...current,
                        phases: addProjectPhase(
                          current.phases,
                          current.startDate,
                          current.expectedEndDate,
                        ),
                      }))
                    }
                    onPatchPhase={(key, patch, manualDateField) =>
                      setForm((current) => ({
                        ...current,
                        phases: patchProjectPhaseRow(
                          current.phases,
                          key,
                          patch,
                          manualDateField ?? null,
                          current.startDate,
                          current.expectedEndDate,
                        ),
                      }))
                    }
                    onReorderPhases={(phases) =>
                      setForm((current) => ({
                        ...current,
                        phases: reorderProjectPhases(
                          phases,
                          current.startDate,
                          current.expectedEndDate,
                        ),
                      }))
                    }
                    onRemovePhases={(phases) =>
                      setForm((current) => ({
                        ...current,
                        phases: replaceProjectPhases(
                          phases,
                          current.startDate,
                          current.expectedEndDate,
                        ),
                      }))
                    }
                  />
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || loadingProject || projectFullyReadOnly}
            onClick={() => void onSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : editingId ? (
              'Save changes'
            ) : (
              'Create project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
