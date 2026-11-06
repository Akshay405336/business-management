'use client';

import {
  ArrowUpDown,
  ListFilter,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  CRM_CLIENTS_TABLE_COLUMN_CLASS,
  CRM_CLIENTS_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CLIENT_STATUSES, CLIENT_TYPES } from '@/features/admin/crm/constants';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_HEADER_SEARCH_FORM_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { labelClientType } from '@/features/admin/crm/utils/labels';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';
import { ClientActions } from '../components/client-actions';
import { ClientDetailsModal } from '../components/client-details-modal';
import { ClientFormModal } from '../components/client-form-modal';
import { ClientStatusBadge } from '../components/client-status-badge';
import {
  useChangeClientStatus,
  useClients,
  useDeleteClient,
} from '../hooks';
import type { ClientListQuery, CrmClient } from '../types/client.types';
import {
  clientDeleteBlockedMessage,
  isClientDeleteBlockedError,
} from '../utils/client-delete-messages';
import { sortKeyToListQuery, type ClientSortKey, type ClientStatusFilter, type ClientTypeFilter } from '../utils/client.utils';

const SEARCH_DEBOUNCE_MS = 400;

type ClientDateFilters = {
  createdFrom: string;
  createdTo: string;
};

const emptyDateFilters = (): ClientDateFilters => ({
  createdFrom: '',
  createdTo: '',
});

