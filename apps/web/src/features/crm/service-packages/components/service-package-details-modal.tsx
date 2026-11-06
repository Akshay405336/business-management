'use client';

import { Loader2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
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
  CrmErrorAlert,
  CrmFieldLabel,
  CrmLoadingRows,
} from '@/features/admin/crm/components/crm-feedback';
import { useAdminToast } from '@/features/admin/components/toast';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatDateOnly, formatMoney } from '@/features/admin/crm/utils/format';
import {
  LEAD_FORM_PRIMARY_BTN,
  LEAD_FORM_SECONDARY_BTN,
} from '@/features/crm/leads/components/lead-form-dialog';
import { cn } from '@/shared/lib/utils';
import { useChangeServicePackageStatus, useServicePackage } from '../hooks';
import type { CrmServicePackage } from '../types/service-package.types';
import {
  formatCatalogLabels,
  formatCategorySummary,
  formatDeliveryDuration,
  formatPageCount,
} from '../utils/service-package.utils';
import {
  SERVICE_PACKAGE_DETAILS_DIALOG_CLASS,
  SERVICE_PACKAGE_DIALOG_FOOTER_CLASS,
  SERVICE_PACKAGE_DIALOG_HEADER_CLASS,
  SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS,
  SERVICE_PACKAGE_MODAL_DIALOG_STYLE,
} from './service-package-dialog-shell';
import { ServicePackageStatusBadge } from './service-package-status-badge';

function DetailValue({ children, multiline }: { children: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <div
        className={cn(
          CRM_PIPELINE_FORM_TEXTAREA_CLASS,
          'text-foreground min-h-[3.5rem] w-full min-w-0 px-3 py-2 text-sm break-words whitespace-pre-wrap',
        )}
      >
        {children.trim() ? children : '—'}
      </div>
    );
  }
  return (
    <div
      className={cn(
        CRM_PIPELINE_FORM_FIELD_CLASS,
        'text-foreground flex min-h-11 w-full min-w-0 items-center px-3 text-sm',
      )}
    >
      <span className="min-w-0 break-words">{children.trim() ? children : '—'}</span>
    </div>
  );
}

function DetailField({
  label,
  value,
  multiline,
  className,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      <CrmFieldLabel>{label}</CrmFieldLabel>
      <DetailValue multiline={multiline}>{value}</DetailValue>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-foreground border-border/60 border-b pb-2 text-sm font-semibold">
      {children}
    </h2>
  );
}

function discountLabel(pkg: CrmServicePackage): string {
  if (pkg.discountType === 'PERCENT') {
    return `${pkg.discountValue}%`;
  }
  return formatMoney(pkg.discountValue, 'INR');
}

