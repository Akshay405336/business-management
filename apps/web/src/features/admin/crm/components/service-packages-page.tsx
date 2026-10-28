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
import { Loader2, Package, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
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
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_PACKAGES_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  changeServicePackageStatus,
  createServicePackage,
  deleteServicePackage,
  listServicePackages,
  previewServicePackageCode,
  updateServicePackage,
} from '../api/service-packages';
import type {
  CatalogSelection,
  CrmServicePackage,
  PackageDiscountType,
  ServicePackageDeliveryUnit,
} from '../types';
import {
  CrmErrorAlert,
  CrmFieldLabel,
  CrmFormField,
  CrmInlineFieldError,
  formGridClass,
  formGridFullWidthClass,
} from './crm-feedback';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { useAsyncAction } from '../hooks/use-async-action';
import { describeCrmError } from '../utils/errors';
import { formatMoney } from '../utils/format';

type AddOnFormRow = {
  key: string;
  name: string;
  description: string;
  price: string;
  gstRatePercent: string;
  taxExempt: boolean;
  active: boolean;
};

type PackageForm = {
  displayCode: string;
  name: string;
  categories: CatalogSelection[];
  shortDescription: string;
  detailedDescription: string;
  technologyStack: CatalogSelection[];
  includedPages: CatalogSelection[];
  integrations: CatalogSelection[];
  adminPanelFeatures: CatalogSelection[];
  hostingDeployment: CatalogSelection[];
  deliveryServices: CatalogSelection[];
  integrationNotes: string;
  pageCount: string;
  basePrice: string;
  discountType: PackageDiscountType;
  discountValue: string;
  gstRate: string;
  deliveryDurationValue: string;
  deliveryDurationUnit: ServicePackageDeliveryUnit;
  supportPeriod: string;
  revisionAllowance: string;
  termsExclusions: string;
  addOns: AddOnFormRow[];
};

const SEARCH_DEBOUNCE_MS = 400;

type PackageStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const DELIVERY_UNITS: { value: ServicePackageDeliveryUnit; label: string }[] = [
  { value: 'DAYS', label: 'Days' },
  { value: 'WEEKS', label: 'Weeks' },
  { value: 'MONTHS', label: 'Months' },
];

const emptyForm = (): PackageForm => ({
  displayCode: '',
  name: '',
  categories: [],
  shortDescription: '',
  detailedDescription: '',
  technologyStack: [],
  includedPages: [],
  integrations: [],
  adminPanelFeatures: [],
  hostingDeployment: [],
  deliveryServices: [],
  integrationNotes: '',
  pageCount: '',
  basePrice: '0',
  discountType: 'FIXED',
  discountValue: '0',
  gstRate: '',
  deliveryDurationValue: '15',
  deliveryDurationUnit: 'DAYS',
  supportPeriod: '',
  revisionAllowance: '',
  termsExclusions: '',
  addOns: [],
});

const formFromPackage = (pkg: CrmServicePackage): PackageForm => ({
  displayCode: pkg.code,
  name: pkg.name,
  categories: [...pkg.categories],
  shortDescription: pkg.shortDescription,
  detailedDescription: pkg.detailedDescription,
  technologyStack: [...pkg.technologyStack],
  includedPages: [...pkg.includedPages],
  integrations: [...pkg.integrations],
  adminPanelFeatures: [...pkg.adminPanelFeatures],
  hostingDeployment: [...pkg.hostingDeployment],
  deliveryServices: [...pkg.deliveryServices],
  integrationNotes: pkg.integrationNotes,
  pageCount: pkg.pageCount === null ? '' : String(pkg.pageCount),
  basePrice: pkg.basePrice,
  discountType: pkg.discountType,
  discountValue: pkg.discountValue,
  gstRate: pkg.gstRate === '0' ? '' : pkg.gstRate,
  deliveryDurationValue:
    pkg.deliveryDurationValue === null ? '' : String(pkg.deliveryDurationValue),
  deliveryDurationUnit: pkg.deliveryDurationUnit ?? 'DAYS',
  supportPeriod: pkg.supportPeriod,
  revisionAllowance: pkg.revisionAllowance,
  termsExclusions: pkg.termsExclusions,
  addOns: pkg.addOns.map((item, index) => ({
    key: item.id ?? `addon-${index}`,
    name: item.name,
    description: item.description ?? '',
    price: item.price,
    gstRatePercent: item.gstRatePercent ?? '',
    taxExempt: item.taxExempt ?? false,
    active: item.active ?? true,
  })),
});

