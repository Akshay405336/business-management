'use client';

import {
  ADMIN_PANEL_GROUPS,
  DELIVERY_SERVICES_GROUPS,
  HOSTING_DEPLOYMENT_GROUPS,
  INCLUDED_PAGES_GROUPS,
  INTEGRATIONS_GROUPS,
  PACKAGE_CATEGORY_GROUPS,
  TECHNOLOGY_STACK_GROUPS,
} from '@techwin/catalog';
import {
  computeServicePackagePricing,
  createServicePackageRequestSchema,
  packageGstRateInputSchema,
  servicePackageRequestObjectSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import {
  clearFormFieldError,
  mergeFieldErrors,
  zodErrorToFieldMap,
} from '@/shared/form/zod-field-error';
import { formFieldClass, formFieldControlShellClass } from '@/shared/form/form-layout';
import { cn } from '@/shared/lib/utils';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  SERVICE_PACKAGE_DIALOG_FOOTER_CLASS,
  SERVICE_PACKAGE_DIALOG_HEADER_CLASS,
  SERVICE_PACKAGE_FORM_DIALOG_CLASS,
  SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS,
  SERVICE_PACKAGE_MODAL_DIALOG_STYLE,
} from './service-package-dialog-shell';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SEARCHABLE_MULTI_SELECT_PANEL_ATTR,
  SearchableMultiSelect,
} from '@/components/ui/searchable-multi-select';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { previewServicePackageCode } from '../api/service-packages.api';
import type { PackageDiscountType, ServicePackageDeliveryUnit } from '../types/service-package.types';
import {
  CrmFieldLabel,
  CrmFormField,
  CrmInlineFieldError,
  formGridClass,
  formGridFullWidthClass,
} from '@/features/admin/crm/components/crm-feedback';
import { CRM_FORM_PLACEHOLDERS } from '@/features/admin/crm/constants/form-placeholders';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatMoney } from '@/features/admin/crm/utils/format';
import {
  useCreateServicePackage,
  useServicePackage,
  useUpdateServicePackage,
} from '../hooks';
import {
  buildServicePackagePayload,
  DELIVERY_UNITS,
  emptyServicePackageForm,
  servicePackageToForm,
  type ServicePackageFormState,
} from '../utils/service-package.utils';
import { updateServicePackageRequestSchema } from '../schemas/service-package.schema';

