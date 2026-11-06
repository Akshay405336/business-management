'use client';

import {
  clientNameFieldSchema,
  createClientRequestSchema,
  leadEmailSchema,
  leadPhoneSchema,
  updateClientRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import {
  formFieldClass,
  formFieldControlShellClass,
  formGridClass,
  formGridFullWidthClass,
} from '@/shared/form/form-layout';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import {
  clearFormFieldError,
  mergeFieldErrors,
  zodErrorToFieldMap,
} from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { API_ERROR_CODES } from '@techwin/contracts';
import { ApiError } from '@/shared/api/api-error';
import {
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import { CRM_FORM_PLACEHOLDERS } from '@/features/admin/crm/constants/form-placeholders';
import { CLIENT_TYPES } from '@/features/admin/crm/constants';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { labelClientType } from '@/features/admin/crm/utils/labels';
import {
  QUOTATION_FORM_DIALOG_CLASS,
  QUOTATION_FORM_DIALOG_STYLE,
  QUOTATION_FORM_FOOTER_CLASS,
  QUOTATION_FORM_HEADER_CLASS,
  QUOTATION_FORM_PRIMARY_BTN,
  QUOTATION_FORM_SCROLL_CLASS,
  QUOTATION_FORM_SECONDARY_BTN,
} from '@/features/crm/quotations/components/quotation-dialog-shell';
import {
  useClient,
  useClientReferencePreview,
  useCreateClient,
  useUpdateClient,
} from '../hooks';
import type { ClientType } from '../types/client.types';
import {
  buildCreateClientPayload,
  buildUpdateClientPayload,
  clientToForm,
  emptyClientForm,
  type ClientFormState,
} from '../utils/client.utils';

const CLIENT_SELECT_TRIGGER_CLASS = cn(
  CRM_PIPELINE_FORM_FIELD_CLASS,
  'w-full border-0 shadow-none data-[placeholder]:text-muted-foreground/55',
);

const fieldLabel = (
  label: string,
  opts: { required?: boolean; optional?: boolean; htmlFor?: string },
) => (
  <CrmFieldLabel htmlFor={opts.htmlFor} required={opts.required} optional={opts.optional}>
    {label}
  </CrmFieldLabel>
);

const sectionDividerClass = cn(formGridFullWidthClass, 'border-border/60 border-t pt-4');

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className={cn(formGridFullWidthClass, 'text-foreground text-sm font-semibold tracking-tight')}>
      {children}
    </h3>
  );
}

