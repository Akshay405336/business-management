'use client';

import type { LeaveTypeItem } from '@techwin/contracts';
import {
  ArrowUpDown,
  Download,
  ListFilter,
  Loader2,
  Plus,
  Search,
  SquarePen,
  ToggleLeft,
  ToggleRight,
  Trash2,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS,
  CRM_LEAVE_TYPES_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_HEADER_SEARCH_FORM_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import {
  CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS,
  CRM_PIPELINE_SEARCH_INPUT_CLASS,
  CRM_PIPELINE_STATUS_ACTION_CLASS,
} from '@/features/admin/crm/constants';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';
import { LeaveTypeFormDialog } from '../components/leave-type-form-dialog';
import {
  useChangeLeaveTypeStatus,
  useDeleteLeaveType,
  useLeaveTypes,
} from '../hooks';
import {
  isLeaveTypeDeleteBlockedError,
  leaveTypeDeleteBlockedMessage,
  leaveTypeDependencyCountsFromError,
  type LeaveTypeDependencyCounts,
} from '../utils/leave-type-delete-messages';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type KindFilter = 'ALL' | 'PAID' | 'UNPAID';
type LeaveTypeSortKey = 'default' | 'name-asc' | 'name-desc' | 'code-asc' | 'code-desc';

const SEARCH_DEBOUNCE_MS = 400;
const LIST_PAGE_SIZE = 100;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadLeaveTypesCsv(items: readonly LeaveTypeItem[], filename = 'leave-types.csv') {
  const headers = ['Leave Type', 'Code', 'Paid/Unpaid', 'Status'];
  const rows = items.map((row) =>
    [
      escapeCsvCell(row.name),
      escapeCsvCell(row.code),
      row.kind === 'PAID' ? 'Paid' : 'Unpaid',
      row.status,
    ].join(','),
  );
  const content = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sortLeaveTypes(items: LeaveTypeItem[], sortKey: LeaveTypeSortKey): LeaveTypeItem[] {
  const next = [...items];
  switch (sortKey) {
    case 'name-desc':
      return next.sort((a, b) => b.name.localeCompare(a.name));
    case 'code-asc':
      return next.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
    case 'code-desc':
      return next.sort((a, b) => b.code.localeCompare(a.code) || a.name.localeCompare(b.name));
    case 'name-asc':
    default:
      return next.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function LeaveTypesPage() {
  const toast = useAdminToast();
  const { dashboardBreadcrumb } = usePortalNavigation();
  const { changeLeaveTypeStatus, pending: statusPending } = useChangeLeaveTypeStatus();
  const { deleteLeaveType, pending: deletePending } = useDeleteLeaveType();
  const pending = statusPending || deletePending;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [kindFilter, setKindFilter] = useState<KindFilter>('ALL');
  const [sortKey, setSortKey] = useState<LeaveTypeSortKey>('default');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveTypeItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<LeaveTypeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeItem | null>(null);
  const [deleteBlockedTarget, setDeleteBlockedTarget] = useState<{
    name: string;
    counts: LeaveTypeDependencyCounts;
  } | null>(null);

  const { leaveTypes, loading, error, refetch } = useLeaveTypes({
    query: {
      page: 1,
      pageSize: LIST_PAGE_SIZE,
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      kind: kindFilter === 'ALL' ? undefined : kindFilter,
    },
  });

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
  }, [statusFilter, kindFilter, sortKey]);

  const sortedFiltered = useMemo(
    () => sortLeaveTypes([...(leaveTypes ?? [])], sortKey),
    [leaveTypes, sortKey],
  );

  const hasAnyItems = (leaveTypes?.length ?? 0) > 0;
  const searchActive = search.trim().length > 0;
  const dropdownFiltersActive = statusFilter !== 'ALL' || kindFilter !== 'ALL';
  const filtersActive = dropdownFiltersActive || searchActive;
  const sortActive = sortKey !== 'default';
  const totalItems = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, pageSize, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: hasAnyItems ? sortedFiltered.length : 0,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: sortedFiltered.length });
  const statusChangeIsDeactivate = statusTarget?.status === 'ACTIVE';

  const emptyTitle = searchActive
    ? 'No leave types match your search.'
    : filtersActive
      ? 'No leave types match your filters'
      : 'No leave types yet';

  const emptyDescription = searchActive
    ? 'Try different search terms or clear filters to see all leave types.'
    : filtersActive
      ? 'Try different filters or clear them to see all leave types.'
      : 'Create leave types before configuring yearly allocations.';

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setKindFilter('ALL');
    setPage(1);
  };

  const handleExport = () => {
    if (sortedFiltered.length === 0) {
      toast.error('No leave types to export.');
      return;
    }
    downloadLeaveTypesCsv(sortedFiltered);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: LeaveTypeItem) => {
    setEditing(row);
    setFormOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const row = statusTarget;
    const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusTarget(null);
    try {
      await changeLeaveTypeStatus(row.id, next);
      toast.success(next === 'ACTIVE' ? 'Leave type activated.' : 'Leave type deactivated.');
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
      await deleteLeaveType(target.id);
      toast.success(`Leave type "${target.name}" deleted.`);
      refetch();
    } catch (failure) {
      if (isLeaveTypeDeleteBlockedError(failure)) {
        setDeleteBlockedTarget({
          name: target.name,
          counts: leaveTypeDependencyCountsFromError(failure),
        });
        return;
      }
      toast.error(describeCrmError(failure));
    }
  };

  const breadcrumbs = [
    dashboardBreadcrumb,
    { label: 'Human Resources' },
    { label: 'Leave Types' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Leave Types"
            description="Define paid and unpaid leave categories for your organization."
            className="rounded-none border-0 bg-card shadow-none"
            descriptionTruncate
            titleSectionClassName="basis-auto sm:max-w-none lg:max-w-[min(100%,28rem)] xl:max-w-[min(100%,32rem)]"
            headerRowClassName="items-center"
            toolbarRowClassName="shrink-0 flex-nowrap"
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
                      placeholder="Search leave types"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search leave types"
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
                            dropdownFiltersActive && 'border-primary/40 bg-primary/5',
                          )}
                          aria-label="Filter leave types"
                        >
                          <ListFilter aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Filter</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value as StatusFilter);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="ACTIVE">Active</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="INACTIVE">Inactive</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuLabel>Type</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={kindFilter}
                      onValueChange={(value) => {
                        setKindFilter(value as KindFilter);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="ALL">All types</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="PAID">Paid</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="UNPAID">Unpaid</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
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
                          aria-label="Sort leave types"
                        >
                          <ArrowUpDown aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Sort</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortKey}
                      onValueChange={(value) => {
                        setSortKey(value as LeaveTypeSortKey);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="default">Default order</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name-asc">Name (A–Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name-desc">Name (Z–A)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="code-asc">Code (A–Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="code-desc">Code (Z–A)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-input h-9 shrink-0 border bg-neutral-100 text-foreground shadow-none hover:bg-neutral-200/80"
                  onClick={handleExport}
                >
                  <Download aria-hidden="true" />
                  Export
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                  onClick={openCreate}
                >
                  <Plus aria-hidden="true" />
                  Add leave type
                </Button>
              </>
            }
          />

          {error && (leaveTypes?.length ?? 0) > 0 ? (
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
            colSpan={5}
            skeletonColumns={CRM_LEAVE_TYPES_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.name}>Leave Type</TableHead>
                <TableHead className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.code}>Code</TableHead>
                <TableHead className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.paid, 'whitespace-nowrap')}>
                  Paid/Unpaid
                </TableHead>
                <TableHead className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
                  Status
                </TableHead>
                <TableHead className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.actions, 'text-right')}>
                  Actions
                </TableHead>
              </TableRow>
            }
            empty={{
              title: emptyTitle,
              description: emptyDescription,
              secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
            }}
            errorMessage={error}
            onRetry={() => refetch()}
            refreshing={tableRefreshing}
            footer={
              <TablePagination
                className="border-border border-t px-4 py-3 sm:px-5"
                page={safePage}
                pageSize={pageSize}
                total={totalItems}
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
            {pagedItems.map((row) => (
              <TableRow key={row.id} className="border-0">
                <TableCell className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.name, 'min-w-0')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-foreground block truncate text-[13px] font-semibold">
                        {row.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{row.name}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.code}>
                  <span className="text-muted-foreground font-mono text-sm">{row.code}</span>
                </TableCell>
                <TableCell className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.paid}>
                  {row.kind === 'PAID' ? 'Paid' : 'Unpaid'}
                </TableCell>
                <TableCell className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.status, 'text-left')}>
                  {row.status === 'ACTIVE' ? (
                    <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
                  <div className="flex w-full shrink-0 items-center justify-end gap-1">
                    <TableIconButton
                      label={`Edit ${row.name}`}
                      tone="default"
                      className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                      disabled={pending}
                      onClick={() => openEdit(row)}
                    >
                      <SquarePen className="size-4" aria-hidden="true" />
                    </TableIconButton>
                    <TableIconButton
                      label={
                        row.status === 'ACTIVE'
                          ? `Deactivate ${row.name}`
                          : `Activate ${row.name}`
                      }
                      tone="default"
                      className={
                        row.status === 'ACTIVE'
                          ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                          : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                      }
                      disabled={pending}
                      onClick={() => setStatusTarget(row)}
                    >
                      {row.status === 'ACTIVE' ? (
                        <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                      ) : (
                        <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                      )}
                    </TableIconButton>
                    <TableIconButton
                      label={`Delete ${row.name}`}
                      tone="default"
                      className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black disabled:opacity-100 disabled:hover:bg-transparent"
                      disabled={pending}
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </TableIconButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </div>
      </section>

      <LeaveTypeFormDialog
        open={formOpen}
        editing={editing}
        onOpenChange={setFormOpen}
        onSaved={refetch}
      />

      <AlertDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate leave type?' : 'Activate leave type?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? statusChangeIsDeactivate
                  ? `“${statusTarget.name}” will be marked inactive. Existing leave requests stay on record, but employees will not be able to select it for new applications until you activate it again.`
                  : `“${statusTarget.name}” will be marked active and available for new leave applications.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!statusTarget || pending}
              className={statusChangeIsDeactivate ? CRM_PIPELINE_STATUS_ACTION_CLASS : undefined}
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

      <AlertDialog
        open={deleteBlockedTarget !== null}
        onOpenChange={(open) => !open && setDeleteBlockedTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBlockedTarget ? leaveTypeDeleteBlockedMessage(deleteBlockedTarget.counts) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteBlockedTarget(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be permanently removed. This action cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteTarget || pending}
              className={CRM_PIPELINE_DESTRUCTIVE_ACTION_CLASS}
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
    </div>
  );
}
