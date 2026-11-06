'use client';

import { DELIVERY_SERVICES_OPTIONS } from '@techwin/catalog';
import {
  computeQuotationLinePricing,
  createQuotationRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import {
  clearFormFieldError,
  mergeFieldErrors,
  zodErrorToFieldMap,
} from '@/shared/form/zod-field-error';
import {
  formFieldClass,
  formFieldControlShellClass,
  formGridClass,
  formGridFullWidthClass,
} from '@/shared/form/form-layout';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { listClients } from '@/features/admin/crm/api/clients';
import { CRM_FORM_PLACEHOLDERS } from '@/features/admin/crm/constants/form-placeholders';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import {
  CrmFieldLabel,
  CrmFormField,
  CrmInlineFieldError,
} from '@/features/admin/crm/components/crm-feedback';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatMoney } from '@/features/admin/crm/utils/format';
import { listServicePackages } from '@/features/crm/service-packages/api/service-packages.api';
import type { CrmServicePackage } from '@/features/crm/service-packages/types/service-package.types';
import type { CrmClient } from '@/features/admin/crm/types';
import { createQuotation, previewQuotationCode, updateQuotation } from '../api/quotations.api';
import { useQuotation } from '../hooks';
import {
  QUOTATION_FORM_DIALOG_CLASS,
  QUOTATION_FORM_DIALOG_STYLE,
  QUOTATION_FORM_FOOTER_CLASS,
  QUOTATION_FORM_HEADER_CLASS,
  QUOTATION_FORM_PRIMARY_BTN,
  QUOTATION_FORM_SCROLL_CLASS,
  QUOTATION_FORM_SECONDARY_BTN,
} from './quotation-dialog-shell';
import { cn } from '@/shared/lib/utils';
import { QuotationPricingSummary } from './quotation-pricing-summary';
import {
  MANUAL_LINE_SELECTOR,
  UNSELECTED_LINE_SELECTOR,
  applyServicePackageToLine,
  emptyCustomLineItem,
  emptyLineItem,
  emptyQuotationForm,
  quotationToForm,
  type QuotationLineItemForm,
} from '../utils/quotation-form';

const quotationShape = createQuotationRequestSchema.shape;

