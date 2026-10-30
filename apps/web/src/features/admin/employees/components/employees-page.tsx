'use client';

import { employeeListQuerySchema } from '@techwin/validation';
import {
  Briefcase,
  ListFilter,
  Plus,
  Search,
  SquarePen,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
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
  CRM_EMPLOYEES_TABLE_COLUMN_CLASS,
  CRM_EMPLOYEES_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { cn } from '@/shared/lib/utils';
import { changeEmployeeStatus, deleteEmployee, listEmployees } from '../api/employees';
import { DEFAULT_EMPLOYEE_PAGE_SIZE, EMPLOYEE_EMPLOYMENT_TYPES, EMPLOYEE_STATUSES } from '../constants';
import type {
  EmployeeEmploymentStatus,
  EmployeeEmploymentType,
  EmployeeListItem,
  EmployeeListQuery,
} from '../types';
import { describeEmployeeError } from '../utils/errors';
import { labelEmploymentType, labelEmployeeStatus } from '../utils/labels';
import { EmployeeAvatar } from './employee-avatar';
import { EmployeeDetailDialog } from './employee-detail-dialog';
import { EmployeeFormDialog } from './employee-form-dialog';

const SEARCH_DEBOUNCE_MS = 400;

function employeeStatusBadgeClass(status: EmployeeEmploymentStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10';
    case 'INACTIVE':
      return 'border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10';
    case 'ON_LEAVE':
      return 'border-transparent bg-amber-600/10 text-amber-800 hover:bg-amber-600/10';
    case 'TERMINATED':
      return 'border-transparent bg-neutral-500/10 text-neutral-700 hover:bg-neutral-500/10';
    default:
      return 'border-transparent bg-neutral-500/10 text-neutral-700 hover:bg-neutral-500/10';
  }
}

