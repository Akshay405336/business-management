'use client';

import { ListFilter, Loader2, Plus, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
  CRM_QUOTATIONS_TABLE_COLUMN_CLASS,
  CRM_QUOTATIONS_TABLE_SKELETON,
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
import { formatDateOnly, formatMoney } from '@/features/admin/crm/utils/format';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';
import { QuotationActions } from '../components/quotation-actions';
import { QuotationFormModal } from '../components/quotation-form-modal';
import { SendQuotationModal } from '../components/send-quotation-modal';
import { QuotationStatusBadge } from '../components/quotation-status-badge';
import { useDeleteQuotation, useQuotations } from '../hooks';
import type { CrmQuotation, QuotationListQuery, QuotationStatus } from '../types/quotation.types';
import { QUOTATION_WORKFLOW_STATUSES } from '../utils/quotation.utils';

const SEARCH_DEBOUNCE_MS = 400;

type TypeFilter = 'ALL' | 'QUOTATION' | 'PROPOSAL';
type StatusFilter = 'ALL' | QuotationStatus;

type QuotationFilters = {
  type: TypeFilter;
  status: StatusFilter;
  issueFrom: string;
  issueTo: string;
};

const emptyFilters = (): QuotationFilters => ({
  type: 'ALL',
  status: 'ALL',
  issueFrom: '',
  issueTo: '',
});

export function QuotationsPage() {
  const toast = useAdminToast();
  const { dashboardBreadcrumb } = usePortalNavigation();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filterDraft, setFilterDraft] = useState<QuotationFilters>(emptyFilters);
  const [filters, setFilters] = useState<QuotationFilters>(emptyFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendQuotationId, setSendQuotationId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CrmQuotation | null>(null);

  const listQuery = useMemo((): Partial<QuotationListQuery> => {
    return {
      page,
      pageSize,
      search: search.trim() || undefined,
      type: filters.type === 'ALL' ? undefined : filters.type,
      status: filters.status === 'ALL' ? undefined : filters.status,
      issueFrom: filters.issueFrom.trim() || undefined,
      issueTo: filters.issueTo.trim() || undefined,
    };
  }, [filters, page, pageSize, search]);

  const { items, total, loading, error, refetch } = useQuotations({ query: listQuery });
  const { deleteQuotation, pending: deletePending } = useDeleteQuotation();

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

  const filtersActive =
    search.trim().length > 0 ||
    filters.type !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.issueFrom.trim().length > 0 ||
    filters.issueTo.trim().length > 0;

  const searchActive = search.trim().length > 0;
  const filterMenuActive =
    filters.type !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.issueFrom.trim().length > 0 ||
    filters.issueTo.trim().length > 0;

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: items.length });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const emptyTitle = searchActive
    ? 'No quotations match your search.'
    : filtersActive
      ? 'No quotations match your filters'
      : 'No quotations yet';

  const emptyDescription = searchActive
    ? 'Try different search terms or clear filters to see all quotations.'
    : filtersActive
      ? 'Try different filters or clear them to see all quotations.'
      : 'Add a quotation with client details and line items.';

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (quotation: CrmQuotation) => {
    setEditingId(quotation.id);
    setSendOpen(false);
    setFormOpen(true);
  };

  const openSend = (quotation: CrmQuotation) => {
    setSendQuotationId(quotation.id);
    setSendOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteQuotation(target.id);
      toast.success(`Quotation "${target.documentNumber}" deleted.`);
      if (sendQuotationId === target.id) {
        setSendOpen(false);
        setSendQuotationId(null);
      }
      refetch();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const clearFilters = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchDraft('');
    setSearch('');
    const cleared = emptyFilters();
    setFilterDraft(cleared);
    setFilters(cleared);
    setPage(1);
  };

  const applyDateFilters = () => {
    setFilters((current) => ({
      ...current,
      issueFrom: filterDraft.issueFrom,
      issueTo: filterDraft.issueTo,
    }));
    setPage(1);
  };

  const breadcrumbs = [dashboardBreadcrumb, { label: 'CRM' }, { label: 'Quotations' }] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Quotations"
            description="Manage client quotations and pricing."
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
                      placeholder="Search quotations"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search quotations by number, title, or client"
                    />
                  </InputGroup>
                </form>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            'shrink-0',
                            filterMenuActive && 'border-primary/40 bg-primary/5',
                          )}
                          aria-label="Filter quotations"
                        >
                          <ListFilter aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Filter</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Document type</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={filters.type}
                      onValueChange={(value) => {
                        const type = value as TypeFilter;
                        setFilters((current) => ({ ...current, type }));
                        setFilterDraft((current) => ({ ...current, type }));
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All types</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="QUOTATION">Quotation</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="PROPOSAL">Legacy proposal</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={filters.status}
                      onValueChange={(value) => {
                        const status = value as StatusFilter;
                        setFilters((current) => ({ ...current, status }));
                        setFilterDraft((current) => ({ ...current, status }));
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                      {QUOTATION_WORKFLOW_STATUSES.map((status) => (
                        <DropdownMenuRadioItem key={status} value={status}>
                          {status === 'DRAFT'
                            ? 'Draft'
                            : status === 'SENT'
                              ? 'Sent'
                              : 'Expired'}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Issue date range</DropdownMenuLabel>
                    <div className="grid gap-2 px-2 py-1.5">
                      <Input
                        type="date"
                        className="h-9"
                        value={filterDraft.issueFrom}
                        onChange={(event) =>
                          setFilterDraft((current) => ({
                            ...current,
                            issueFrom: event.target.value,
                          }))
                        }
                        aria-label="Issue date from"
                      />
                      <Input
                        type="date"
                        className="h-9"
                        value={filterDraft.issueTo}
                        onChange={(event) =>
                          setFilterDraft((current) => ({
                            ...current,
                            issueTo: event.target.value,
                          }))
                        }
                        aria-label="Issue date to"
                      />
                      <Button type="button" size="sm" className="h-8" onClick={applyDateFilters}>
                        Apply dates
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  onClick={openCreate}
                >
                  <Plus aria-hidden="true" />
                  Add quotation
                </Button>
              </>
            }
          />

          {error && items.length > 0 ? (
            <div className="border-border border-b px-4 sm:px-5">
              <CrmErrorAlert message={error} />
            </div>
          ) : null}

          <div aria-hidden className="table-header-edge" />

          <DataTable
            frame="flush"
            headerVariant="plain"
            className="min-w-0 max-w-full gap-0"
            tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
            tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
            phase={tablePhase}
            colSpan={8}
            skeletonColumns={CRM_QUOTATIONS_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.number}>
                  Quotation Number
                </TableHead>
                <TableHead className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.title}>Quotation</TableHead>
                <TableHead className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.client}>Client</TableHead>
                <TableHead className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.issueDate}>
                  Issue Date
                </TableHead>
                <TableHead className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.expiryDate}>
                  Valid Until
                </TableHead>
                <TableHead
                  className={cn(CRM_QUOTATIONS_TABLE_COLUMN_CLASS.total, 'text-right')}
                >
                  Total
                </TableHead>
                <TableHead className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.status}>Status</TableHead>
                <TableHead
                  className={cn(CRM_QUOTATIONS_TABLE_COLUMN_CLASS.actions, 'text-right')}
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
            onRetry={() => refetch()}
            refreshing={tableRefreshing}
            footer={
              <TablePagination
                className="border-border border-t px-4 py-3 sm:px-5"
                page={page}
                pageSize={pageSize}
                total={total}
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
            {items.map((quotation) => (
              <TableRow key={quotation.id} className="border-0">
                <TableCell className={cn(CRM_QUOTATIONS_TABLE_COLUMN_CLASS.number, 'min-w-0')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-foreground block truncate font-mono text-[13px] font-semibold">
                        {quotation.documentNumber}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{quotation.documentNumber}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_QUOTATIONS_TABLE_COLUMN_CLASS.title, 'min-w-0')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-foreground block truncate text-[13px] font-semibold">
                        {quotation.title}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{quotation.title}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_QUOTATIONS_TABLE_COLUMN_CLASS.client, 'min-w-0 text-sm')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-foreground block truncate">{quotation.clientName}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{quotation.clientName}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell
                  className={cn(
                    CRM_QUOTATIONS_TABLE_COLUMN_CLASS.issueDate,
                    'text-muted-foreground whitespace-nowrap text-sm',
                  )}
                >
                  {formatDateOnly(quotation.issueDate)}
                </TableCell>
                <TableCell
                  className={cn(
                    CRM_QUOTATIONS_TABLE_COLUMN_CLASS.expiryDate,
                    'text-muted-foreground whitespace-nowrap text-sm',
                  )}
                >
                  {quotation.expiryDate ? formatDateOnly(quotation.expiryDate) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    CRM_QUOTATIONS_TABLE_COLUMN_CLASS.total,
                    'min-w-0 text-right text-sm',
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-foreground block truncate font-semibold tabular-nums">
                        {formatMoney(quotation.grandTotal, quotation.currency)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {formatMoney(quotation.grandTotal, quotation.currency)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={CRM_QUOTATIONS_TABLE_COLUMN_CLASS.status}>
                  <QuotationStatusBadge status={quotation.status} />
                </TableCell>
                <TableCell className={cn(CRM_QUOTATIONS_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
                  <QuotationActions
                    quotation={quotation}
                    disabled={deletePending}
                    onSend={openSend}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </div>
      </section>

      <QuotationFormModal
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={() => {
          refetch();
        }}
      />

      <SendQuotationModal
        open={sendOpen}
        quotationId={sendQuotationId}
        onOpenChange={setSendOpen}
        onSent={() => {
          refetch();
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Permanently delete ${deleteTarget.documentNumber} (${deleteTarget.title})? This cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              {deletePending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
