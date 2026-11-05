'use client';

import type { LeaveTypeItem } from '@techwin/contracts';
import {
  ArrowUpDown,
  Download,
  Eye,
  ListFilter,
  Loader2,
  Plus,
  Search,
  SquarePen,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { deleteLeaveType, listLeaveTypes, updateLeaveType } from '@/features/leave/api/leave-api';
import { isAbortError } from '@/shared/lib/abort-error';
import { cn } from '@/shared/lib/utils';
import { LeaveTypeFormDialog } from './leave-type-form-dialog';
import { LeaveTypeViewDialog } from './leave-type-view-dialog';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type PaidFilter = 'ALL' | 'PAID' | 'UNPAID';
type YesNoFilter = 'ALL' | 'YES' | 'NO';
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
  const headers = ['Name', 'Code', 'Paid', 'Attachment', 'Status'];
  const rows = items.map((row) =>
    [
      escapeCsvCell(row.name),
      escapeCsvCell(row.code),
      row.isPaid ? 'Paid' : 'Unpaid',
      row.attachmentRequired ? 'Yes' : 'No',
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

function applyClientFilters(
  items: readonly LeaveTypeItem[],
  paidFilter: PaidFilter,
  attachmentFilter: YesNoFilter,
): LeaveTypeItem[] {
  return items.filter((row) => {
    if (paidFilter === 'PAID' && !row.isPaid) return false;
    if (paidFilter === 'UNPAID' && row.isPaid) return false;
    if (attachmentFilter === 'YES' && !row.attachmentRequired) return false;
    if (attachmentFilter === 'NO' && row.attachmentRequired) return false;
    return true;
  });
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
      return next.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return next.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function AdminLeaveTypesWorkspace() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { dashboardBreadcrumb } = usePortalNavigation();

  const [allItems, setAllItems] = useState<readonly LeaveTypeItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('ALL');
  const [attachmentFilter, setAttachmentFilter] = useState<YesNoFilter>('ALL');
  const [sortKey, setSortKey] = useState<LeaveTypeSortKey>('default');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveTypeItem | null>(null);
  const [viewItem, setViewItem] = useState<LeaveTypeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeItem | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await listLeaveTypes(
        {
          page: 1,
          pageSize: LIST_PAGE_SIZE,
          search: search.trim() || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          includeInactive: statusFilter === 'ALL' ? true : undefined,
        },
        signal,
      );
      setAllItems(res.items);
      setError(null);
    } catch (failure) {
      if (isAbortError(failure)) return;
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
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
  }, [statusFilter, paidFilter, attachmentFilter, sortKey]);

  const sortedFiltered = useMemo(() => {
    const base = allItems ?? [];
    const filtered = applyClientFilters(base, paidFilter, attachmentFilter);
    return sortLeaveTypes(filtered, sortKey);
  }, [allItems, paidFilter, attachmentFilter, sortKey]);

  const hasAnyItems = (allItems?.length ?? 0) > 0;
  const searchActive = search.trim().length > 0;
  const dropdownFiltersActive =
    statusFilter !== 'ALL' || paidFilter !== 'ALL' || attachmentFilter !== 'ALL';
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
    setPaidFilter('ALL');
    setAttachmentFilter('ALL');
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

  const toggleStatus = async (row: LeaveTypeItem) => {
    const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => updateLeaveType(row.id, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Leave type activated.' : 'Leave type deactivated.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteLeaveType(target.id));
      toast.success('Leave type deleted.');
      await load();
    } catch (failure) {
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
            description="Manage leave categories, eligibility and leave policies for your organization."
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
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                    >
                      <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="ACTIVE">Active</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="INACTIVE">Inactive</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Paid / unpaid</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={paidFilter}
                      onValueChange={(value) => setPaidFilter(value as PaidFilter)}
                    >
                      <DropdownMenuRadioItem value="ALL">All</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="PAID">Paid</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="UNPAID">Unpaid</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Attachment required</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={attachmentFilter}
                      onValueChange={(value) => setAttachmentFilter(value as YesNoFilter)}
                    >
                      <DropdownMenuRadioItem value="ALL">All</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="YES">Yes</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="NO">No</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    {dropdownFiltersActive ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-muted-foreground"
                          onSelect={(event) => {
                            event.preventDefault();
                            clearFilters();
                          }}
                        >
                          Clear filters
                        </DropdownMenuItem>
                      </>
                    ) : null}
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
                      onValueChange={(value) => setSortKey(value as LeaveTypeSortKey)}
                    >
                      <DropdownMenuRadioItem value="default">Name (A–Z)</DropdownMenuRadioItem>
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
                  Add Leave Type
                </Button>
              </>
            }
          />

          {error && (allItems?.length ?? 0) > 0 ? (
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
            skeletonColumns={CRM_LEAVE_TYPES_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.name}>Leave type</TableHead>
                <TableHead className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.code}>Code</TableHead>
                <TableHead className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.paid, 'whitespace-nowrap')}>
                  Paid / unpaid
                </TableHead>
                <TableHead className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.attachment}>
                  Attachment
                </TableHead>
                <TableHead className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
                  Status
                </TableHead>
                <TableHead
                  className={cn(CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.actions, 'text-right')}
                >
                  Actions
                </TableHead>
              </TableRow>
            }
            empty={{
              title: emptyTitle,
              description: emptyDescription,
              action: !filtersActive
                ? { label: 'Add Leave Type', onClick: openCreate }
                : undefined,
              secondaryAction: filtersActive
                ? { label: 'Clear filters', onClick: clearFilters }
                : undefined,
            }}
            errorMessage={error}
            onRetry={() => void load()}
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
                <TableCell className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.code}>{row.code}</TableCell>
                <TableCell className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.paid}>
                  <Badge variant="outline" className="font-normal">
                    {row.isPaid ? 'Paid' : 'Unpaid'}
                  </Badge>
                </TableCell>
                <TableCell className={CRM_LEAVE_TYPES_TABLE_COLUMN_CLASS.attachment}>
                  {row.attachmentRequired ? 'Yes' : 'No'}
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
                    <TableIconButton label={`View ${row.name}`} onClick={() => setViewItem(row)}>
                      <Eye className="size-4" aria-hidden="true" />
                    </TableIconButton>
                    <TableIconButton
                      label={`Edit ${row.name}`}
                      tone="primary"
                      onClick={() => {
                        setEditing(row);
                        setFormOpen(true);
                      }}
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
                      onClick={() => void toggleStatus(row)}
                    >
                      {row.status === 'ACTIVE' ? (
                        <ToggleRight className="size-4" aria-hidden="true" />
                      ) : (
                        <ToggleLeft className="size-4" aria-hidden="true" />
                      )}
                    </TableIconButton>
                    <TableIconButton
                      label={`Delete ${row.name}`}
                      tone="danger"
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
        onSaved={() => load()}
      />

      <LeaveTypeViewDialog
        open={viewItem !== null}
        item={viewItem}
        onOpenChange={(open) => {
          if (!open) setViewItem(null);
        }}
        onEdit={() => {
          if (!viewItem) return;
          setEditing(viewItem);
          setViewItem(null);
          setFormOpen(true);
        }}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave type?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Permanently delete "${deleteTarget.name}" only if it has no balances or requests. Otherwise deactivate it.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