const formatCategorySummary = (categories: readonly CatalogSelection[]): string => {
  if (categories.length === 0) return '—';
  const head = categories.slice(0, 2).map((item) => item.label);
  const tail = categories.length > 2 ? ` +${categories.length - 2}` : '';
  return `${head.join(', ')}${tail}`;
};

const fieldLabel = (
  label: string,
  opts: { required?: boolean; optional?: boolean; htmlFor?: string },
) => (
  <CrmFieldLabel htmlFor={opts.htmlFor} required={opts.required} optional={opts.optional}>
    {label}
  </CrmFieldLabel>
);

export function ServicePackagesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [packages, setPackages] = useState<readonly CrmServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PackageForm>(() => emptyForm());
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
  const [deleteTarget, setDeleteTarget] = useState<CrmServicePackage | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackageStatusFilter>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listServicePackages();
      setPackages(result.packages);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (searchDraft === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filtersActive = search.trim().length > 0 || statusFilter !== 'ALL';

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (statusFilter !== 'ALL' && pkg.status !== statusFilter) return false;
      if (!q) return true;
      return (
        pkg.name.toLowerCase().includes(q) ||
        pkg.code.toLowerCase().includes(q) ||
        pkg.categories.some((item) => item.label.toLowerCase().includes(q))
      );
    });
  }, [packages, search, statusFilter]);

  const totalPackages = filteredPackages.length;
  const totalPages = Math.max(1, Math.ceil(totalPackages / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedPackages = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPackages.slice(start, start + pageSize);
  }, [filteredPackages, pageSize, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: filteredPackages.length,
  });
  const tableRefreshing = isDataTableRefreshing({
    loading,
    rowCount: filteredPackages.length,
  });

  useEffect(() => {
    if (!dialogOpen || editingId) return;
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
  }, [dialogOpen, editingId]);

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

  const buildPayload = () => ({
    name: form.name.trim(),
    categories: form.categories,
    shortDescription: form.shortDescription.trim() || undefined,
    detailedDescription: form.detailedDescription.trim() || undefined,
    technologyStack: form.technologyStack,
    includedPages: form.includedPages,
    integrations: form.integrations,
    adminPanelFeatures: form.adminPanelFeatures,
    hostingDeployment: form.hostingDeployment,
    deliveryServices: form.deliveryServices,
    integrationNotes: form.integrationNotes.trim() || undefined,
    pageCount: form.pageCount ? Number(form.pageCount) : undefined,
    basePrice: form.basePrice,
    addOns: form.addOns
      .filter((row) => row.name.trim())
      .map((row) => ({
        name: row.name.trim(),
        description: row.description.trim() || undefined,
        price: row.price || '0',
        gstRatePercent: row.gstRatePercent.trim() ? row.gstRatePercent : null,
        taxExempt: false,
        active: true,
      })),
    discountType: form.discountType,
    discountValue: form.discountValue.trim() === '' ? '0' : form.discountValue,
    gstRatePercent: form.gstRate.trim() === '' ? null : form.gstRate,
    deliveryDurationValue: Number(form.deliveryDurationValue),
    deliveryDurationUnit: form.deliveryDurationUnit,
    supportPeriod: form.supportPeriod.trim() || undefined,
    revisionAllowance: form.revisionAllowance.trim() || undefined,
    termsExclusions: form.termsExclusions.trim() || undefined,
  });

  const validateForm = (): boolean => {
    packageLiveFields.prepareSubmit();
    const payload = buildPayload();
    const result = createServicePackageRequestSchema.safeParse(payload);
    if (result.success) {
      setFieldErrors({});
      return true;
    }
    setFieldErrors(zodErrorToFieldMap(result.error));
    focusFirstInvalidField();
    toast.error('Fix the highlighted fields before saving.');
    return false;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFieldErrors({});
    packageLiveFields.reset();
    setCodePreview('');
    setCodePreviewHint('');
    setDialogOpen(true);
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
    setDialogOpen(nextOpen);
  };

  const openEdit = (pkg: CrmServicePackage) => {
    setEditingId(pkg.id);
    setForm(formFromPackage(pkg));
    setFieldErrors({});
    setDialogOpen(true);
  };

  const save = async () => {
    if (!validateForm()) return;
    const payload = buildPayload();
    try {
      if (editingId) {
        await run(() => updateServicePackage(editingId, payload));
        toast.success('Package updated.');
      } else {
        const created = await run(() => createServicePackage(payload));
        toast.success(
          created ? `Package saved as ${created.code}.` : 'Package saved successfully.',
        );
      }
      setDialogOpen(false);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const toggleStatus = async (pkg: CrmServicePackage) => {
    const next = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => changeServicePackageStatus(pkg.id, next));
      toast.success(next === 'ACTIVE' ? 'Package activated.' : 'Package deactivated.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteServicePackage(target.id));
      toast.success(`Package "${target.name}" permanently deleted.`);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Service Packages' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Service Packages"
        description="Manage reusable service packages."
        className="shadow-xs"
        titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
        descriptionClassName="xl:whitespace-nowrap"
        toolbar={
          <>
            <form
              className={CRM_HEADER_SEARCH_FORM_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                <Input
                  className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                  placeholder={CRM_FORM_PLACEHOLDERS.searchPackages}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search packages"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PackageStatusFilter)}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 sm:w-[9.375rem] sm:max-w-[10rem]"
                aria-label="Filter by status"
              >
                <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="h-9 shrink-0" onClick={openCreate}>
              <Plus aria-hidden="true" />
              New package
            </Button>
          </>
        }
      />

      {error && packages.length > 0 ? <CrmErrorAlert message={error} /> : null}

      <DataTable
        className="min-w-0 max-w-full"
        tableClassName="table-fixed"
        phase={tablePhase}
        colSpan={5}
        skeletonColumns={CRM_PACKAGES_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead>Package</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead className="text-right">Final price (INR)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[7.5rem] text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          title: filtersActive ? 'No results match your filters' : 'No service packages yet',
          description: filtersActive
            ? 'Try different search terms or clear filters to see all packages.'
            : 'Create a package to reuse technology, scope, integrations, and pricing in quotations.',
          secondaryAction: filtersActive
            ? { label: 'Clear filters', onClick: clearFilters }
            : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={totalPackages}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {pagedPackages.map((pkg) => (
          <TableRow key={pkg.id}>
            <TableCell>
              <div className="font-medium">{pkg.name}</div>
              <div className="text-muted-foreground text-xs">{pkg.code}</div>
            </TableCell>
            <TableCell className="whitespace-normal">{formatCategorySummary(pkg.categories)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(pkg.finalPrice, 'INR')}
            </TableCell>
            <TableCell>
              {pkg.status === 'ACTIVE' ? (
                <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
                  Active
                </Badge>
              ) : (
                <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
                  Inactive
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-0.5">
                <TableIconButton
                  label={pkg.status === 'ACTIVE' ? `Deactivate ${pkg.name}` : `Activate ${pkg.name}`}
                  tone={pkg.status === 'ACTIVE' ? 'success' : 'danger'}
                  disabled={pending}
                  onClick={() => void toggleStatus(pkg)}
                >
                  <Power className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Edit ${pkg.name}`}
                  tone="primary"
                  disabled={pending}
                  onClick={() => openEdit(pkg)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Permanently delete ${pkg.name}`}
                  tone="danger"
                  disabled={pending}
                  onClick={() => setDeleteTarget(pkg)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <Dialog open={dialogOpen} onOpenChange={onPackageDialogOpenChange}>
        <DialogContent
          className="flex max-h-[92vh] w-[90vw] max-w-[720px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]"
          onInteractOutside={markMultiSelectPanelOutsideInteraction}
          onPointerDownOutside={markMultiSelectPanelOutsideInteraction}
          onFocusOutside={markMultiSelectPanelOutsideInteraction}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-4" aria-hidden="true" />
              {editingId ? 'Edit package' : 'New package'}
            </DialogTitle>
            <DialogDescription>
              GST and totals are recalculated on save. Package codes are assigned by the server.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className={cn('package-form-grid', formGridClass)}>
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
                    className="bg-muted/40 font-mono text-sm"
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
                  className={formControlStateClass(packageLiveFields.controlState('name'))}
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
                  className="min-h-[4.5rem] resize-y"
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
                    <SelectTrigger className="h-9 w-[7.5rem]" aria-label="Delivery duration unit">
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
                    <SelectTrigger id="discount-type">
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
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void save()}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {editingId ? 'Update package' : 'Save package'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete &quot;{deleteTarget?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The package record will be removed from your catalog.
              Existing quotations keep their saved package snapshot; only the link to this catalog
              entry is cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Permanently delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