export function ClientsPage() {
  const toast = useAdminToast();
  const searchParams = useSearchParams();
  const { dashboardBreadcrumb } = usePortalNavigation();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<ClientTypeFilter>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortKey, setSortKey] = useState<ClientSortKey>('default');
  const [dateFilterDraft, setDateFilterDraft] = useState<ClientDateFilters>(emptyDateFilters);
  const [dateFilters, setDateFilters] = useState<ClientDateFilters>(emptyDateFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CrmClient | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<CrmClient | null>(null);

  const listQuery = useMemo((): Partial<ClientListQuery> => {
    const sortParams = sortKeyToListQuery(sortKey);
    return {
      page,
      pageSize,
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      includeArchived: includeArchived || undefined,
      createdFrom: dateFilters.createdFrom.trim() || undefined,
      createdTo: dateFilters.createdTo.trim() || undefined,
      ...sortParams,
    };
  }, [
    dateFilters.createdFrom,
    dateFilters.createdTo,
    includeArchived,
    page,
    pageSize,
    search,
    sortKey,
    statusFilter,
    typeFilter,
  ]);

  const { clients, total, loading, error, refetch } = useClients({ query: listQuery });
  const { changeClientStatus, pending: statusPending } = useChangeClientStatus();
  const { deleteClient, pending: deletePending } = useDeleteClient();
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

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (!clientId) return;
    setDetailClientId(clientId);
    setDetailsOpen(true);
  }, [searchParams]);

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    includeArchived ||
    dateFilters.createdFrom.trim().length > 0 ||
    dateFilters.createdTo.trim().length > 0;

  const searchActive = search.trim().length > 0;
  const filterMenuActive =
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    includeArchived ||
    dateFilters.createdFrom.trim().length > 0 ||
    dateFilters.createdTo.trim().length > 0;

  const sortActive = sortKey !== 'default';

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: clients.length });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: clients.length });

  const emptyTitle = searchActive
    ? 'No clients match your search.'
    : filtersActive
      ? 'No clients match your filters'
      : 'No clients yet';

  const emptyDescription = searchActive
    ? 'Try different search terms or clear filters to see all clients.'
    : filtersActive
      ? 'Try different filters or clear them to see all clients.'
      : 'Add a client to manage contacts, billing details, and quotations.';

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (client: CrmClient) => {
    setEditingId(client.id);
    setFormOpen(true);
  };

  const openDetails = (client: CrmClient) => {
    setDetailClientId(client.id);
    setDetailsOpen(true);
  };

  const clearFilters = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setIncludeArchived(false);
    setSortKey('default');
    const cleared = emptyDateFilters();
    setDateFilterDraft(cleared);
    setDateFilters(cleared);
    setPage(1);
  };

  const applyDateFilters = () => {
    setDateFilters({
      createdFrom: dateFilterDraft.createdFrom,
      createdTo: dateFilterDraft.createdTo,
    });
    setPage(1);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const client = statusTarget;
    const next = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusTarget(null);
    try {
      await changeClientStatus(client.id, next);
      toast.success(next === 'ACTIVE' ? 'Client activated.' : 'Client deactivated.');
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
      await deleteClient(target.id);
      toast.success(`Client "${target.name}" permanently deleted.`);
      if (detailClientId === target.id) {
        setDetailsOpen(false);
        setDetailClientId(null);
      }
      if (editingId === target.id) {
        setFormOpen(false);
        setEditingId(null);
      }
      refetch();
    } catch (failure) {
      if (isClientDeleteBlockedError(failure)) {
        setDeleteBlockedMessage(clientDeleteBlockedMessage(failure));
        return;
      }
      toast.error(describeCrmError(failure));
    }
  };

  const statusChangeIsDeactivate = statusTarget?.status === 'ACTIVE';

  const breadcrumbs = [dashboardBreadcrumb, { label: 'CRM' }, { label: 'Clients' }] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Clients"
            description="Manage your clients and business relationships."
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
                      placeholder="Search clients"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search clients by name, code, email, phone, or contact"
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
                          className={cn('shrink-0', filterMenuActive && 'border-primary/40 bg-primary/5')}
                          aria-label="Filter clients"
                        >
                          <ListFilter aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Filter</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value as ClientStatusFilter);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                      {CLIENT_STATUSES.map((status) => (
                        <DropdownMenuRadioItem key={status} value={status}>
                          {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Client type</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={typeFilter}
                      onValueChange={(value) => {
                        setTypeFilter(value as ClientTypeFilter);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All types</DropdownMenuRadioItem>
                      {CLIENT_TYPES.map((type) => (
                        <DropdownMenuRadioItem key={type} value={type}>
                          {labelClientType(type)}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Archived</DropdownMenuLabel>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Checkbox
                        id="clients-include-archived"
                        checked={includeArchived}
                        onCheckedChange={(checked) => {
                          setIncludeArchived(checked === true);
                          setPage(1);
                        }}
                      />
                      <label htmlFor="clients-include-archived" className="text-sm">
                        Include archived clients
                      </label>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Created date range</DropdownMenuLabel>
                    <div className="grid gap-2 px-2 py-1.5">
                      <Input
                        type="date"
                        className="h-9"
                        value={dateFilterDraft.createdFrom}
                        onChange={(event) =>
                          setDateFilterDraft((current) => ({
                            ...current,
                            createdFrom: event.target.value,
                          }))
                        }
                        aria-label="Created from"
                      />
                      <Input
                        type="date"
                        className="h-9"
                        value={dateFilterDraft.createdTo}
                        onChange={(event) =>
                          setDateFilterDraft((current) => ({
                            ...current,
                            createdTo: event.target.value,
                          }))
                        }
                        aria-label="Created to"
                      />
                      <Button type="button" size="sm" className="h-8" onClick={applyDateFilters}>
                        Apply dates
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn('shrink-0', sortActive && 'border-primary/40 bg-primary/5')}
                          aria-label="Sort clients"
                        >
                          <ArrowUpDown aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Sort</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortKey}
                      onValueChange={(value) => {
                        setSortKey(value as ClientSortKey);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="default">Recently created</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name-asc">Name (A–Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name-desc">Name (Z–A)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="code-asc">Client code (A–Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="code-desc">Client code (Z–A)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="created-asc">Oldest first</DropdownMenuRadioItem>
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
                  Add client
                </Button>
              </>
            }
          />

          {error && clients.length > 0 ? (
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
            colSpan={6}
            skeletonColumns={CRM_CLIENTS_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={CRM_CLIENTS_TABLE_COLUMN_CLASS.name}>Client name</TableHead>
                <TableHead className={CRM_CLIENTS_TABLE_COLUMN_CLASS.type}>Type</TableHead>
                <TableHead className={CRM_CLIENTS_TABLE_COLUMN_CLASS.email}>Email</TableHead>
                <TableHead className={CRM_CLIENTS_TABLE_COLUMN_CLASS.phone}>Phone</TableHead>
                <TableHead className={CRM_CLIENTS_TABLE_COLUMN_CLASS.status}>Status</TableHead>
                <TableHead className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.actions, 'text-right')}>
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
            {clients.map((client) => (
              <TableRow key={client.id} className="border-0">
                <TableCell className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.name, 'min-w-0 align-middle')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-foreground hover:text-primary block max-w-full truncate text-left text-sm font-medium"
                        onClick={() => openDetails(client)}
                      >
                        {client.name}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{client.name}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.type, 'min-w-0 align-middle')}>
                  <span className="block break-words">{labelClientType(client.type)}</span>
                </TableCell>
                <TableCell className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.email, 'min-w-0 align-middle')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block break-words">{client.email?.trim() || '—'}</span>
                    </TooltipTrigger>
                    {client.email ? (
                      <TooltipContent side="top" className="max-w-sm break-words">
                        {client.email}
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.phone, 'min-w-0 align-middle')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block break-words">{client.phone?.trim() || '—'}</span>
                    </TooltipTrigger>
                    {client.phone?.trim() ? (
                      <TooltipContent side="top" className="max-w-xs break-words">
                        {client.phone}
                      </TooltipContent>
                    ) : null}
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.status, 'align-middle')}>
                  <ClientStatusBadge status={client.status} />
                </TableCell>
                <TableCell className={cn(CRM_CLIENTS_TABLE_COLUMN_CLASS.actions, 'align-middle')}>
                  <ClientActions
                    client={client}
                    disabled={pending}
                    onView={openDetails}
                    onEdit={openEdit}
                    onToggleStatus={setStatusTarget}
                    onDelete={setDeleteTarget}
                  />
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </div>
      </section>

      <ClientFormModal
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={() => refetch()}
      />

      <ClientDetailsModal
        clientId={detailClientId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={(id) => {
          setEditingId(id);
          setFormOpen(true);
        }}
        onUpdated={() => refetch()}
      />

      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate client?' : 'Activate client?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? statusChangeIsDeactivate
                  ? `"${statusTarget.name}" will be marked inactive.`
                  : `"${statusTarget.name}" will be marked active.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void confirmStatusChange()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently delete "${deleteTarget.name}" (${deleteTarget.referenceNumber}). Deletion is blocked when projects, quotations, converted leads, or WhatsApp contacts still reference this client.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteBlockedMessage)}
        onOpenChange={(open) => !open && setDeleteBlockedMessage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Client cannot be deleted</AlertDialogTitle>
            <AlertDialogDescription>{deleteBlockedMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteBlockedMessage(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
