'use client';

import {
  createEmployeeRequestSchema,
  leadEmailSchema,
  leadPhoneSchema,
  updateEmployeeRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { clearFormFieldError, mergeFieldErrors, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CrmFieldLabel,
  CrmFormField,
  formGridClass,
  formGridFullWidthClass,
} from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { cn } from '@/shared/lib/utils';
import {
  createEmployee,
  getEmployee,
  previewEmployeeCode,
  updateEmployee,
  uploadEmployeeProfileImage,
} from '../api/employees';
import { revokeDeferredImagePreview } from '@/features/admin/media/components/image-upload-field';
import { EMPLOYEE_EMPLOYMENT_TYPES } from '../constants';
import type { EmployeeEmploymentType } from '../types';
import { applyEmployeeFieldErrors, describeEmployeeError } from '../utils/errors';
import {
  employeeDetailToForm,
  employeeFormToPayload,
  emptyEmployeeForm,
  type EmployeeFormState,
} from '../utils/employee-form';
import { labelEmploymentType } from '../utils/labels';
import { EmployeeProfileImageField } from './employee-profile-image-field';
import {
  EmployeeSalarySection,
  emptySalaryForm,
  type EmployeeSalaryFormState,
} from './employee-salary-section';

const FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const EMPLOYMENT_FIELD_KEYS = ['jobTitle', 'employmentType', 'dateOfJoining'] as const;
const MORE_DETAILS_FIELD_KEYS = [
  'alternatePhone',
  'workLocation',
  'probationEndDate',
  'employmentEndDate',
  'notes',
] as const;

function employeeHasMoreDetails(form: EmployeeFormState): boolean {
  return (
    Boolean(form.alternatePhone.trim()) ||
    Boolean(form.workLocation.trim()) ||
    Boolean(form.probationEndDate.trim()) ||
    Boolean(form.employmentEndDate.trim()) ||
    Boolean(form.notes.trim())
  );
}

function revealCreateSectionsForErrors(
  errors: Record<string, string>,
  setters: {
    readonly setShowEmploymentInformation: (value: boolean) => void;
    readonly setShowMoreDetails: (value: boolean) => void;
    readonly setShowCompensation: (value: boolean) => void;
    readonly setShowProfilePhoto: (value: boolean) => void;
  },
): void {
  if (EMPLOYMENT_FIELD_KEYS.some((key) => errors[key])) {
    setters.setShowEmploymentInformation(true);
  }
  if (MORE_DETAILS_FIELD_KEYS.some((key) => errors[key])) {
    setters.setShowEmploymentInformation(true);
    setters.setShowMoreDetails(true);
  }
  if (Object.keys(errors).some((key) => key.startsWith('salaryStructure'))) {
    setters.setShowCompensation(true);
  }
  if (errors.profileImageStoredObjectId) {
    setters.setShowProfilePhoto(true);
  }
}

function salaryFromDetail(detail: Awaited<ReturnType<typeof getEmployee>>): EmployeeSalaryFormState {
  if (!detail.salaryStructure) return emptySalaryForm();
  const { totalEarnings: _e, totalDeductions: _d, estimatedNetSalary: _n, ...rest } =
    detail.salaryStructure;
  return rest;
}

export function EmployeeFormDialog({
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
  const { has } = useAdminAccess();
  const canManageCompensation = has('employees.compensation.manage');
  const canReadCompensation = has('employees.compensation.read');
  const isCreate = editingId === null;

  const [form, setForm] = useState<EmployeeFormState>(() => emptyEmployeeForm());
  const [salaryForm, setSalaryForm] = useState<EmployeeSalaryFormState>(() => emptySalaryForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [codePreviewHint, setCodePreviewHint] = useState('');
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [showProfilePhoto, setShowProfilePhoto] = useState(false);
  const [showEmploymentInformation, setShowEmploymentInformation] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showCompensation, setShowCompensation] = useState(false);

  const resetCreateForm = useCallback(() => {
    setForm((current) => {
      revokeDeferredImagePreview(current.profileImage.localPreviewUrl);
      return emptyEmployeeForm();
    });
    setSalaryForm(emptySalaryForm());
    setFormErrors({});
    setCodePreviewHint('');
    setShowProfilePhoto(false);
    setShowEmploymentInformation(false);
    setShowMoreDetails(false);
    setShowCompensation(false);
  }, []);

  const closeDialog = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setForm((current) => {
          revokeDeferredImagePreview(current.profileImage.localPreviewUrl);
          return current;
        });
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const liveFields = useZodFormFields(
    {
      firstName: createEmployeeRequestSchema.shape.firstName,
      lastName: createEmployeeRequestSchema.shape.lastName,
      workEmail: leadEmailSchema,
      phone: leadPhoneSchema,
      jobTitle: createEmployeeRequestSchema.shape.jobTitle,
      dateOfJoining: createEmployeeRequestSchema.shape.dateOfJoining,
    },
    {
      firstName: form.firstName,
      lastName: form.lastName,
      workEmail: form.workEmail,
      phone: form.phone,
      jobTitle: form.jobTitle,
      dateOfJoining: form.dateOfJoining.trim() === '' ? '1970-01-01' : form.dateOfJoining,
    },
  );

  const fieldError = (key: string) => mergeFieldErrors(liveFields.errors, formErrors, key);

  const liveControlClass = (
    name: 'firstName' | 'lastName' | 'workEmail' | 'phone' | 'jobTitle' | 'dateOfJoining',
  ) => cn(CRM_PIPELINE_FORM_FIELD_CLASS, formControlStateClass(liveFields.controlState(name)));

  const simpleInputClass = (invalid: boolean) =>
    cn(CRM_PIPELINE_FORM_FIELD_CLASS, formControlStateClass(invalid ? 'invalid' : 'neutral'));

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      resetCreateForm();
      return;
    }
    setLoadingEmployee(true);
    void getEmployee(editingId)
      .then((detail) => {
        const nextForm = employeeDetailToForm(detail);
        setForm(nextForm);
        if (canReadCompensation) setSalaryForm(salaryFromDetail(detail));
        setFormErrors({});
        setShowProfilePhoto(Boolean(detail.profileImageUrl));
        setShowEmploymentInformation(true);
        setShowMoreDetails(employeeHasMoreDetails(nextForm));
        setShowCompensation(Boolean(detail.salaryStructure) && canManageCompensation);
      })
      .catch((failure) => toast.error(describeEmployeeError(failure)))
      .finally(() => setLoadingEmployee(false));
  }, [open, editingId, isCreate, resetCreateForm, canReadCompensation, canManageCompensation, toast]);

  useEffect(() => {
    if (!open || !isCreate) return;
    const controller = new AbortController();
    setForm((f) => ({ ...f, employeeCode: '' }));
    setCodePreviewHint('Loading next employee code…');
    void previewEmployeeCode(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((f) => ({ ...f, employeeCode: result.employeeCode }));
        setCodePreviewHint('Preview only — the server assigns the final code when you save.');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCodePreviewHint('Could not load code preview.');
      });
    return () => controller.abort();
  }, [open, isCreate]);

  const resolveProfileImageStoredObjectId = async (): Promise<string | null | undefined> => {
    const { profileImage } = form;
    if (profileImage.removeOnSave) return null;
    if (profileImage.pendingFile) {
      const uploaded = await uploadEmployeeProfileImage(profileImage.pendingFile);
      return uploaded.profileImageStoredObjectId;
    }
    return undefined;
  };

  const onSubmit = async () => {
    setFormErrors({});

    if (editingId) {
      const payload = employeeFormToPayload(form, {
        editingId,
        includeSalary: canManageCompensation,
        salaryForm,
        profileImageStoredObjectId: undefined,
      });
      const parsed = updateEmployeeRequestSchema.safeParse(payload);
      if (!parsed.success) {
        setFormErrors(zodErrorToFieldMap(parsed.error));
        focusFirstInvalidField();
        return;
      }
      try {
        await run(async () => {
          const profileImageStoredObjectId = await resolveProfileImageStoredObjectId();
          const withImage = employeeFormToPayload(form, {
            editingId,
            includeSalary: canManageCompensation,
            salaryForm,
            profileImageStoredObjectId,
          });
          const body = updateEmployeeRequestSchema.parse(withImage);
          await updateEmployee(editingId, body);
        });
        toast.success('Employee updated.');
        revokeDeferredImagePreview(form.profileImage.localPreviewUrl);
        closeDialog(false);
        await onSaved();
      } catch (failure) {
        if (!applyEmployeeFieldErrors(failure, setFormErrors)) {
          toast.error(describeEmployeeError(failure));
        }
      }
      return;
    }

    if (!showEmploymentInformation) {
      setShowEmploymentInformation(true);
    }

    const createPayload = employeeFormToPayload(form, {
      editingId,
      includeSalary: canManageCompensation && showCompensation,
      salaryForm,
      profileImageStoredObjectId: undefined,
    });
    const parsed = createEmployeeRequestSchema.safeParse(createPayload);
    if (!parsed.success) {
      const errors = zodErrorToFieldMap(parsed.error);
      setFormErrors(errors);
      revealCreateSectionsForErrors(errors, {
        setShowEmploymentInformation,
        setShowMoreDetails,
        setShowCompensation,
        setShowProfilePhoto,
      });
      focusFirstInvalidField();
      return;
    }
    try {
      await run(async () => {
        const profileImageStoredObjectId = await resolveProfileImageStoredObjectId();
        const withImage = employeeFormToPayload(form, {
          editingId,
          includeSalary: canManageCompensation && showCompensation,
          salaryForm,
          profileImageStoredObjectId,
        });
        const body = createEmployeeRequestSchema.parse(withImage);
        await createEmployee(body);
      });
      toast.success('Employee created.');
      revokeDeferredImagePreview(form.profileImage.localPreviewUrl);
      closeDialog(false);
      await onSaved();
    } catch (failure) {
      if (!applyEmployeeFieldErrors(failure, setFormErrors)) {
        toast.error(describeEmployeeError(failure));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className={DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Add employee' : 'Edit employee'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loadingEmployee ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading employee…
            </div>
          ) : (
            <div className="grid gap-4 pb-2">
              <div className={formGridClass}>
                <CrmFormField id="emp-first-name" label="First name" required error={fieldError('firstName')}>
                  <Input
                    id="emp-first-name"
                    disabled={pending}
                    value={form.firstName}
                    className={liveControlClass('firstName')}
                    onChange={(e) => {
                      clearFormFieldError(setFormErrors, 'firstName');
                      setForm((f) => ({ ...f, firstName: e.target.value }));
                    }}
                  />
                </CrmFormField>
                <CrmFormField id="emp-last-name" label="Last name" required error={fieldError('lastName')}>
                  <Input
                    id="emp-last-name"
                    disabled={pending}
                    value={form.lastName}
                    className={liveControlClass('lastName')}
                    onChange={(e) => {
                      clearFormFieldError(setFormErrors, 'lastName');
                      setForm((f) => ({ ...f, lastName: e.target.value }));
                    }}
                  />
                </CrmFormField>
                <CrmFormField id="emp-email" label="Work email" required error={fieldError('workEmail')}>
                  <Input
                    id="emp-email"
                    type="email"
                    disabled={pending}
                    value={form.workEmail}
                    className={liveControlClass('workEmail')}
                    onChange={(e) => {
                      clearFormFieldError(setFormErrors, 'workEmail');
                      setForm((f) => ({ ...f, workEmail: e.target.value }));
                    }}
                  />
                </CrmFormField>
                <CrmFormField id="emp-phone" label="Phone" required error={fieldError('phone')}>
                  <Input
                    id="emp-phone"
                    disabled={pending}
                    value={form.phone}
                    className={liveControlClass('phone')}
                    onChange={(e) => {
                      clearFormFieldError(setFormErrors, 'phone');
                      setForm((f) => ({ ...f, phone: e.target.value }));
                    }}
                  />
                </CrmFormField>
              </div>

              {isCreate && !showProfilePhoto ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className={FORM_SECONDARY_BTN}
                    disabled={pending}
                    onClick={() => setShowProfilePhoto(true)}
                  >
                    Add profile photo
                  </Button>
                </div>
              ) : null}

              {(!isCreate || showProfilePhoto) ? (
                <EmployeeProfileImageField
                  displayName={`${form.firstName} ${form.lastName}`.trim() || 'Employee'}
                  disabled={pending}
                  value={form.profileImage}
                  onChange={(profileImage) => setForm((f) => ({ ...f, profileImage }))}
                />
              ) : null}

              {isCreate && !showEmploymentInformation ? (
                <div className="grid gap-2">
                  <CrmFieldLabel required>Employment</CrmFieldLabel>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className={FORM_SECONDARY_BTN}
                      disabled={pending}
                      onClick={() => setShowEmploymentInformation(true)}
                    >
                      Add employment information
                    </Button>
                  </div>
                </div>
              ) : null}

              {(!isCreate || showEmploymentInformation) ? (
                <div className={formGridClass}>
                  <CrmFormField id="emp-code" label="Employee code">
                    <Input
                      id="emp-code"
                      value={form.employeeCode}
                      readOnly
                      disabled
                      className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'font-mono opacity-80')}
                    />
                    {isCreate && codePreviewHint ? (
                      <p className="text-muted-foreground mt-1 text-xs">{codePreviewHint}</p>
                    ) : null}
                  </CrmFormField>
                  <CrmFormField id="emp-job" label="Job title" required error={fieldError('jobTitle')}>
                    <Input
                      id="emp-job"
                      disabled={pending}
                      value={form.jobTitle}
                      className={liveControlClass('jobTitle')}
                      onChange={(e) => {
                        clearFormFieldError(setFormErrors, 'jobTitle');
                        setForm((f) => ({ ...f, jobTitle: e.target.value }));
                      }}
                    />
                  </CrmFormField>
                  <CrmFormField id="emp-type" label="Employment type" required>
                    <Select
                      value={form.employmentType}
                      disabled={pending}
                      onValueChange={(value) =>
                        setForm((f) => ({ ...f, employmentType: value as EmployeeEmploymentType }))
                      }
                    >
                      <SelectTrigger id="emp-type" className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EMPLOYEE_EMPLOYMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {labelEmploymentType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CrmFormField>
                  <CrmFormField id="emp-joined" label="Date of joining" required error={fieldError('dateOfJoining')}>
                    <Input
                      id="emp-joined"
                      type="date"
                      disabled={pending}
                      value={form.dateOfJoining}
                      className={liveControlClass('dateOfJoining')}
                      onChange={(e) => {
                        clearFormFieldError(setFormErrors, 'dateOfJoining');
                        setForm((f) => ({ ...f, dateOfJoining: e.target.value }));
                      }}
                    />
                  </CrmFormField>
                </div>
              ) : null}

              {isCreate && showEmploymentInformation && !showMoreDetails ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className={FORM_SECONDARY_BTN}
                    disabled={pending}
                    onClick={() => setShowMoreDetails(true)}
                  >
                    Add more details
                  </Button>
                </div>
              ) : null}

              {(!isCreate || showMoreDetails) && (!isCreate || showEmploymentInformation) ? (
                <div className={formGridClass}>
                  <CrmFormField id="emp-alt-phone" label="Alternate phone" optional error={fieldError('alternatePhone')}>
                    <Input
                      id="emp-alt-phone"
                      disabled={pending}
                      value={form.alternatePhone}
                      className={simpleInputClass(Boolean(fieldError('alternatePhone')))}
                      onChange={(e) => {
                        clearFormFieldError(setFormErrors, 'alternatePhone');
                        setForm((f) => ({ ...f, alternatePhone: e.target.value }));
                      }}
                    />
                  </CrmFormField>
                  <CrmFormField id="emp-location" label="Work location" optional>
                    <Input
                      id="emp-location"
                      disabled={pending}
                      value={form.workLocation}
                      className={CRM_PIPELINE_FORM_FIELD_CLASS}
                      onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
                    />
                  </CrmFormField>
                  <CrmFormField id="emp-probation" label="Probation end date" optional error={fieldError('probationEndDate')}>
                    <Input
                      id="emp-probation"
                      type="date"
                      disabled={pending}
                      value={form.probationEndDate}
                      className={simpleInputClass(Boolean(fieldError('probationEndDate')))}
                      onChange={(e) => setForm((f) => ({ ...f, probationEndDate: e.target.value }))}
                    />
                  </CrmFormField>
                  <CrmFormField id="emp-end" label="Employment end date" optional error={fieldError('employmentEndDate')}>
                    <Input
                      id="emp-end"
                      type="date"
                      disabled={pending}
                      value={form.employmentEndDate}
                      className={simpleInputClass(Boolean(fieldError('employmentEndDate')))}
                      onChange={(e) => setForm((f) => ({ ...f, employmentEndDate: e.target.value }))}
                    />
                  </CrmFormField>
                  <div className={formGridFullWidthClass}>
                    <CrmFormField id="emp-notes" label="Notes" optional>
                      <Textarea
                        id="emp-notes"
                        rows={3}
                        disabled={pending}
                        value={form.notes}
                        className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      />
                    </CrmFormField>
                  </div>
                </div>
              ) : null}

              {canManageCompensation && isCreate && !showCompensation ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className={FORM_SECONDARY_BTN}
                    disabled={pending}
                    onClick={() => setShowCompensation(true)}
                  >
                    Add compensation
                  </Button>
                </div>
              ) : null}

              {canManageCompensation && (!isCreate || showCompensation) ? (
                <EmployeeSalarySection
                  value={salaryForm}
                  onChange={setSalaryForm}
                  errors={formErrors}
                  disabled={pending}
                />
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => closeDialog(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', FORM_PRIMARY_BTN)}
            disabled={pending || loadingEmployee}
            onClick={() => void onSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create employee'
            ) : (
              'Save employee'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