function PackageDetailsBody({ pkg }: { pkg: CrmServicePackage }) {
  const description =
    pkg.shortDescription.trim() ||
    pkg.detailedDescription.trim() ||
    '—';

  return (
    <div className="grid w-full min-w-0 max-w-full gap-5 pb-2">
      <section className="grid min-w-0 gap-3">
        <SectionTitle>General information</SectionTitle>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-x-4">
          <DetailField label="Package name" value={pkg.name} className="sm:col-span-2" />
          <DetailField label="Package code" value={pkg.code} />
          <DetailField label="Pages count" value={formatPageCount(pkg.pageCount)} />
          <DetailField label="Categories" value={formatCategorySummary(pkg.categories)} className="sm:col-span-2" />
          <DetailField label="Description" value={description} multiline className="sm:col-span-2" />
          {pkg.detailedDescription.trim() && pkg.shortDescription.trim() ? (
            <DetailField
              label="Detailed description"
              value={pkg.detailedDescription}
              multiline
              className="sm:col-span-2"
            />
          ) : null}
          <DetailField
            label="Included pages (catalog)"
            value={formatCatalogLabels(pkg.includedPages)}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-3">
        <SectionTitle>Delivery information</SectionTitle>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-x-4">
          <DetailField label="Delivery duration" value={formatDeliveryDuration(pkg)} />
          <DetailField
            label="Delivery services"
            value={formatCatalogLabels(pkg.deliveryServices)}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-3">
        <SectionTitle>Pricing details</SectionTitle>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-x-4">
          <DetailField label="Base price (INR)" value={formatMoney(pkg.basePrice, 'INR')} />
          <DetailField label="Final price (INR)" value={formatMoney(pkg.finalPrice, 'INR')} />
          <DetailField label="Discount type" value={pkg.discountType === 'PERCENT' ? 'Percentage' : 'Fixed amount'} />
          <DetailField label="Discount" value={discountLabel(pkg)} />
          <DetailField label="GST rate" value={`${pkg.gstRate}%`} />
          <DetailField label="Taxable amount (INR)" value={formatMoney(pkg.taxableAmount, 'INR')} />
          <DetailField label="GST amount (INR)" value={formatMoney(pkg.gstAmount, 'INR')} />
        </div>
        {pkg.addOns.length > 0 ? (
          <div className="grid min-w-0 gap-2">
            <CrmFieldLabel>Add-on services</CrmFieldLabel>
            <ul className="grid min-w-0 gap-2 text-sm">
              {pkg.addOns.map((item) => (
                <li
                  key={item.id ?? item.name}
                  className="border-border/60 w-full min-w-0 rounded-lg border bg-[#f7faff]/60 px-3 py-2 break-words"
                >
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground tabular-nums">
                    {formatMoney(item.price, 'INR')}
                    {item.gstRatePercent ? ` · GST ${item.gstRatePercent}%` : null}
                    {item.taxExempt ? ' · Tax exempt' : null}
                    {item.active === false ? ' · Inactive' : null}
                  </p>
                  {item.description ? (
                    <p className="text-muted-foreground mt-1 text-xs break-words">{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="grid min-w-0 gap-3">
        <SectionTitle>Scope and configuration</SectionTitle>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-x-4">
          <DetailField label="Technology stack" value={formatCatalogLabels(pkg.technologyStack)} className="sm:col-span-2" />
          <DetailField label="Integrations" value={formatCatalogLabels(pkg.integrations)} className="sm:col-span-2" />
          <DetailField label="Admin panel features" value={formatCatalogLabels(pkg.adminPanelFeatures)} className="sm:col-span-2" />
          <DetailField label="Hosting / deployment" value={formatCatalogLabels(pkg.hostingDeployment)} className="sm:col-span-2" />
          <DetailField label="Integration notes" value={pkg.integrationNotes} multiline className="sm:col-span-2" />
        </div>
      </section>

      <section className="grid min-w-0 gap-3">
        <SectionTitle>Additional information</SectionTitle>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-x-4">
          <DetailField label="Status" value={pkg.status === 'ACTIVE' ? 'Active' : 'Inactive'} />
          <DetailField label="Support period" value={pkg.supportPeriod} />
          <DetailField label="Revision allowance" value={pkg.revisionAllowance} />
          <DetailField label="Created" value={formatDateOnly(pkg.createdAt)} />
          <DetailField label="Updated" value={formatDateOnly(pkg.updatedAt)} />
          <DetailField label="Terms and exclusions" value={pkg.termsExclusions} multiline className="sm:col-span-2" />
        </div>
      </section>
    </div>
  );
}

export function ServicePackageDetailsModal({
  packageId,
  open,
  onOpenChange,
  onEditPackage,
  onListRefresh,
}: {
  packageId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditPackage?: (packageId: string) => void;
  onListRefresh?: () => void;
}) {
  const toast = useAdminToast();
  const active = open && Boolean(packageId);
  const { package: pkg, loading, error, refetch } = useServicePackage(packageId, active);
  const { changeServicePackageStatus, pending: statusPending } = useChangeServicePackageStatus();
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) setStatusConfirmOpen(false);
  }, [open]);

  const statusChangeIsDeactivate = pkg?.status === 'ACTIVE';

  const confirmStatusChange = async () => {
    if (!pkg || statusPending) return;
    const next = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await changeServicePackageStatus(pkg.id, next);
      toast.success(next === 'ACTIVE' ? 'Package activated.' : 'Package deactivated.');
      refetch();
      onListRefresh?.();
      setStatusConfirmOpen(false);
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          key={packageId ?? 'closed'}
          className={SERVICE_PACKAGE_DETAILS_DIALOG_CLASS}
          style={SERVICE_PACKAGE_MODAL_DIALOG_STYLE}
        >
          <DialogHeader className={SERVICE_PACKAGE_DIALOG_HEADER_CLASS}>
            <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
              {pkg?.name ?? 'Package details'}
            </DialogTitle>
            {pkg ? (
              <>
                <p className="text-muted-foreground pt-1 font-mono text-sm">{pkg.code}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <ServicePackageStatusBadge status={pkg.status} />
                  <Badge variant="secondary">{formatMoney(pkg.finalPrice, 'INR')}</Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground pt-1 text-sm">Package details</p>
            )}
          </DialogHeader>

          <div className={SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS}>
            {error ? (
              <div className="mb-4">
                <CrmErrorAlert message={error} />
              </div>
            ) : null}

            {loading && active ? <CrmLoadingRows rows={6} /> : null}

            {pkg && !loading ? <PackageDetailsBody pkg={pkg} /> : null}
          </div>

          {pkg ? (
            <DialogFooter className={SERVICE_PACKAGE_DIALOG_FOOTER_CLASS}>
              <Button
                type="button"
                variant="outline"
                className={LEAD_FORM_SECONDARY_BTN}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {onEditPackage ? (
                <Button
                  type="button"
                  variant="outline"
                  className={LEAD_FORM_SECONDARY_BTN}
                  disabled={loading}
                  onClick={() => {
                    onOpenChange(false);
                    onEditPackage(pkg.id);
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit package
                </Button>
              ) : null}
              <Button
                type="button"
                className={cn('h-11 px-5', LEAD_FORM_PRIMARY_BTN)}
                disabled={loading || statusPending}
                onClick={() => setStatusConfirmOpen(true)}
              >
                {pkg.status === 'ACTIVE' ? (
                  <ToggleRight className="size-4" aria-hidden="true" />
                ) : (
                  <ToggleLeft className="size-4" aria-hidden="true" />
                )}
                {pkg.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate package?' : 'Activate package?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pkg
                ? statusChangeIsDeactivate
                  ? `Are you sure you want to deactivate "${pkg.name}"? This package will no longer be available for new proposal selection.`
                  : `Are you sure you want to activate "${pkg.name}"?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!pkg || statusPending}
              className={
                statusChangeIsDeactivate
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                void confirmStatusChange();
              }}
            >
              {statusPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {statusChangeIsDeactivate ? 'Deactivating…' : 'Activating…'}
                </>
              ) : statusChangeIsDeactivate ? (
                'Deactivate'
              ) : (
                'Activate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