const QUOTATION_SELECT_TRIGGER_CLASS = cn(
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

const quotationSectionDividerClass = cn(
  formGridFullWidthClass,
  'border-border/60 border-t pt-4',
);

/** Horizontal scroll lives on this wrapper only (modal body keeps overflow-y). */
const QUOTATION_LINE_ITEMS_SCROLL_WRAPPER_CLASS = cn(
  formGridFullWidthClass,
  'w-full min-w-0 overflow-x-auto overflow-y-visible scroll-smooth overscroll-x-contain rounded-md border',
  '[scrollbar-gutter:stable]',
);

const QUOTATION_LINE_ITEMS_TABLE_CLASS =
  'max-w-none w-max min-w-[62rem] table-fixed border-collapse';

/** Fixed widths — shared by colgroup, headers, and cells for alignment. */
const QUOTATION_LINE_ITEM_COL_WIDTHS = [
  '2.5rem',
  '14rem',
  '7.5rem',
  '5.25rem',
  '8.75rem',
  '5.25rem',
  '6.25rem',
  '8.5rem',
  '3rem',
] as const;

const QUOTATION_LINE_ITEM_COLUMN = {
  index: 'w-[2.5rem] min-w-[2.5rem] max-w-[2.5rem] px-2',
  service: 'w-[14rem] min-w-[14rem] px-2',
  category: 'w-[7.5rem] min-w-[7.5rem] px-2',
  qty: 'w-[5.25rem] min-w-[5.25rem] px-2 text-right',
  unitPrice: 'w-[8.75rem] min-w-[8.75rem] px-2 text-right',
  gst: 'w-[5.25rem] min-w-[5.25rem] px-2 text-right',
  discount: 'w-[6.25rem] min-w-[6.25rem] px-2 text-right',
  lineTotal: 'w-[8.5rem] min-w-[8.5rem] px-2 text-right',
  actions: 'w-[3rem] min-w-[3rem] px-1 text-right',
} as const;

const QUOTATION_LINE_NUMERIC_INPUT_CLASS =
  'h-9 w-full shrink-0 text-right text-xs tabular-nums whitespace-nowrap';

function QuotationLineItemsColGroup() {
  return (
    <colgroup>
      {QUOTATION_LINE_ITEM_COL_WIDTHS.map((width, index) => (
        <col key={width + String(index)} style={{ width }} />
      ))}
    </colgroup>
  );
}

export function QuotationFormModal({
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
  const { quotation: loadedQuotation, loading: loadQuotationPending } = useQuotation(
    editingId,
    open && Boolean(editingId),
  );
  const loadingQuotation = loadQuotationPending && !isCreate;
  const [form, setForm] = useState(() => emptyQuotationForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<readonly CrmClient[]>([]);
  const [packages, setPackages] = useState<readonly CrmServicePackage[]>([]);
  const [codePreviewHint, setCodePreviewHint] = useState('');
  const [lineServiceFilter, setLineServiceFilter] = useState('');

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.status === 'ACTIVE'),
    [packages],
  );

  const liveFields = useZodFormFields(
    {
      clientName: quotationShape.clientName,
      clientPhone: quotationShape.clientPhone,
      clientEmail: quotationShape.clientEmail,
      title: quotationShape.title,
    },
    {
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      title: form.title,
    },
    { disabled: loadingQuotation },
  );

  const fieldError = (key: string) => mergeFieldErrors(liveFields.errors, fieldErrors, key);

  useEffect(() => {
    if (!open) return;
    void listClients({ page: 1, pageSize: 500 })
      .then((result) => setClients(result.clients))
      .catch(() => setClients([]));
    void listServicePackages()
      .then((result) => setPackages(result.packages ?? []))
      .catch(() => setPackages([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      setForm(emptyQuotationForm());
      setFieldErrors({});
      liveFields.reset();
      setLineServiceFilter('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening create dialog
  }, [open, editingId]);

  useEffect(() => {
    if (!open || !editingId || !loadedQuotation) return;
    setForm(quotationToForm(loadedQuotation));
    setFieldErrors({});
    liveFields.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate form when quotation loads
  }, [open, editingId, loadedQuotation]);

  useEffect(() => {
    if (!open || editingId) return;
    const controller = new AbortController();
    setForm((current) => ({ ...current, documentNumber: '' }));
    setCodePreviewHint('Loading next quotation number…');
    void previewQuotationCode('QUOTATION', controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((current) => ({ ...current, documentNumber: result.documentNumber }));
        setCodePreviewHint('Preview only — the server assigns the final number when you save.');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCodePreviewHint('Could not load quotation number preview.');
      });
    return () => controller.abort();
  }, [open, editingId]);

  const filteredCatalog = useMemo(() => {
    const q = lineServiceFilter.trim().toLowerCase();
    if (!q) return DELIVERY_SERVICES_OPTIONS;
    return DELIVERY_SERVICES_OPTIONS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [lineServiceFilter]);

  const filteredPackages = useMemo(() => {
    const q = lineServiceFilter.trim().toLowerCase();
    if (!q) return activePackages;
    return activePackages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.code.toLowerCase().includes(q) ||
        pkg.categories.some((cat) => cat.label.toLowerCase().includes(q)),
    );
  }, [activePackages, lineServiceFilter]);

  const applyClient = (clientId: string) => {
    if (clientId === 'NONE') {
      setForm((f) => ({
        ...f,
        clientId: '',
        clientName: '',
        companyName: '',
        clientPhone: '',
        clientEmail: '',
      }));
      clearFormFieldError(setFieldErrors, 'clientName');
      clearFormFieldError(setFieldErrors, 'clientPhone');
      clearFormFieldError(setFieldErrors, 'clientEmail');
      liveFields.reset();
      return;
    }
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;
    setForm((f) => ({
      ...f,
      clientId,
      clientName: client.name,
      companyName: client.type === 'COMPANY' ? client.name : f.companyName,
      clientPhone: client.phone ?? '',
      clientEmail: client.email ?? '',
    }));
    clearFormFieldError(setFieldErrors, 'clientName');
    clearFormFieldError(setFieldErrors, 'clientPhone');
    clearFormFieldError(setFieldErrors, 'clientEmail');
  };

  const updateLine = (key: string, patch: Partial<QuotationLineItemForm>) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  };

  const onLineSelectorChange = (key: string, value: string) => {
    if (value.startsWith('pkg:')) {
      const pkgId = value.slice(4);
      const pkg = activePackages.find((item) => item.id === pkgId);
      if (!pkg) return;
      updateLine(key, applyServicePackageToLine(pkg));
      return;
    }
    if (value.startsWith('cat:')) {
      const catId = value.slice(4);
      const option = DELIVERY_SERVICES_OPTIONS.find((item) => item.id === catId);
      if (!option) return;
      updateLine(key, {
        selectorKey: value,
        sourcePackageId: '',
        name: option.label,
        category: option.category,
        description: '',
        quantity: '1',
        unit: 'service',
        unitPrice: '0',
        discount: '0',
        taxRatePercent: '',
      });
    }
  };

  const buildPayload = () => {
    const lineItems = form.lineItems
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        id: item.id,
        name: item.name.trim(),
        description: item.description.trim() || undefined,
        category: item.category.trim() || undefined,
        sourcePackageId: item.sourcePackageId.trim() || null,
        quantity: item.quantity.trim() || '1',
        unit: item.unit.trim() || undefined,
        unitPrice: item.unitPrice.trim() || '0',
        discount: item.discount.trim() ? item.discount : undefined,
        taxRate: item.taxRatePercent.trim() ? item.taxRatePercent : undefined,
        sortOrder: index,
      }));

    return {
      type: 'QUOTATION' as const,
      clientId: form.clientId.trim() || null,
      clientName: form.clientName.trim(),
      companyName: form.companyName.trim() || undefined,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      billingAddress: form.billingAddress.trim() || undefined,
      clientGstin: form.clientGstin.trim() || undefined,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      terms: form.terms.trim() || undefined,
      notes: form.notes.trim() || undefined,
      issueDate: form.issueDate,
      expiryDate: form.expiryDate.trim() || null,
      currency: 'INR' as const,
      lineItems,
    };
  };

  const submit = async () => {
    liveFields.prepareSubmit();
    const payload = buildPayload();
    const parsed = createQuotationRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      toast.error('Fix the highlighted fields before saving.');
      return;
    }
    setFieldErrors({});
    try {
      if (editingId) {
        const { type: _type, ...updateBody } = parsed.data;
        await run(() => updateQuotation(editingId, updateBody));
        toast.success('Quotation updated.');
      } else {
        const created = await run(() => createQuotation(parsed.data));
        if (!created) throw new Error('Create failed.');
        toast.success(`Quotation saved as ${created.documentNumber}.`);
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={QUOTATION_FORM_DIALOG_CLASS}
        style={QUOTATION_FORM_DIALOG_STYLE}
      >
        <DialogHeader className={QUOTATION_FORM_HEADER_CLASS}>
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Create quotation' : 'Edit quotation'}
          </DialogTitle>
        </DialogHeader>
        <div className={QUOTATION_FORM_SCROLL_CLASS}>
          {loadingQuotation ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading quotation…
            </div>
          ) : (
            <div className={cn('quotation-form-grid grid gap-4', formGridClass)}>
              <div className={formFieldClass}>
                {fieldLabel('Quotation number', { htmlFor: 'prop-number' })}
                <div className={formFieldControlShellClass}>
                  <Input
                    id="prop-number"
                    readOnly
                    value={form.documentNumber}
                    placeholder={
                      isCreate
                        ? CRM_FORM_PLACEHOLDERS.packageCodeLoading
                        : CRM_FORM_PLACEHOLDERS.packageCodeReadonly
                    }
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/50 font-mono text-sm')}
                  />
                </div>
                {isCreate && codePreviewHint ? (
                  <p className="text-muted-foreground text-xs">{codePreviewHint}</p>
                ) : null}
              </div>
              <CrmFormField id="prop-issue" label="Quotation date" required>
                <Input
                  id="prop-issue"
                  type="date"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.issueDate}
                  onChange={(event) => setForm((f) => ({ ...f, issueDate: event.target.value }))}
                />
              </CrmFormField>
              <CrmFormField id="prop-expiry" label="Valid until" optional>
                <Input
                  id="prop-expiry"
                  type="date"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.expiryDate}
                  onChange={(event) => setForm((f) => ({ ...f, expiryDate: event.target.value }))}
                />
              </CrmFormField>

              <div className={quotationSectionDividerClass} aria-hidden />

              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Existing client', { optional: true, htmlFor: 'prop-client-select' })}
                <div className={formFieldControlShellClass}>
                  <Select value={form.clientId || 'NONE'} onValueChange={(value) => applyClient(value)}>
                    <SelectTrigger id="prop-client-select" className={QUOTATION_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectClient} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Enter manually</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                          {client.referenceNumber ? ` (${client.referenceNumber})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CrmFormField
                id="prop-client-name"
                label="Client name"
                required
                validated
                error={fieldError('clientName')}
              >
                <Input
                  id="prop-client-name"
                  placeholder={CRM_FORM_PLACEHOLDERS.clientName}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('clientName')),
                  )}
                  value={form.clientName}
                  {...liveFields.controlProps('clientName', 'prop-client-name')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, clientName: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'clientName');
                  }}
                />
              </CrmFormField>
              <CrmFormField id="prop-company" label="Company" optional>
                <Input
                  id="prop-company"
                  placeholder={CRM_FORM_PLACEHOLDERS.company}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.companyName}
                  onChange={(event) => setForm((f) => ({ ...f, companyName: event.target.value }))}
                />
              </CrmFormField>
              <CrmFormField
                id="prop-phone"
                label="Phone"
                required
                validated
                error={fieldError('clientPhone')}
              >
                <Input
                  id="prop-phone"
                  placeholder={CRM_FORM_PLACEHOLDERS.phone}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('clientPhone')),
                  )}
                  value={form.clientPhone}
                  {...liveFields.controlProps('clientPhone', 'prop-phone')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, clientPhone: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'clientPhone');
                  }}
                />
              </CrmFormField>
              <CrmFormField
                id="prop-email"
                label="Email"
                required
                validated
                error={fieldError('clientEmail')}
              >
                <Input
                  id="prop-email"
                  type="email"
                  placeholder={CRM_FORM_PLACEHOLDERS.email}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('clientEmail')),
                  )}
                  value={form.clientEmail}
                  {...liveFields.controlProps('clientEmail', 'prop-email')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, clientEmail: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'clientEmail');
                  }}
                />
              </CrmFormField>

              <div className={quotationSectionDividerClass} aria-hidden />

              <CrmFormField
                id="prop-title"
                label="Subject"
                required
                validated
                error={fieldError('title')}
                className={formGridFullWidthClass}
              >
                <Input
                  id="prop-title"
                  placeholder={CRM_FORM_PLACEHOLDERS.proposalTitle}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(liveFields.controlState('title')),
                  )}
                  value={form.title}
                  {...liveFields.controlProps('title', 'prop-title')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, title: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'title');
                  }}
                />
              </CrmFormField>
              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Description', { optional: true, htmlFor: 'prop-desc' })}
                <Textarea
                  id="prop-desc"
                  rows={2}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                  placeholder={CRM_FORM_PLACEHOLDERS.proposalDescription}
                  value={form.description}
                  onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                />
              </div>

              <div className={quotationSectionDividerClass} aria-hidden />

              <div
                className={cn(
                  formGridFullWidthClass,
                  'flex min-w-0 flex-wrap items-end justify-between gap-2',
                )}
              >
                <p className="text-foreground text-sm font-semibold tracking-tight">Line items</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-9 w-44 text-sm"
                      placeholder="Filter services…"
                      value={lineServiceFilter}
                      onChange={(event) => setLineServiceFilter(event.target.value)}
                      aria-label="Filter line item services"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }))
                      }
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add line
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          lineItems: [...f.lineItems, emptyCustomLineItem()],
                        }))
                      }
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Add custom line
                    </Button>
                  </div>
              </div>
              {fieldErrors.lineItems ? (
                <div className={formGridFullWidthClass}>
                  <CrmInlineFieldError message={fieldErrors.lineItems} />
                </div>
              ) : null}
              {form.lineItems.length === 0 ? (
                <p
                  className={cn(
                    formGridFullWidthClass,
                    'text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm',
                  )}
                >
                  Add a service or package to build this quotation.
                </p>
              ) : (
                <div className={QUOTATION_LINE_ITEMS_SCROLL_WRAPPER_CLASS}>
                  <Table
                    containerClassName="relative w-max max-w-none overflow-visible"
                    className={QUOTATION_LINE_ITEMS_TABLE_CLASS}
                  >
                      <QuotationLineItemsColGroup />
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={QUOTATION_LINE_ITEM_COLUMN.index}>#</TableHead>
                          <TableHead className={QUOTATION_LINE_ITEM_COLUMN.service}>
                            Service / Package
                          </TableHead>
                          <TableHead className={QUOTATION_LINE_ITEM_COLUMN.category}>
                            Category
                          </TableHead>
                          <TableHead
                            className={cn(QUOTATION_LINE_ITEM_COLUMN.qty, 'whitespace-nowrap')}
                          >
                            Qty
                          </TableHead>
                          <TableHead
                            className={cn(
                              QUOTATION_LINE_ITEM_COLUMN.unitPrice,
                              'whitespace-nowrap',
                            )}
                          >
                            Unit Price (INR)
                          </TableHead>
                          <TableHead
                            className={cn(QUOTATION_LINE_ITEM_COLUMN.gst, 'whitespace-nowrap')}
                          >
                            GST %
                          </TableHead>
                          <TableHead className={QUOTATION_LINE_ITEM_COLUMN.discount}>
                            Discount
                          </TableHead>
                          <TableHead className={QUOTATION_LINE_ITEM_COLUMN.lineTotal}>
                            Line Total
                          </TableHead>
                          <TableHead className={QUOTATION_LINE_ITEM_COLUMN.actions}>
                            <span className="sr-only">Remove line item</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.lineItems.map((item, index) => {
                          const rowPricing = computeQuotationLinePricing({
                            quantity: item.quantity || '1',
                            unitPrice: item.unitPrice || '0',
                            discount: item.discount || '0',
                            taxRate: item.taxRatePercent.trim() ? item.taxRatePercent : '0',
                          });
                          return (
                            <TableRow key={item.key} className="align-middle">
                              <TableCell
                                className={cn(
                                  QUOTATION_LINE_ITEM_COLUMN.index,
                                  'text-muted-foreground align-middle tabular-nums',
                                )}
                              >
                                {index + 1}
                              </TableCell>
                              <TableCell className={cn(QUOTATION_LINE_ITEM_COLUMN.service, 'align-middle')}>
                                {item.selectorKey === MANUAL_LINE_SELECTOR ? (
                                  <div className="grid min-w-[14rem] gap-1.5">
                                    <span className="text-muted-foreground text-xs font-medium">
                                      Custom line item
                                    </span>
                                    <Input
                                      className="h-9 text-xs"
                                      placeholder={CRM_FORM_PLACEHOLDERS.lineItemName}
                                      value={item.name}
                                      onChange={(event) =>
                                        updateLine(item.key, { name: event.target.value })
                                      }
                                    />
                                  </div>
                                ) : (
                                  <Select
                                    value={
                                      item.selectorKey === UNSELECTED_LINE_SELECTOR
                                        ? undefined
                                        : item.selectorKey
                                    }
                                    onValueChange={(value) => onLineSelectorChange(item.key, value)}
                                  >
                                    <SelectTrigger className="h-9 w-full min-w-[14rem] text-xs">
                                      <SelectValue
                                        placeholder={CRM_FORM_PLACEHOLDERS.lineItemService}
                                      />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64">
                                      {filteredPackages.length > 0 ? (
                                        <SelectGroup>
                                          <SelectLabel>Service packages</SelectLabel>
                                          {filteredPackages.map((pkg) => (
                                            <SelectItem key={pkg.id} value={`pkg:${pkg.id}`}>
                                              {pkg.name} ({pkg.code})
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      ) : null}
                                      {filteredCatalog.length > 0 ? (
                                        <SelectGroup>
                                          <SelectLabel>Catalog services</SelectLabel>
                                          {filteredCatalog.map((option) => (
                                            <SelectItem key={option.id} value={`cat:${option.id}`}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      ) : null}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className={cn(QUOTATION_LINE_ITEM_COLUMN.category, 'align-middle')}>
                                <Input
                                  className="h-9 w-full text-xs"
                                  readOnly={
                                    Boolean(item.sourcePackageId) &&
                                    item.selectorKey !== MANUAL_LINE_SELECTOR
                                  }
                                  value={item.category}
                                  onChange={(event) =>
                                    updateLine(item.key, { category: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className={cn(QUOTATION_LINE_ITEM_COLUMN.qty, 'align-middle')}>
                                <Input
                                  className={QUOTATION_LINE_NUMERIC_INPUT_CLASS}
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateLine(item.key, { quantity: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell
                                className={cn(QUOTATION_LINE_ITEM_COLUMN.unitPrice, 'align-middle')}
                              >
                                <Input
                                  className={QUOTATION_LINE_NUMERIC_INPUT_CLASS}
                                  value={item.unitPrice}
                                  onChange={(event) =>
                                    updateLine(item.key, { unitPrice: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className={cn(QUOTATION_LINE_ITEM_COLUMN.gst, 'align-middle')}>
                                <Input
                                  className={QUOTATION_LINE_NUMERIC_INPUT_CLASS}
                                  placeholder={CRM_FORM_PLACEHOLDERS.gstRate}
                                  value={item.taxRatePercent}
                                  onChange={(event) =>
                                    updateLine(item.key, { taxRatePercent: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell
                                className={cn(QUOTATION_LINE_ITEM_COLUMN.discount, 'align-middle')}
                              >
                                <Input
                                  className={QUOTATION_LINE_NUMERIC_INPUT_CLASS}
                                  value={item.discount}
                                  onChange={(event) =>
                                    updateLine(item.key, { discount: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell
                                className={cn(
                                  QUOTATION_LINE_ITEM_COLUMN.lineTotal,
                                  'align-middle text-xs font-medium tabular-nums',
                                )}
                              >
                                {formatMoney(rowPricing.lineTotal, 'INR')}
                              </TableCell>
                              <TableCell
                                className={cn(QUOTATION_LINE_ITEM_COLUMN.actions, 'align-middle')}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Remove line item"
                                  disabled={form.lineItems.length <= 1}
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      lineItems: f.lineItems.filter((row) => row.key !== item.key),
                                    }))
                                  }
                                >
                                  <Trash2 className="size-4" aria-hidden="true" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                </div>
              )}

              <div className={formGridFullWidthClass}>
                <QuotationPricingSummary lineItems={form.lineItems} />
              </div>

              <div className={quotationSectionDividerClass} aria-hidden />

              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Billing address', { optional: true, htmlFor: 'prop-billing' })}
                <Textarea
                  id="prop-billing"
                  rows={2}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                  value={form.billingAddress}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, billingAddress: event.target.value }))
                  }
                />
              </div>
              <CrmFormField id="prop-gstin" label="Client GSTIN" optional>
                <Input
                  id="prop-gstin"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={form.clientGstin}
                  onChange={(event) => setForm((f) => ({ ...f, clientGstin: event.target.value }))}
                />
              </CrmFormField>
              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Notes', { optional: true, htmlFor: 'prop-notes' })}
                <Textarea
                  id="prop-notes"
                  rows={2}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                  placeholder={CRM_FORM_PLACEHOLDERS.proposalNotes}
                  value={form.notes}
                  onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
                />
              </div>
              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Terms and conditions', { optional: true, htmlFor: 'prop-terms' })}
                <Textarea
                  id="prop-terms"
                  rows={2}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                  placeholder={CRM_FORM_PLACEHOLDERS.proposalTerms}
                  value={form.terms}
                  onChange={(event) => setForm((f) => ({ ...f, terms: event.target.value }))}
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
            className={cn('h-11 px-5', QUOTATION_FORM_PRIMARY_BTN)}
            disabled={pending || loadingQuotation}
            onClick={() => void submit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create quotation'
            ) : (
              'Save quotation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
