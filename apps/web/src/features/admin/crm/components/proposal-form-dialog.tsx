'use client';

import { DELIVERY_SERVICES_OPTIONS } from '@techwin/catalog';
import {
  computeProposalLinePricing,
  computeProposalSummaryTotals,
  createProposalRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import {
  clearFormFieldError,
  mergeFieldErrors,
  zodErrorToFieldMap,
} from '@/shared/form/zod-field-error';
import { formGridClass, formGridFullWidthClass } from '@/shared/form/form-layout';
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { listClients } from '../api/clients';
import { createProposal, getProposal, previewProposalCode, updateProposal } from '../api/proposals';
import { listServicePackages } from '../api/service-packages';
import { CRM_PROPOSAL_FORM_DIALOG_CLASS } from '../constants';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type { CrmClient, CrmServicePackage } from '../types';
import { describeCrmError } from '../utils/errors';
import { formatMoney } from '../utils/format';
import {
  MANUAL_LINE_SELECTOR,
  UNSELECTED_LINE_SELECTOR,
  applyServicePackageToLine,
  emptyCustomLineItem,
  emptyLineItem,
  emptyProposalForm,
  proposalToForm,
  type ProposalLineItemForm,
} from '../utils/proposal-form';
import { useAsyncAction } from '../hooks/use-async-action';
import { CrmFormField, CrmInlineFieldError } from './crm-feedback';

const proposalShape = createProposalRequestSchema.shape;

/** Client name, company, phone, email — one row on large screens. */
const clientFieldsRowClass =
  'grid grid-cols-1 items-start gap-x-[18px] gap-y-5 sm:grid-cols-2 lg:grid-cols-4';

export function ProposalFormDialog({
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
  const [form, setForm] = useState(() => emptyProposalForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<readonly CrmClient[]>([]);
  const [packages, setPackages] = useState<readonly CrmServicePackage[]>([]);
  const [codePreviewHint, setCodePreviewHint] = useState('');
  const [lineServiceFilter, setLineServiceFilter] = useState('');
  const [loadingProposal, setLoadingProposal] = useState(false);

  const activePackages = useMemo(
    () => packages.filter((pkg) => pkg.status === 'ACTIVE'),
    [packages],
  );

  const liveFields = useZodFormFields(
    {
      clientName: proposalShape.clientName,
      clientPhone: proposalShape.clientPhone,
      clientEmail: proposalShape.clientEmail,
      title: proposalShape.title,
    },
    {
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      title: form.title,
    },
    { disabled: loadingProposal },
  );

  const fieldError = (key: string) => mergeFieldErrors(liveFields.errors, fieldErrors, key);

  const resetForm = useCallback(() => {
    setForm(emptyProposalForm());
    setFieldErrors({});
    liveFields.reset();
    setLineServiceFilter('');
  }, [liveFields]);

  useEffect(() => {
    if (!open) return;
    void listClients()
      .then((result) => setClients(result.clients))
      .catch(() => setClients([]));
    void listServicePackages()
      .then((result) => setPackages(result.packages))
      .catch(() => setPackages([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      resetForm();
      return;
    }
    setLoadingProposal(true);
    void getProposal(editingId)
      .then((proposal) => {
        setForm(proposalToForm(proposal));
        setFieldErrors({});
        liveFields.reset();
      })
      .catch((failure) => toast.error(describeCrmError(failure)))
      .finally(() => setLoadingProposal(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open + id
  }, [open, editingId, toast]);

  useEffect(() => {
    if (!open || editingId) return;
    const controller = new AbortController();
    setForm((current) => ({ ...current, documentNumber: '' }));
    setCodePreviewHint('Loading next quotation number…');
    void previewProposalCode('QUOTATION', controller.signal)
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

  const pricingPreview = useMemo(
    () =>
      computeProposalSummaryTotals(
        form.lineItems
          .filter((item) => item.name.trim())
          .map((item) => ({
            quantity: item.quantity || '1',
            unitPrice: item.unitPrice || '0',
            discount: item.discount || '0',
            taxRate: item.taxRatePercent.trim() ? item.taxRatePercent : '0',
          })),
      ),
    [form.lineItems],
  );

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

  const updateLine = (key: string, patch: Partial<ProposalLineItemForm>) => {
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
      billingAddress: undefined,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      notes: form.notes.trim() || undefined,
      issueDate: form.issueDate,
      currency: 'INR' as const,
      lineItems,
    };
  };

  const submit = async () => {
    liveFields.prepareSubmit();
    const payload = buildPayload();
    const parsed = createProposalRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    setFieldErrors({});
    try {
      if (editingId) {
        const { type: _type, ...updateBody } = parsed.data;
        await run(() => updateProposal(editingId, updateBody));
        toast.success('Quotation updated.');
      } else {
        const created = await run(() => createProposal(parsed.data));
        if (!created) throw new Error('Create failed.');
        toast.success(`Quotation saved as ${created.documentNumber}.`);
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const dialogTitle = editingId ? 'Edit quotation' : 'Create quotation';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className={CRM_PROPOSAL_FORM_DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 shrink-0" aria-hidden="true" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            Line totals and the summary preview use tax-exclusive pricing in INR; the server calculates
            final amounts when you save.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          {loadingProposal ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading quotation…
            </div>
          ) : (
            <div className="grid gap-5">
              <section className="grid min-w-0 gap-2">
                <h3 className="text-sm font-semibold">Quotation information</h3>
                <div className={formGridClass}>
                  <CrmFormField id="prop-issue" label="Quotation date" required>
                    <Input
                      id="prop-issue"
                      type="date"
                      value={form.issueDate}
                      onChange={(event) => setForm((f) => ({ ...f, issueDate: event.target.value }))}
                    />
                  </CrmFormField>
                  <CrmFormField id="prop-number" label="Quotation number">
                    <Input
                      id="prop-number"
                      readOnly
                      value={form.documentNumber}
                      placeholder={CRM_FORM_PLACEHOLDERS.packageCodeLoading}
                      className="bg-muted/40 font-mono text-sm"
                    />
                  </CrmFormField>
                </div>
                {!editingId && codePreviewHint ? (
                  <p className="text-muted-foreground text-xs">{codePreviewHint}</p>
                ) : null}
              </section>

              <section className="grid min-w-0 gap-2">
                <h3 className="text-sm font-semibold">Client information</h3>
                <CrmFormField id="prop-client-select" label="Existing client" optional>
                  <Select value={form.clientId || 'NONE'} onValueChange={(value) => applyClient(value)}>
                    <SelectTrigger id="prop-client-select">
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
                </CrmFormField>
                <div className={clientFieldsRowClass}>
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
                      className={formControlStateClass(liveFields.controlState('clientName'))}
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
                      className={formControlStateClass(liveFields.controlState('clientPhone'))}
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
                      className={formControlStateClass(liveFields.controlState('clientEmail'))}
                      value={form.clientEmail}
                      {...liveFields.controlProps('clientEmail', 'prop-email')}
                      onChange={(event) => {
                        setForm((f) => ({ ...f, clientEmail: event.target.value }));
                        clearFormFieldError(setFieldErrors, 'clientEmail');
                      }}
                    />
                  </CrmFormField>
                </div>
              </section>

              <section className="grid gap-3">
                <h3 className="text-sm font-semibold">Subject and description</h3>
                <div className={formGridClass}>
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
                      className={formControlStateClass(liveFields.controlState('title'))}
                      value={form.title}
                      {...liveFields.controlProps('title', 'prop-title')}
                      onChange={(event) => {
                        setForm((f) => ({ ...f, title: event.target.value }));
                        clearFormFieldError(setFieldErrors, 'title');
                      }}
                    />
                  </CrmFormField>
                  <CrmFormField id="prop-desc" label="Description" optional className={formGridFullWidthClass}>
                    <Textarea
                      id="prop-desc"
                      rows={3}
                      placeholder={CRM_FORM_PLACEHOLDERS.proposalDescription}
                      value={form.description}
                      onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                    />
                  </CrmFormField>
                </div>
              </section>

              <section className="grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-sm font-semibold">Line items</h3>
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
                  <CrmInlineFieldError message={fieldErrors.lineItems} />
                ) : null}
                {form.lineItems.length === 0 ? (
                  <p className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
                    Add a service or package to build this quotation.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-8">#</TableHead>
                          <TableHead className="min-w-[11rem]">Service / package</TableHead>
                          <TableHead className="min-w-[5rem]">Category</TableHead>
                          <TableHead className="w-16 text-right">Qty</TableHead>
                          <TableHead className="w-24 text-right">Unit price (INR)</TableHead>
                          <TableHead className="w-16 text-right">GST %</TableHead>
                          <TableHead className="w-20 text-right">Discount</TableHead>
                          <TableHead className="w-24 text-right">Line total</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.lineItems.map((item, index) => {
                          const rowPricing = computeProposalLinePricing({
                            quantity: item.quantity || '1',
                            unitPrice: item.unitPrice || '0',
                            discount: item.discount || '0',
                            taxRate: item.taxRatePercent.trim() ? item.taxRatePercent : '0',
                          });
                          return (
                            <TableRow key={item.key}>
                              <TableCell className="text-muted-foreground align-middle tabular-nums">
                                {index + 1}
                              </TableCell>
                              <TableCell className="align-middle">
                                {item.selectorKey === MANUAL_LINE_SELECTOR ? (
                                  <div className="grid min-w-[11rem] gap-1.5">
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
                                    <SelectTrigger className="h-9 text-xs">
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
                              <TableCell className="align-middle">
                                <Input
                                  className="h-9 text-xs"
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
                              <TableCell className="align-middle">
                                <Input
                                  className="h-9 text-right text-xs tabular-nums"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateLine(item.key, { quantity: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <Input
                                  className="h-9 text-right text-xs tabular-nums"
                                  value={item.unitPrice}
                                  onChange={(event) =>
                                    updateLine(item.key, { unitPrice: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <Input
                                  className="h-9 text-right text-xs tabular-nums"
                                  placeholder={CRM_FORM_PLACEHOLDERS.gstRate}
                                  value={item.taxRatePercent}
                                  onChange={(event) =>
                                    updateLine(item.key, { taxRatePercent: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className="align-middle">
                                <Input
                                  className="h-9 text-right text-xs tabular-nums"
                                  value={item.discount}
                                  onChange={(event) =>
                                    updateLine(item.key, { discount: event.target.value })
                                  }
                                />
                              </TableCell>
                              <TableCell className="text-right align-middle text-xs font-medium tabular-nums">
                                {formatMoney(rowPricing.lineTotal, 'INR')}
                              </TableCell>
                              <TableCell className="align-middle">
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

                <dl className="ml-auto grid w-full max-w-md gap-1.5 border-t pt-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular-nums">{formatMoney(pricingPreview.subtotal, 'INR')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums">{formatMoney(pricingPreview.discountTotal, 'INR')}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">GST total</dt>
                    <dd className="tabular-nums">{formatMoney(pricingPreview.taxTotal, 'INR')}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t pt-1.5 font-semibold">
                    <dt>Grand total</dt>
                    <dd className="tabular-nums">{formatMoney(pricingPreview.grandTotal, 'INR')}</dd>
                  </div>
                </dl>
              </section>

              <section className="grid gap-2">
                <CrmFormField id="prop-notes" label="Notes" optional className={formGridFullWidthClass}>
                  <Textarea
                    id="prop-notes"
                    rows={3}
                    placeholder={CRM_FORM_PLACEHOLDERS.proposalNotes}
                    value={form.notes}
                    onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
                  />
                </CrmFormField>
              </section>
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || loadingProposal} onClick={() => void submit()}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {editingId ? 'Save quotation' : 'Save quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