export function ClientFormModal({
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
  const isEdit = Boolean(editingId);
  const { createClient, pending: createPending } = useCreateClient();
  const { updateClient, pending: updatePending } = useUpdateClient();
  const { client, loading: loadingClient } = useClient(editingId, open && isEdit);
  const { preview, loading: previewLoading } = useClientReferencePreview(open && !isEdit);

  const [form, setForm] = useState<ClientFormState>(() => emptyClientForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const liveFields = useZodFormFields(
    {
      name: clientNameFieldSchema,
      email: leadEmailSchema,
      phone: leadPhoneSchema,
    },
    {
      name: form.name,
      email: form.email.trim() === '' ? null : form.email,
      phone: form.phone,
    },
    { disabled: !open },
  );

  const fieldError = (key: string) => mergeFieldErrors(liveFields.errors, formErrors, key);

  const pending = createPending || updatePending || (isEdit && loadingClient);

  const nameLabel = form.type === 'COMPANY' ? 'Company name' : 'Client name';

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      setForm(emptyClientForm());
      setFormErrors({});
      liveFields.reset();
      return;
    }
    if (!client) return;
    setForm(clientToForm(client));
    setFormErrors({});
    liveFields.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when loaded client changes
  }, [open, editingId, client?.id, client?.updatedAt]);

  useEffect(() => {
    if (!open || isEdit || !preview?.referenceNumber) return;
    setForm((current) => ({ ...current, referencePreview: preview.referenceNumber }));
  }, [open, isEdit, preview?.referenceNumber]);

  const referenceHint = useMemo(() => {
    if (isEdit) return 'Assigned client code.';
    if (previewLoading) return 'Loading next client number…';
    if (preview?.referenceNumber) {
      return 'Preview only — the server assigns the final number when you save.';
    }
    return 'Could not load number preview.';
  }, [isEdit, preview?.referenceNumber, previewLoading]);

  const submit = async () => {
    liveFields.prepareSubmit();
    setFormErrors({});
    if (isEdit && editingId) {
      const body = buildUpdateClientPayload(form);
      const parsed = updateClientRequestSchema.safeParse(body);
      if (!parsed.success) {
        setFormErrors(zodErrorToFieldMap(parsed.error));
        focusFirstInvalidField();
        return;
      }
      try {
        await updateClient(editingId, parsed.data);
        toast.success('Client updated.');
        onOpenChange(false);
        await onSaved();
      } catch (failure) {
        if (
          failure instanceof ApiError &&
          failure.code === API_ERROR_CODES.DUPLICATE_CLIENT_PHONE
        ) {
          toast.error('A client with this phone number already exists in your organization.');
        } else {
          toast.error(describeCrmError(failure));
        }
      }
      return;
    }

    const body = buildCreateClientPayload(form);
    const parsed = createClientRequestSchema.safeParse(body);
    if (!parsed.success) {
      setFormErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      const created = await createClient(parsed.data);
      toast.success(
        created ? `Client saved as ${created.referenceNumber}.` : 'Client saved successfully.',
      );
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        failure.code === API_ERROR_CODES.DUPLICATE_CLIENT_PHONE
      ) {
        toast.error('A client with this phone number already exists in your organization.');
      } else {
        toast.error(describeCrmError(failure));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={QUOTATION_FORM_DIALOG_CLASS}
        style={QUOTATION_FORM_DIALOG_STYLE}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className={QUOTATION_FORM_HEADER_CLASS}>
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isEdit ? 'Edit client' : 'Create client'}
          </DialogTitle>
        </DialogHeader>

        <div className={QUOTATION_FORM_SCROLL_CLASS}>
          {isEdit && loadingClient && !client ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading client…
            </div>
          ) : (
            <div className={cn('grid gap-4', formGridClass)}>
              <SectionHeading>Client information</SectionHeading>

              <CrmFormField id="client-type" label="Client type" required>
                <Select
                  value={form.type}
                  onValueChange={(value) => {
                    setForm((current) => ({ ...current, type: value as ClientType }));
                    clearFormFieldError(setFormErrors, 'type');
                  }}
                >
                  <SelectTrigger id="client-type" className={CLIENT_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelClientType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>

              <div className={formFieldClass}>
                {fieldLabel('Client code', { htmlFor: 'client-code' })}
                <div className={formFieldControlShellClass}>
                  <Input
                    id="client-code"
                    readOnly
                    value={isEdit ? form.referencePreview : form.referencePreview || '—'}
                    placeholder={
                      !isEdit && previewLoading
                        ? CRM_FORM_PLACEHOLDERS.packageCodeLoading
                        : CRM_FORM_PLACEHOLDERS.packageCodeReadonly
                    }
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/50 font-mono text-sm')}
                    aria-describedby="client-code-hint"
                  />
                </div>
                <p id="client-code-hint" className="text-muted-foreground text-xs">
                  {referenceHint}
                </p>
              </div>

              <CrmFormField
                id="client-name"
                label={nameLabel}
                required
                validated
                error={fieldError('name')}
              >
                <Input
                  id="client-name"
                  placeholder={CRM_FORM_PLACEHOLDERS.clientName}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('name')),
                  )}
                  value={form.name}
                  {...liveFields.controlProps('name', 'client-name')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    clearFormFieldError(setFormErrors, 'name');
                  }}
                />
              </CrmFormField>

              <CrmFormField id="client-contact" label="Contact person" optional>
                <Input
                  id="client-contact"
                  placeholder={CRM_FORM_PLACEHOLDERS.primaryContact}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.primaryContact}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, primaryContact: event.target.value }))
                  }
                />
              </CrmFormField>

              <CrmFormField
                id="client-email"
                label="Email"
                optional
                validated
                error={fieldError('email')}
              >
                <Input
                  id="client-email"
                  type="email"
                  placeholder={CRM_FORM_PLACEHOLDERS.email}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('email')),
                  )}
                  value={form.email}
                  {...liveFields.controlProps('email', 'client-email')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    clearFormFieldError(setFormErrors, 'email');
                  }}
                />
              </CrmFormField>

              <CrmFormField
                id="client-phone"
                label="Phone"
                required
                validated
                error={fieldError('phone')}
              >
                <Input
                  id="client-phone"
                  placeholder="Enter phone number"
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('phone')),
                  )}
                  value={form.phone}
                  {...liveFields.controlProps('phone', 'client-phone')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, phone: event.target.value }));
                    clearFormFieldError(setFormErrors, 'phone');
                  }}
                />
              </CrmFormField>

              <CrmFormField id="client-website" label="Website" optional>
                <Input
                  id="client-website"
                  placeholder={CRM_FORM_PLACEHOLDERS.website}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.website}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, website: event.target.value }))
                  }
                />
              </CrmFormField>

              <div className={sectionDividerClass} aria-hidden />

              <SectionHeading>Address information</SectionHeading>

              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Billing address', { optional: true, htmlFor: 'client-billing-address' })}
                <Textarea
                  id="client-billing-address"
                  rows={3}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                  placeholder={CRM_FORM_PLACEHOLDERS.billingAddress}
                  value={form.billingAddress}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, billingAddress: event.target.value }))
                  }
                />
              </div>

              <div className={sectionDividerClass} aria-hidden />

              <SectionHeading>Business information</SectionHeading>

              <CrmFormField
                id="client-tax"
                label="Tax registration (GSTIN / tax ID)"
                optional
                className={formGridFullWidthClass}
              >
                <Input
                  id="client-tax"
                  placeholder={CRM_FORM_PLACEHOLDERS.taxRegistration}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.taxRegistration}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, taxRegistration: event.target.value }))
                  }
                />
              </CrmFormField>

              <div className={sectionDividerClass} aria-hidden />

              <SectionHeading>Additional information</SectionHeading>

              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Notes', { optional: true, htmlFor: 'client-notes' })}
                <Textarea
                  id="client-notes"
                  rows={4}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[5rem] resize-y')}
                  placeholder={CRM_FORM_PLACEHOLDERS.notes}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={QUOTATION_FORM_FOOTER_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={QUOTATION_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={QUOTATION_FORM_PRIMARY_BTN}
            disabled={pending}
            onClick={() => void submit()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isEdit ? 'Save changes' : 'Create client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