const PACKAGE_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PACKAGE_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const PACKAGE_SELECT_TRIGGER_CLASS = cn(
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

export function ServicePackageFormModal({
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
  const { createServicePackage, pending: createPending } = useCreateServicePackage();
  const { updateServicePackage, pending: updatePending } = useUpdateServicePackage();
  const { package: loadedPackage, loading: loadPackagePending } = useServicePackage(
    editingId,
    open && Boolean(editingId),
  );
  const isCreate = editingId === null;
  const pending = createPending || updatePending;
  const loadingPackage = loadPackagePending && !isCreate;
  const [form, setForm] = useState<ServicePackageFormState>(() => emptyServicePackageForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pkgShape = servicePackageRequestObjectSchema.shape;
  const packageLiveFields = useZodFormFields(
    {
      name: pkgShape.name,
      categories: pkgShape.categories,
      basePrice: pkgShape.basePrice,
      gstRatePercent: packageGstRateInputSchema,
      discountValue: pkgShape.discountValue,
      deliveryDurationValue: pkgShape.deliveryDurationValue,
    },
    {
      name: form.name,
      categories: form.categories,
      basePrice: form.basePrice,
      gstRatePercent: form.gstRate.trim() === '' ? null : form.gstRate,
      discountValue: form.discountValue,
      deliveryDurationValue: Number(form.deliveryDurationValue) || 0,
    },
  );

  const packageFieldError = (key: string) => mergeFieldErrors(packageLiveFields.errors, fieldErrors, key);
  const [codePreview, setCodePreview] = useState('');
  const [codePreviewHint, setCodePreviewHint] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      setForm(emptyServicePackageForm());
      setFieldErrors({});
      packageLiveFields.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening create dialog
  }, [open, editingId]);

  useEffect(() => {
    if (!open || !editingId || !loadedPackage) return;
    setForm(servicePackageToForm(loadedPackage));
    setFieldErrors({});
  }, [open, editingId, loadedPackage]);

  useEffect(() => {
    if (!open || editingId) return;
    const controller = new AbortController();
    setCodePreview('');
    setCodePreviewHint('Loading next package code…');
    void previewServicePackageCode(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setCodePreview(result.code);
        setCodePreviewHint('Preview only — the server assigns the final code when you save.');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCodePreview('');
        setCodePreviewHint('Could not load code preview.');
      });
    return () => controller.abort();
  }, [open, editingId]);

  const selectedPagesCount = form.includedPages.length;

  const pricingPreview = useMemo(
    () =>
      computeServicePackagePricing({
        basePrice: form.basePrice,
        addOns: form.addOns
          .filter((row) => row.name.trim())
          .map((item) => ({
            price: item.price || '0',
            active: true,
            taxExempt: false,
            gstRatePercent: item.gstRatePercent.trim() ? item.gstRatePercent : form.gstRate,
          })),
        discountType: form.discountType,
        discountValue: form.discountValue,
        gstRatePercent: form.gstRate.trim() === '' ? null : form.gstRate,
      }),
    [form.addOns, form.basePrice, form.discountType, form.discountValue, form.gstRate],
  );

  const validateForm = (): boolean => {
    packageLiveFields.prepareSubmit();
    const payload = buildServicePackagePayload(form);
    const schema = editingId ? updateServicePackageRequestSchema : createServicePackageRequestSchema;
    const result = schema.safeParse(payload);
    if (result.success) {
      setFieldErrors({});
      return true;
    }
    setFieldErrors(zodErrorToFieldMap(result.error));
    focusFirstInvalidField();
    toast.error('Fix the highlighted fields before saving.');
    return false;
  };

  /** Radix blocks pointer events on "outside" targets when preventDefault is used — keep dialog open via onOpenChange instead. */
  const skipDialogCloseFromMultiSelectRef = useRef(false);

  const markMultiSelectPanelOutsideInteraction = (event: { target: EventTarget | null }) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(`[${SEARCHABLE_MULTI_SELECT_PANEL_ATTR}]`)) {
      skipDialogCloseFromMultiSelectRef.current = true;
    }
  };

  const onPackageDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && skipDialogCloseFromMultiSelectRef.current) {
      skipDialogCloseFromMultiSelectRef.current = false;
      return;
    }
    onOpenChange(nextOpen);
  };

  const save = async () => {
    if (!validateForm()) return;
    const payload = buildServicePackagePayload(form);
    try {
      if (editingId) {
        await updateServicePackage(editingId, payload);
        toast.success('Package updated.');
      } else {
        const created = await createServicePackage(payload);
        toast.success(
          created ? `Package saved as ${created.code}.` : 'Package saved successfully.',
        );
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onPackageDialogOpenChange}>
      <DialogContent
        className={SERVICE_PACKAGE_FORM_DIALOG_CLASS}
        style={SERVICE_PACKAGE_MODAL_DIALOG_STYLE}
        onInteractOutside={markMultiSelectPanelOutsideInteraction}
        onPointerDownOutside={markMultiSelectPanelOutsideInteraction}
        onFocusOutside={markMultiSelectPanelOutsideInteraction}
      >
        <DialogHeader className={SERVICE_PACKAGE_DIALOG_HEADER_CLASS}>
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Create package' : 'Edit package'}
          </DialogTitle>
        </DialogHeader>
        <div className={SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS}>
          {loadingPackage ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading package…
            </div>
          ) : (
            <div className={cn('package-form-grid grid gap-4', formGridClass)}>
              <div className={formFieldClass}>
                {fieldLabel('Package code', { htmlFor: 'pkg-code' })}
                <div className={formFieldControlShellClass}>
                  <Input
                    id="pkg-code"
                    readOnly
                    value={editingId ? form.displayCode : codePreview}
                    placeholder={
                      editingId
                        ? CRM_FORM_PLACEHOLDERS.packageCodeReadonly
                        : CRM_FORM_PLACEHOLDERS.packageCodeLoading
                    }
                    className={cn(
                      CRM_PIPELINE_FORM_FIELD_CLASS,
                      'bg-muted/50 font-mono text-sm',
                    )}
                  />
                </div>
                {!editingId && codePreviewHint ? (
                  <p className="text-muted-foreground text-xs">{codePreviewHint}</p>
                ) : null}
              </div>
              <CrmFormField
                id="pkg-name"
                label="Package name"
                required
                validated
                error={packageFieldError('name')}
              >
                <Input
                  id="pkg-name"
                  placeholder={CRM_FORM_PLACEHOLDERS.packageName}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(packageLiveFields.controlState('name')),
                  )}
                  value={form.name}
                  {...packageLiveFields.controlProps('name', 'pkg-name')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, name: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'name');
                  }}
                />
              </CrmFormField>

              <div className={cn('package-form-full', formGridFullWidthClass)}>
                <SearchableMultiSelect
                  label="Package categories"
                  triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectCategories}
                  groups={PACKAGE_CATEGORY_GROUPS}
                  value={form.categories}
                  onChange={(categories) => {
                    setForm((f) => ({ ...f, categories }));
                    packageLiveFields.touch('categories');
                    clearFormFieldError(setFieldErrors, 'categories');
                  }}
                  customNamespace="pkg.cat"
                  controlState={packageLiveFields.controlState('categories')}
                  onControlBlur={() => packageLiveFields.touch('categories')}
                  labelNode={fieldLabel('Package categories', { required: true })}
                />
                <CrmInlineFieldError message={packageFieldError('categories')} reserveSpace />
              </div>

              <div className={cn(formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Short description', { optional: true, htmlFor: 'pkg-short' })}
                <div className={formFieldControlShellClass}>
                  <Input
                    id="pkg-short"
                    placeholder={CRM_FORM_PLACEHOLDERS.shortDescription}
                    value={form.shortDescription}
                    maxLength={500}
                    onChange={(event) =>
                      setForm((f) => ({ ...f, shortDescription: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className={cn('package-form-full', formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Detailed description', { optional: true, htmlFor: 'pkg-detail' })}
                <Textarea
                  id="pkg-detail"
                  rows={2}
                  className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                  placeholder={CRM_FORM_PLACEHOLDERS.detailedDescription}
                  value={form.detailedDescription}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, detailedDescription: event.target.value }))
                  }
                />
              </div>

              <div className={cn('min-w-0', formGridFullWidthClass)}>
                <SearchableMultiSelect
                  label="Technology stack"
                  triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectTechnology}
                  groups={TECHNOLOGY_STACK_GROUPS}
                  value={form.technologyStack}
                  onChange={(technologyStack) => setForm((f) => ({ ...f, technologyStack }))}
                  customNamespace="tech"
                  labelNode={fieldLabel('Technology stack', { optional: true })}
                />
              </div>
              <div className={cn('min-w-0', formGridFullWidthClass)}>
                <SearchableMultiSelect
                  label="Included pages"
                  triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectPages}
                  groups={INCLUDED_PAGES_GROUPS}
                  value={form.includedPages}
                  onChange={(includedPages) => setForm((f) => ({ ...f, includedPages }))}
                  customNamespace="page"
                  labelNode={fieldLabel('Included pages', { optional: true })}
                />
                <p className="text-muted-foreground mt-1.5 text-xs leading-snug">
                  Selected pages: {selectedPagesCount}
                </p>
              </div>

              <SearchableMultiSelect
                label="Included integrations"
                triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectIntegrations}
                groups={INTEGRATIONS_GROUPS}
                value={form.integrations}
                onChange={(integrations) => setForm((f) => ({ ...f, integrations }))}
                customNamespace="integration"
                labelNode={fieldLabel('Included integrations', { optional: true })}
              />
              <SearchableMultiSelect
                label="Admin panel features"
                triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectAdminFeatures}
                groups={ADMIN_PANEL_GROUPS}
                value={form.adminPanelFeatures}
                onChange={(adminPanelFeatures) => setForm((f) => ({ ...f, adminPanelFeatures }))}
                customNamespace="admin"
                labelNode={fieldLabel('Admin panel features', { optional: true })}
              />

              <SearchableMultiSelect
                label="Hosting / deployment"
                triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectHosting}
                groups={HOSTING_DEPLOYMENT_GROUPS}
                value={form.hostingDeployment}
                onChange={(hostingDeployment) => setForm((f) => ({ ...f, hostingDeployment }))}
                customNamespace="hosting"
                labelNode={fieldLabel('Hosting / deployment', { optional: true })}
              />
              <SearchableMultiSelect
                label="Delivery services"
                triggerPlaceholder={CRM_FORM_PLACEHOLDERS.selectDeliveryServices}
                groups={DELIVERY_SERVICES_GROUPS}
                value={form.deliveryServices}
                onChange={(deliveryServices) => setForm((f) => ({ ...f, deliveryServices }))}
                customNamespace="delivery"
                labelNode={fieldLabel('Delivery services', { optional: true })}
              />

              <div className={formFieldClass}>
                {fieldLabel('Pages count', { optional: true, htmlFor: 'page-count' })}
                <div className={formFieldControlShellClass}>
                  <Input
                    id="page-count"
                    inputMode="numeric"
                    placeholder={CRM_FORM_PLACEHOLDERS.pageCount}
                    value={form.pageCount}
                    onChange={(event) => setForm((f) => ({ ...f, pageCount: event.target.value }))}
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Manual total when it differs from the catalog page list above.
                </p>
              </div>
              <div className={formFieldClass}>
                {fieldLabel('Delivery duration', { required: true, htmlFor: 'delivery-value' })}
                <div className="flex gap-2">
                  <Input
                    id="delivery-value"
                    className={cn(
                      formControlStateClass(packageLiveFields.controlState('deliveryDurationValue')),
                    )}
                    inputMode="numeric"
                    placeholder={CRM_FORM_PLACEHOLDERS.deliveryDuration}
                    value={form.deliveryDurationValue}
                    {...packageLiveFields.controlProps('deliveryDurationValue', 'delivery-value')}
                    onChange={(event) => {
                      setForm((f) => ({ ...f, deliveryDurationValue: event.target.value }));
                      clearFormFieldError(setFieldErrors, 'deliveryDurationValue');
                    }}
                  />
                  <Select
                    value={form.deliveryDurationUnit}
                    onValueChange={(value) =>
                      setForm((f) => ({
                        ...f,
                        deliveryDurationUnit: value as ServicePackageDeliveryUnit,
                      }))
                    }
                  >
                    <SelectTrigger
                      className={cn(PACKAGE_SELECT_TRIGGER_CLASS, 'h-11 w-[7.5rem]')}
                      aria-label="Delivery duration unit"
                    >
                      <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectDurationUnit} />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <CrmInlineFieldError
                  message={packageFieldError('deliveryDurationValue')}
                  reserveSpace
                />
              </div>

              <div className={cn('package-form-full', formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Integration notes', { optional: true, htmlFor: 'integration-notes' })}
                <Textarea
                  id="integration-notes"
                  rows={2}
                  className="min-h-[3.5rem] resize-y"
                  placeholder={CRM_FORM_PLACEHOLDERS.integrationNotes}
                  value={form.integrationNotes}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, integrationNotes: event.target.value }))
                  }
                />
              </div>

              <div className={formFieldClass}>
                {fieldLabel('Base price (INR)', { required: true, htmlFor: 'base-price' })}
                <Input
                  id="base-price"
                  placeholder={CRM_FORM_PLACEHOLDERS.basePrice}
                  className={formControlStateClass(packageLiveFields.controlState('basePrice'))}
                  value={form.basePrice}
                  {...packageLiveFields.controlProps('basePrice', 'base-price')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, basePrice: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'basePrice');
                  }}
                />
                <CrmInlineFieldError message={packageFieldError('basePrice')} reserveSpace />
              </div>
              <div className={formFieldClass}>
                {fieldLabel('GST rate (%)', { optional: true, htmlFor: 'gst-rate' })}
                <Input
                  id="gst-rate"
                  className={cn(
                    'h-10',
                    formControlStateClass(packageLiveFields.controlState('gstRatePercent')),
                  )}
                  inputMode="decimal"
                  placeholder={CRM_FORM_PLACEHOLDERS.gstRate}
                  value={form.gstRate}
                  {...packageLiveFields.controlProps('gstRatePercent', 'gst-rate')}
                  onChange={(event) => {
                    setForm((f) => ({ ...f, gstRate: event.target.value }));
                    clearFormFieldError(setFieldErrors, 'gstRatePercent');
                  }}
                />
                <CrmInlineFieldError message={packageFieldError('gstRatePercent')} reserveSpace />
              </div>
              <div className={formFieldClass}>
                {fieldLabel('Discount type', { optional: true, htmlFor: 'discount-type' })}
                <div className={formFieldControlShellClass}>
                  <Select
                    value={form.discountType}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, discountType: value as PackageDiscountType }))
                    }
                  >
                    <SelectTrigger id="discount-type" className={PACKAGE_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectDiscountType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Fixed amount</SelectItem>
                      <SelectItem value="PERCENT">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={formFieldClass}>
                {fieldLabel('Discount value', { optional: true, htmlFor: 'discount-value' })}
                <div className={formFieldControlShellClass}>
                  <Input
                    id="discount-value"
                    className={formControlStateClass(packageLiveFields.controlState('discountValue'))}
                    inputMode="decimal"
                    placeholder={CRM_FORM_PLACEHOLDERS.discountValue}
                    value={form.discountValue}
                    {...packageLiveFields.controlProps('discountValue', 'discount-value')}
                    onChange={(event) => {
                      setForm((f) => ({ ...f, discountValue: event.target.value }));
                      clearFormFieldError(setFieldErrors, 'discountValue');
                    }}
                  />
                </div>
                <CrmInlineFieldError
                  message={packageFieldError('discountValue')}
                  reserveSpace={form.discountValue.trim() !== ''}
                />
              </div>

              <div className={formFieldClass}>
                {fieldLabel('Support period', { optional: true, htmlFor: 'support-period' })}
                <Input
                  id="support-period"
                  placeholder={CRM_FORM_PLACEHOLDERS.supportPeriod}
                  value={form.supportPeriod}
                  onChange={(event) => setForm((f) => ({ ...f, supportPeriod: event.target.value }))}
                />
              </div>
              <div className={formFieldClass}>
                {fieldLabel('Revision allowance', { optional: true, htmlFor: 'revisions' })}
                <Input
                  id="revisions"
                  placeholder={CRM_FORM_PLACEHOLDERS.revisionAllowance}
                  value={form.revisionAllowance}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, revisionAllowance: event.target.value }))
                  }
                />
              </div>

              <div className={cn('package-form-full', formFieldClass, formGridFullWidthClass)}>
                {fieldLabel('Terms and exclusions', { optional: true, htmlFor: 'terms' })}
                <Textarea
                  id="terms"
                  rows={2}
                  placeholder={CRM_FORM_PLACEHOLDERS.termsExclusions}
                  className="min-h-[3.5rem] resize-y"
                  value={form.termsExclusions}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, termsExclusions: event.target.value }))
                  }
                />
              </div>

              <div className={cn('package-form-full', formGridFullWidthClass)}>
              <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                {fieldLabel('Optional add-on services', { optional: true })}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      addOns: [
                        ...f.addOns,
                        {
                          key: `addon-${Date.now()}`,
                          name: '',
                          description: '',
                          price: '0',
                          gstRatePercent: '',
                          taxExempt: false,
                          active: true,
                        },
                      ],
                    }))
                  }
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add service
                </Button>
              </div>
              {form.addOns.length === 0 ? (
                <p className="text-muted-foreground text-xs">No add-ons configured.</p>
              ) : (
                <div className="grid gap-3">
                  {form.addOns.map((item) => (
                    <div key={item.key} className="grid gap-2 rounded-md border p-3">
                      <div className="grid grid-cols-1 items-start gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem_2.5rem]">
                        <Input
                          aria-label="Add-on name"
                          placeholder={CRM_FORM_PLACEHOLDERS.addOnServiceName}
                          value={item.name}
                          onChange={(event) =>
                            setForm((f) => ({
                              ...f,
                              addOns: f.addOns.map((row) =>
                                row.key === item.key ? { ...row, name: event.target.value } : row,
                              ),
                            }))
                          }
                        />
                        <Input
                          aria-label="Add-on price in INR"
                          placeholder={CRM_FORM_PLACEHOLDERS.addOnPriceInr}
                          inputMode="decimal"
                          value={item.price}
                          onChange={(event) =>
                            setForm((f) => ({
                              ...f,
                              addOns: f.addOns.map((row) =>
                                row.key === item.key ? { ...row, price: event.target.value } : row,
                              ),
                            }))
                          }
                        />
                        <Input
                          aria-label="Add-on GST rate"
                          placeholder={CRM_FORM_PLACEHOLDERS.addOnGstOptional}
                          inputMode="decimal"
                          value={item.gstRatePercent}
                          onChange={(event) =>
                            setForm((f) => ({
                              ...f,
                              addOns: f.addOns.map((row) =>
                                row.key === item.key
                                  ? { ...row, gstRatePercent: event.target.value }
                                  : row,
                              ),
                            }))
                          }
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 justify-self-end min-[520px]:justify-self-auto"
                          aria-label="Remove add-on"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              addOns: f.addOns.filter((row) => row.key !== item.key),
                            }))
                          }
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        className="min-h-[3.5rem] resize-y"
                        placeholder={CRM_FORM_PLACEHOLDERS.addOnDescriptionOptional}
                        value={item.description}
                        onChange={(event) =>
                          setForm((f) => ({
                            ...f,
                            addOns: f.addOns.map((row) =>
                              row.key === item.key ? { ...row, description: event.target.value } : row,
                            ),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

              <div className="bg-muted/40 grid gap-1 rounded-md border p-3 text-sm">
                <p className="font-medium">Pricing preview (INR)</p>
                <div className="text-muted-foreground grid gap-1 tabular-nums min-[700px]:grid-cols-2">
                  <span>Base: {formatMoney(form.basePrice || '0', 'INR')}</span>
                  <span>Discount: {formatMoney(pricingPreview.discountAmount, 'INR')}</span>
                  <span>Taxable: {formatMoney(pricingPreview.taxableAmount, 'INR')}</span>
                  <span>GST: {formatMoney(pricingPreview.gstAmount, 'INR')}</span>
                  <span className="text-foreground min-[700px]:col-span-2 font-medium">
                    Final price: {formatMoney(pricingPreview.finalPrice, 'INR')}
                  </span>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className={SERVICE_PACKAGE_DIALOG_FOOTER_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={PACKAGE_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', PACKAGE_FORM_PRIMARY_BTN)}
            disabled={pending || loadingPackage}
            onClick={() => void save()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create package'
            ) : (
              'Save package'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
