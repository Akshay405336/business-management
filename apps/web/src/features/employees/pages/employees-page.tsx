'use client';

import { employeeListQuerySchema } from '../schemas/employee.schema';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { getEmployeeDeletionImpact } from '../api/employee.api';
import { EmployeeDeleteDialog } from '../components/employee-delete-dialog';
import { EmployeeDependencyDialog } from '../components/employee-dependency-dialog';
import { EmployeeDetailDialog } from '../components/employee-details-modal';
import { EmployeeFormDialog } from '../components/employee-form-modal';
import { EmployeeStatusDialog } from '../components/employee-status-dialog';
import { EmployeeTable } from '../components/employee-table';
import { EmployeeToolbar } from '../components/employee-toolbar';
import { DEFAULT_EMPLOYEE_PAGE_SIZE } from '../constants';
import { useChangeEmployeeStatus, useDeleteEmployee, useEmployees } from '../hooks';
import type { EmployeeDeletionImpact } from '@techwin/contracts';
import type {
  EmployeeEmploymentStatus,
  EmployeeEmploymentType,
  EmployeeListItem,
  EmployeeListQuery,
} from '../types';
import { describeEmployeeError } from '../utils/errors';
import { pendingTasksFromDeleteError } from '../utils/employee-deletion';
import { describeEmployeeDeletion } from '../utils/employee-formatters';
import { canCreateEmployees, canUpdateEmployees } from '../utils/employee-permissions';

const SEARCH_DEBOUNCE_MS = 400;

export function EmployeesPage() {
  const toast = useAdminToast();
  const { has, hasAny } = usePermissions();
  const { admin } = useAuthenticatedAdmin();
  const canCreate = canCreateEmployees(has);
  const canUpdate = canUpdateEmployees(has);
  const canDeleteLoginAccounts = hasAny('users.deactivate', 'memberships.manage');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_EMPLOYEE_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeEmploymentStatus>('ALL');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<'ALL' | EmployeeEmploymentType>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusConfirming = useRef(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<EmployeeListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<EmployeeDeletionImpact | null>(null);
  const [dependencyOpen, setDependencyOpen] = useState(false);

  const query = useMemo((): EmployeeListQuery => {
    return employeeListQuerySchema.parse({
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      employmentType: employmentTypeFilter === 'ALL' ? undefined : employmentTypeFilter,
      page,
      pageSize,
      sortBy: 'displayName',
      sortDir: 'asc',
    });
  }, [search, statusFilter, employmentTypeFilter, page, pageSize]);

  const { items, total, loading, error, refetch } = useEmployees(query);
  const { changeEmployeeStatus, pending: statusPending } = useChangeEmployeeStatus();
  const { deleteEmployee, pending: deletePending } = useDeleteEmployee();
  const pending = statusPending || deletePending;

  useEffect(() => {
    const next = searchDraft.trim();
    if (next === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, searchDraft]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const filtersActive = search.trim().length > 0 || statusFilter !== 'ALL' || employmentTypeFilter !== 'ALL';

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setEmploymentTypeFilter('ALL');
    setPage(1);
  };

  const canDeleteEmployee = useCallback(
    (employee: EmployeeListItem) => {
      const ownsCurrentAccount =
        employee.platformAdminId !== null && employee.platformAdminId === admin.id;
      return !ownsCurrentAccount && (!employee.loginAccess?.ownsAccount || canDeleteLoginAccounts);
    },
    [admin.id, canDeleteLoginAccounts],
  );

  const openDelete = async (employee: EmployeeListItem) => {
    setDeleteTarget(employee);
    setDeleteImpact(null);
    setDependencyOpen(false);
    try {
      const impact = await getEmployeeDeletionImpact(employee.id);
      setDeleteImpact(impact);
      setDependencyOpen(impact.pendingTaskCount > 0);
    } catch (failure) {
      setDeleteTarget(null);
      toast.error(describeEmployeeError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      const result = await deleteEmployee(target.id);
      if (!result) return;
      toast.success(describeEmployeeDeletion(result.loginAccount));
      setDeleteTarget(null);
      setDeleteImpact(null);
      setDependencyOpen(false);
      await refetch();
    } catch (failure) {
      const blocked = pendingTasksFromDeleteError(failure);
      if (blocked) {
        setDeleteImpact(blocked);
        setDependencyOpen(true);
        return;
      }
      toast.error(describeEmployeeError(failure));
    }
  };

  const confirmStatus = async () => {
    if (!statusTarget || statusPending || statusConfirming.current) return;
    const next = statusTarget.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusConfirming.current = true;
    try {
      const updated = await changeEmployeeStatus(statusTarget.id, { status: next });
      if (!updated) return;
      setStatusTarget(null);
      toast.success(next === 'ACTIVE' ? 'Employee activated.' : 'Employee deactivated.');
      await refetch();
    } catch (failure) {
      toast.error(describeEmployeeError(failure));
    } finally {
      statusConfirming.current = false;
    }
  };

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Employees' }]} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <EmployeeToolbar
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onSearchSubmit={() => {
              setSearch(searchDraft.trim());
              setPage(1);
            }}
            searchDebounceRef={searchDebounceRef}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            typeFilter={employmentTypeFilter}
            onTypeFilterChange={(value) => {
              setEmploymentTypeFilter(value);
              setPage(1);
            }}
            refreshing={loading && items.length > 0}
            canCreate={canCreate}
            onCreate={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          />
          {error && items.length > 0 ? (
            <div className="border-border border-b px-4 sm:px-5">
              <CrmErrorAlert message={error} />
            </div>
          ) : null}
          <div aria-hidden className="table-header-edge" />
          <div className="overflow-x-auto">
            <EmployeeTable
              items={items}
              total={total}
              loading={loading}
              error={error}
              page={safePage}
              pageSize={pageSize}
              filtersActive={filtersActive}
              canUpdate={canUpdate}
              pending={pending}
              canDeleteEmployee={canDeleteEmployee}
              onRetry={() => void refetch()}
              onClearFilters={clearFilters}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize);
                setPage(1);
              }}
              onView={(employee) => {
                setDetailId(employee.id);
                setDetailOpen(true);
              }}
              onEdit={(employee) => {
                setEditingId(employee.id);
                setFormOpen(true);
              }}
              onStatus={setStatusTarget}
              onDelete={(employee) => void openDelete(employee)}
            />
          </div>
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
        onSaved={refetch}
      />
      <EmployeeStatusDialog
        key={statusTarget?.id ?? 'status-closed'}
        employee={statusTarget}
        pending={statusPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void confirmStatus()}
      />
      <EmployeeDeleteDialog
        open={deleteTarget !== null && !dependencyOpen && deleteImpact !== null && deleteImpact.pendingTaskCount === 0}
        employeeName={deleteTarget?.displayName ?? 'this employee'}
        completedTaskCount={deleteImpact?.completedTaskCount ?? 0}
        pending={deletePending}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteImpact(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
      <EmployeeDependencyDialog
        open={dependencyOpen}
        impact={deleteImpact}
        onClose={() => {
          setDependencyOpen(false);
          setDeleteTarget(null);
          setDeleteImpact(null);
        }}
      />
    </div>
  );
}
