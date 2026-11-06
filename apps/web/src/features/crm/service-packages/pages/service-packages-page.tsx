'use client';

import {
  ArrowUpDown,
  ListFilter,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  CRM_PACKAGES_TABLE_COLUMN_CLASS,
  CRM_PACKAGES_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_HEADER_SEARCH_FORM_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatMoney } from '@/features/admin/crm/utils/format';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';
import { ServicePackageActions } from '../components/service-package-actions';
import { ServicePackageDetailsModal } from '../components/service-package-details-modal';
import { ServicePackageFormModal } from '../components/service-package-form-modal';
import { ServicePackageStatusBadge } from '../components/service-package-status-badge';
import {
  useChangeServicePackageStatus,
  useDeleteServicePackage,
  useServicePackages,
} from '../hooks';
import type { CrmServicePackage } from '../types/service-package.types';
import {
  filterAndSortServicePackages,
  formatDeliveryDuration,
  formatPageCount,
  type ServicePackageSortKey,
  type ServicePackageStatusFilter,
} from '../utils/service-package.utils';
import {
  isServicePackageDeleteBlockedError,
  servicePackageDeleteBlockedMessage,
} from '../utils/service-package-delete-messages';

const SEARCH_DEBOUNCE_MS = 400;

export function ServicePackagesPage() {
  const toast = useAdminToast();
  const { dashboardBreadcrumb } = usePortalNavigation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServicePackageStatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<ServicePackageSortKey>('default');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailPackageId, setDetailPackageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmServicePackage | null>(null);
  const [deleteBlockedOpen, setDeleteBlockedOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<CrmServicePackage | null>(null);
  const { packages, loading, error, refetch } = useServicePackages();
  const { changeServicePackageStatus, pending: statusPending } =
    useChangeServicePackageStatus();
  const { deleteServicePackage, pending: deletePending } = useDeleteServicePackage();
  const pending = statusPending || deletePending;

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

  const sortedFiltered = useMemo(
    () =>
      filterAndSortServicePackages(packages ?? [], {
        search,
        status: statusFilter,
        sortKey,
      }),
    [packages, search, statusFilter, sortKey],
  );

  const filtersActive = statusFilter !== 'ALL' || search.trim().length > 0;
  const searchActive = search.trim().length > 0;
  const totalPackages = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalPackages / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedPackages = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, pageSize, safePage]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: (packages?.length ?? 0) > 0 ? sortedFiltered.length : 0,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: sortedFiltered.length });

  const emptyTitle = searchActive
    ? 'No packages match your search.'
    : filtersActive
      ? 'No packages match your filters'
      : 'No service packages yet';

  const emptyDescription = searchActive
    ? 'Try different search terms or clear filters to see all packages.'
    : filtersActive
      ? 'Try different filters or clear them to see all packages.'
      : 'Create a package to reuse scope, integrations, and pricing in proposals.';

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (pkg: CrmServicePackage) => {
    setEditingId(pkg.id);
    setFormOpen(true);
  };

  const clearFilters = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setSortKey('default');
    setPage(1);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const pkg = statusTarget;
    const next = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusTarget(null);
    try {
      await changeServicePackageStatus(pkg.id, next);
      toast.success(next === 'ACTIVE' ? 'Package activated.' : 'Package deactivated.');
      refetch();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteServicePackage(target.id);
      toast.success(`Package "${target.name}" deleted.`);
      refetch();
    } catch (failure) {
      if (isServicePackageDeleteBlockedError(failure)) {
        setDeleteBlockedOpen(true);
        return;
      }
      toast.error(describeCrmError(failure));
    }
  };

  const statusFilterActive = statusFilter !== 'ALL';
  const sortActive = sortKey !== 'default';
  const statusChangeIsDeactivate = statusTarget?.status === 'ACTIVE';

  const breadcrumbs = [
    dashboardBreadcrumb,
    { label: 'CRM' },
    { label: 'Service Packages' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Service Packages"
            description="Manage reusable service packages for proposals and quotations."
            className="rounded-none border-0 bg-card shadow-none"
            titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
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
                      className={cn(
                        CRM_PIPELINE_SEARCH_INPUT_CLASS,
                        inputGroupPaddingClass({ leading: true }),
                      )}
                      placeholder="Search packages"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search packages by name, code, or category"
                    />
                  </InputGroup>
                </form>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        'shrink-0',
                        statusFilterActive && 'border-primary/40 bg-primary/5',
                      )}
                      aria-label="Filter packages by status"
                    >
                      <ListFilter aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value as ServicePackageStatusFilter);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="ACTIVE">Active</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="INACTIVE">Inactive</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn('shrink-0', sortActive && 'border-primary/40 bg-primary/5')}
                      aria-label="Sort packages"
                    >
                      <ArrowUpDown aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortKey}
                      onValueChange={(value) => {
                        setSortKey(value as ServicePackageSortKey);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="default">Default order</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name-asc">Name (A–Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name-desc">Name (Z–A)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="price-desc">Highest price</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="price-asc">Lowest price</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="updated-desc">Recently updated</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  onClick={openCreate}
                >
                  <Plus aria-hidden="true" />
                  New package
                </Button>
              </>
            }
          />

          {error && (packages?.length ?? 0) > 0 ? (
            <div className="border-border border-b px-4 sm:px-5">
              <CrmErrorAlert message={error} />
            </div>
          ) : null}

          <div aria-hidden className="table-header-edge" />

          <DataTable
            frame="flush"
            frameClassName="min-h-0"
            headerVariant="plain"
            className="min-w-0 max-w-full gap-0"
            tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
            tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
            phase={tablePhase}
            colSpan={7}
            skeletonColumns={CRM_PACKAGES_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={CRM_PACKAGES_TABLE_COLUMN_CLASS.package}>Package</TableHead>
                <TableHead className={CRM_PACKAGES_TABLE_COLUMN_CLASS.description}>
                  Description
                </TableHead>
                <TableHead
                  className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.pageCount, 'whitespace-nowrap')}
                >
                  Pages count
                </TableHead>
                <TableHead
                  className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.price, 'text-right whitespace-nowrap')}
                >
                  Final price
                </TableHead>
                <TableHead className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.delivery, 'whitespace-nowrap')}>
                  Delivery
                </TableHead>
                <TableHead className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
                  Status
                </TableHead>
                <TableHead
                  className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.actions, 'text-right')}
                >
                  Actions
                </TableHead>
              </TableRow>
            }
            empty={{
              title: emptyTitle,
              description: emptyDescription,
              secondaryAction: filtersActive
                ? { label: 'Clear filters', onClick: clearFilters }
                : undefined,
            }}
            errorMessage={error}
            onRetry={() => void refetch()}
            refreshing={tableRefreshing}
            footer={
              <TablePagination
                className="border-border border-t px-4 py-3 sm:px-5"
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
            {pagedPackages.map((pkg) => {
              const description = pkg.shortDescription.trim() || pkg.detailedDescription.trim();
              return (
                <TableRow key={pkg.id} className="border-0">
                  <TableCell
                    className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.package, 'min-w-0 align-middle')}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-foreground block truncate text-[13px] font-semibold">
                            {pkg.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{pkg.name}</TooltipContent>
                      </Tooltip>
                      <span className="text-muted-foreground block truncate font-mono text-xs">
                        {pkg.code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      CRM_PACKAGES_TABLE_COLUMN_CLASS.description,
                      'min-w-0 whitespace-normal align-middle',
                    )}
                  >
                    {description ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground line-clamp-2 text-sm leading-snug break-words">
                            {description}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm">
                          {description}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      CRM_PACKAGES_TABLE_COLUMN_CLASS.pageCount,
                      'text-muted-foreground align-middle text-left text-sm tabular-nums',
                    )}
                  >
                    {formatPageCount(pkg.pageCount)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      CRM_PACKAGES_TABLE_COLUMN_CLASS.price,
                      'align-middle text-right tabular-nums',
                    )}
                  >
                    {formatMoney(pkg.finalPrice, 'INR')}
                  </TableCell>
                  <TableCell
                    className={cn(
                      CRM_PACKAGES_TABLE_COLUMN_CLASS.delivery,
                      'text-muted-foreground align-middle text-sm whitespace-nowrap',
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate">{formatDeliveryDuration(pkg)}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{formatDeliveryDuration(pkg)}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.status, 'align-middle')}>
                    <ServicePackageStatusBadge status={pkg.status} />
                  </TableCell>
                  <TableCell className={cn(CRM_PACKAGES_TABLE_COLUMN_CLASS.actions, 'min-w-0 align-middle pl-4')}>
                    <ServicePackageActions
                      pkg={pkg}
                      disabled={pending}
                      onToggleStatus={setStatusTarget}
                      onView={(item) => setDetailPackageId(item.id)}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </div>
      </section>

      <ServicePackageFormModal
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={refetch}
      />

      <ServicePackageDetailsModal
        packageId={detailPackageId}
        open={detailPackageId !== null}
        onOpenChange={(open) => !open && setDetailPackageId(null)}
        onEditPackage={(id) => {
          setDetailPackageId(null);
          setEditingId(id);
          setFormOpen(true);
        }}
        onListRefresh={refetch}
      />

      <AlertDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate package?' : 'Activate package?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? statusChangeIsDeactivate
                  ? `Are you sure you want to deactivate "${statusTarget.name}"? This package will no longer be available for new proposal selection.`
                  : `Are you sure you want to activate "${statusTarget.name}"?`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!statusTarget || pending}
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
              {pending ? (
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” (${deleteTarget.code}) will be permanently removed. Existing proposals keep their saved package snapshot.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteTarget || pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteBlockedOpen} onOpenChange={setDeleteBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete package</AlertDialogTitle>
            <AlertDialogDescription>{servicePackageDeleteBlockedMessage()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteBlockedOpen(false)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
