'use client';

import type { LeaveYearConfigurationItem, LeaveYearConfigurationStatus } from '@techwin/contracts';
import { Loader2, Plus, SquarePen, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import {
  deleteLeaveYearConfiguration,
  updateLeaveYearConfigurationStatus,
} from '../api/leave-balances.api';
import { LeaveAllocationTypesCell } from '../components/leave-allocation-types-cell';
import { LeaveBalanceFormModal } from '../components/leave-balance-form-modal';
import { useLeaveBalances } from '../hooks/use-leave-balances';
import { sumAllocationDays } from '../utils/calculate-allocation-total';
import {
  isLeaveBalanceDeleteBlockedError,
  leaveBalanceDeleteBlockedMessage,
  leaveBalanceDependencyCountsFromError,
} from '../utils/leave-balance-delete-messages';

const TABLE_SKELETON = [
  { variant: 'textWide' as const },
  { variant: 'text' as const },
  { variant: 'text' as const },
  { variant: 'badge' as const },
  { variant: 'number' as const },
  { variant: 'badge' as const },
  { variant: 'actions' as const, headClassName: 'text-right w-[8rem]' },
];

function normalizePolicyStatus(status: string): LeaveYearConfigurationStatus {
  if (status === 'INACTIVE' || status === 'CLOSED') return 'INACTIVE';
  return 'ACTIVE';
}

function statusBadge(status: LeaveYearConfigurationStatus) {
  if (status === 'ACTIVE') {
    return (
      <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10">
      Inactive
    </Badge>
  );
}

function normalizeLeaveBalanceConfig(
  item: LeaveYearConfigurationItem,
): LeaveYearConfigurationItem {
  const allocations = item.allocations ?? [];
  const totalAllocatedDays = sumAllocationDays(
    allocations.map((line) => line.annualAllocationDays),
  );
  return {
    ...item,
    status: normalizePolicyStatus(item.status),
    name: item.name?.trim() ? item.name : `Leave policy ${item.calendarYear}`,
    allocations,
    totalAllocatedDays: item.totalAllocatedDays ?? totalAllocatedDays,
  };
}

export function LeaveBalancesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { dashboardBreadcrumb } = usePortalNavigation();
  const { leaveBalances, loading, error, refetch } = useLeaveBalances();

  const items = useMemo(
    () => leaveBalances.map(normalizeLeaveBalanceConfig),
    [leaveBalances],
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveYearConfigurationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveYearConfigurationItem | null>(null);
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<LeaveYearConfigurationItem | null>(null);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: total,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: total });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const setPolicyStatus = async (
    row: LeaveYearConfigurationItem,
    status: LeaveYearConfigurationStatus,
  ) => {
    try {
      await run(() => updateLeaveYearConfigurationStatus(row.id, { status }));
      toast.success(status === 'ACTIVE' ? 'Leave policy activated.' : 'Leave policy deactivated.');
      await refetch();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    setDeactivateTarget(null);
    await setPolicyStatus(target, 'INACTIVE');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteLeaveYearConfiguration(target.id));
      toast.success('Leave balance configuration deleted.');
      await refetch();
    } catch (failure) {
      if (isLeaveBalanceDeleteBlockedError(failure)) {
        const counts = leaveBalanceDependencyCountsFromError(failure);
        const message = counts
          ? leaveBalanceDeleteBlockedMessage(counts)
          : describeCrmError(failure);
        setDeleteBlockedMessage(message);
        return;
      }
      toast.error(describeCrmError(failure));
    }
  };

  const breadcrumbs = [
    dashboardBreadcrumb,
    { label: 'Human Resources' },
    { label: 'Leave Balances' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Leave Balances"
            description="Configure leave entitlements and manage annual leave allocations."
            className="rounded-none border-0 bg-card shadow-none"
            titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
            toolbar={
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                onClick={openCreate}
              >
                <Plus aria-hidden="true" />
                Create Leave Balance
              </Button>
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
            skeletonColumns={TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead className="min-w-[11rem] w-[24%]">Leave Types</TableHead>
                <TableHead className="text-right whitespace-nowrap">Total Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            }
            empty={{
              title: 'No leave balance configurations yet',
              description: 'Create a leave balance to set entitlements by leave type and period.',
            }}
            errorMessage={error}
            onRetry={() => void refetch()}
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
            {pagedItems.map((row) => {
              const isActive = row.status === 'ACTIVE';
              return (
                <TableRow key={row.id} className="border-0">
                  <TableCell className="min-w-0 font-medium">
                    <span className="text-foreground block truncate text-[13px] font-semibold">
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{row.yearStartDate}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{row.yearEndDate}</TableCell>
                  <TableCell className="min-w-[11rem] align-middle">
                    <LeaveAllocationTypesCell allocations={row.allocations ?? []} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.totalAllocatedDays}</TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell className="min-w-0 pl-4">
                    <div className="flex w-full shrink-0 items-center justify-end gap-1">
                      <TableIconButton
                        label={isActive ? `Deactivate ${row.name}` : `Activate ${row.name}`}
                        tone="default"
                        className={
                          isActive
                            ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                            : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                        }
                        disabled={pending}
                        onClick={() => {
                          if (isActive) setDeactivateTarget(row);
                          else void setPolicyStatus(row, 'ACTIVE');
                        }}
                      >
                        {isActive ? (
                          <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                        ) : (
                          <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                        )}
                      </TableIconButton>
                      <TableIconButton
                        label={`Edit ${row.name}`}
                        tone="default"
                        className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                        disabled={pending}
                        onClick={() => {
                          setEditing(row);
                          setFormOpen(true);
                        }}
                      >
                        <SquarePen className="size-4" aria-hidden="true" />
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
              );
            })}
          </DataTable>
        </div>
      </section>

      <LeaveBalanceFormModal
        open={formOpen}
        editing={editing}
        onOpenChange={setFormOpen}
        onSaved={() => refetch()}
      />

      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate leave policy?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget
                ? `"${deactivateTarget.name}" will no longer be used for new leave applications. Existing employee balances and history are unchanged.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeactivate()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete leave balance configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Remove "${deleteTarget.name}"? Unused employee allocation rows will be removed. Deletion is blocked when leave has been consumed or pending or approved requests exist.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteBlockedMessage !== null}
        onOpenChange={(open) => !open && setDeleteBlockedMessage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete configuration</AlertDialogTitle>
            <AlertDialogDescription>{deleteBlockedMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