export function EmployeesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const [items, setItems] = useState<readonly EmployeeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_EMPLOYEE_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeEmploymentStatus>('ALL');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<'ALL' | EmployeeEmploymentType>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const query = useMemo((): EmployeeListQuery => {
    const candidate: EmployeeListQuery = {
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      employmentType: employmentTypeFilter === 'ALL' ? undefined : employmentTypeFilter,
      page,
      pageSize,
      sortBy: 'displayName',
      sortDir: 'asc',
    };
    return employeeListQuerySchema.parse(candidate);
  }, [search, statusFilter, employmentTypeFilter, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listEmployees(query);
      setItems(response.items);
      setTotal(response.total);
    } catch (failure) {
      setError(describeEmployeeError(failure));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, employmentTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statusFilterActive = statusFilter !== 'ALL';
  const typeFilterActive = employmentTypeFilter !== 'ALL';
  const filtersActive =
    search.trim().length > 0 || statusFilterActive || typeFilterActive;

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setEmploymentTypeFilter('ALL');
    setPage(1);
  };

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: total,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (employee: EmployeeListItem) => {
    setEditingId(employee.id);
    setFormOpen(true);
  };

  const toggleStatus = async (employee: EmployeeListItem) => {
    const next: EmployeeEmploymentStatus =
      employee.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => changeEmployeeStatus(employee.id, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Employee activated.' : 'Employee deactivated.');
      await load();
    } catch (failure) {
      toast.error(describeEmployeeError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await run(() => deleteEmployee(deleteTarget.id));
      toast.success('Employee deleted.');
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeEmployeeError(failure));
    }
  };

  const openView = (employee: EmployeeListItem) => {
    setDetailId(employee.id);
    setDetailOpen(true);
  };

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Employees' }]} className="mb-0.5" />

      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Employees"
            description="Manage employee records, roles, and employment details."
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
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Search by name, code, email, or phone"
                      aria-label="Search employees"
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
                            statusFilterActive && 'border-primary/40 bg-primary/5',
                          )}
                          aria-label="Filter by status"
                        >
                          <ListFilter aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Status</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Employment status</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
                    >
                      <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                      {EMPLOYEE_STATUSES.map((status) => (
                        <DropdownMenuRadioItem key={status} value={status}>
                          {labelEmployeeStatus(status)}
                        </DropdownMenuRadioItem>
                      ))}
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
                          className={cn(
                            'shrink-0',
                            typeFilterActive && 'border-primary/40 bg-primary/5',
                          )}
                          aria-label="Filter by employment type"
                        >
                          <Briefcase aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Employment type</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Employment type</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={employmentTypeFilter}
                      onValueChange={(value) =>
                        setEmploymentTypeFilter(value as typeof employmentTypeFilter)
                      }
                    >
                      <DropdownMenuRadioItem value="ALL">All types</DropdownMenuRadioItem>
                      {EMPLOYEE_EMPLOYMENT_TYPES.map((type) => (
                        <DropdownMenuRadioItem key={type} value={type}>
                          {labelEmploymentType(type)}
                        </DropdownMenuRadioItem>
                      ))}
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
                  Add employee
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
            frameClassName="min-h-0"
            headerVariant="plain"
            className="min-w-0 max-w-full gap-0"
            tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
            tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
            phase={tablePhase}
            colSpan={7}
            skeletonColumns={CRM_EMPLOYEES_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.employee}>Employee</TableHead>
                <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.jobTitle}>Job title</TableHead>
                <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.email}>Work email</TableHead>
                <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.phone}>Phone</TableHead>
                <TableHead className={CRM_EMPLOYEES_TABLE_COLUMN_CLASS.joined}>Joined</TableHead>
                <TableHead className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
                  Status
                </TableHead>
                <TableHead className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.actions, 'text-right')}>
                  Actions
                </TableHead>
              </TableRow>
            }
            empty={{
              icon: Users,
              title: filtersActive ? 'No employees match your filters' : 'No employees yet',
              description: filtersActive
                ? 'Try different search terms or clear filters.'
                : 'Add an employee to track employment details and reporting lines.',
              secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
            }}
            errorMessage={error}
            onRetry={() => void load()}
            refreshing={tableRefreshing}
            footer={
              <TablePagination
                className="border-border border-t px-4 py-3 sm:px-5"
                page={safePage}
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
            {items.map((employee) => (
              <TableRow key={employee.id} className="border-0">
                <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.employee, 'min-w-0')}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <EmployeeAvatar
                      displayName={employee.displayName}
                      profileImageUrl={employee.profileImageUrl}
                    />
                    <div className="min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-foreground block max-w-full truncate text-left text-[13px] font-semibold hover:underline"
                            onClick={() => openView(employee)}
                          >
                            {employee.displayName}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{employee.displayName}</TooltipContent>
                      </Tooltip>
                      <p className="text-muted-foreground truncate font-mono text-[10px]">
                        {employee.employeeCode}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.jobTitle, 'min-w-0')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block truncate text-sm">{employee.jobTitle}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{employee.jobTitle}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.email, 'min-w-0')}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground block truncate text-sm">{employee.workEmail}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm break-all">
                      {employee.workEmail}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.phone, 'min-w-0')}>
                  <span className="text-muted-foreground block truncate text-sm tabular-nums">
                    {employee.phone}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    CRM_EMPLOYEES_TABLE_COLUMN_CLASS.joined,
                    'text-muted-foreground text-sm tabular-nums whitespace-nowrap',
                  )}
                >
                  {employee.dateOfJoining}
                </TableCell>
                <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
                  <Badge className={employeeStatusBadgeClass(employee.employmentStatus)}>
                    {labelEmployeeStatus(employee.employmentStatus)}
                  </Badge>
                </TableCell>
                <TableCell className={cn(CRM_EMPLOYEES_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
                  <div className="flex w-full shrink-0 items-center justify-end gap-1">
                    <TableIconButton
                      label={
                        employee.employmentStatus === 'ACTIVE'
                          ? `Deactivate ${employee.displayName}`
                          : `Activate ${employee.displayName}`
                      }
                      tone="default"
                      className={
                        employee.employmentStatus === 'ACTIVE'
                          ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                          : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                      }
                      disabled={pending || employee.employmentStatus === 'TERMINATED'}
                      onClick={() => void toggleStatus(employee)}
                    >
                      {employee.employmentStatus === 'ACTIVE' ? (
                        <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                      ) : (
                        <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                      )}
                    </TableIconButton>
                    <TableIconButton
                      label={`Edit ${employee.displayName}`}
                      tone="default"
                      className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                      disabled={pending}
                      onClick={() => openEdit(employee)}
                    >
                      <SquarePen className="size-4" aria-hidden="true" />
                    </TableIconButton>
                    <TableIconButton
                      label={`Delete ${employee.displayName}`}
                      tone="default"
                      className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
                      disabled={pending}
                      onClick={() => setDeleteTarget(employee)}
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

      <EmployeeDetailDialog employeeId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />

      <EmployeeFormDialog
        open={formOpen}
        editingId={editingId}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingId(null);
        }}
        onSaved={load}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.displayName ?? 'this employee'} from your organization.
              Direct reports must be reassigned first. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
