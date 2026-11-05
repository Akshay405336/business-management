'use client';

import type { EmployeeLeaveBalanceItem } from '@techwin/contracts';
import { Eye, Search, SquarePen } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { CRM_HEADER_SEARCH_FORM_CLASS } from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { listEmployeeLeaveBalances, listLeaveBalanceTransactions } from '@/features/leave/api/leave-api';
import { isAbortError } from '@/shared/lib/abort-error';
import { cn } from '@/shared/lib/utils';
import { LeaveBalanceAdjustDialog } from './leave-balance-adjust-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';

const SKELETON = [
  { variant: 'textWide' as const },
  { variant: 'text' as const },
  { variant: 'number' as const },
  { variant: 'number' as const },
  { variant: 'number' as const },
  { variant: 'number' as const },
  { variant: 'actions' as const, headClassName: 'text-right w-[5rem]' },
];

export function AdminEmployeeLeaveBalancesPanel({ calendarYear }: { calendarYear: number }) {
  const [items, setItems] = useState<readonly EmployeeLeaveBalanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const [viewBalance, setViewBalance] = useState<EmployeeLeaveBalanceItem | null>(null);
  const [transactions, setTransactions] = useState<
    Awaited<ReturnType<typeof listLeaveBalanceTransactions>>['items']
  >([]);
  const [txLoading, setTxLoading] = useState(false);
  const [adjustBalance, setAdjustBalance] = useState<EmployeeLeaveBalanceItem | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const res = await listEmployeeLeaveBalances(
          { page, pageSize, calendarYear, search: search || undefined },
          signal,
        );
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      } catch (failure) {
        if (isAbortError(failure)) return;
        setError(describeCrmError(failure));
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, calendarYear, search],
  );

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [calendarYear, search]);

  const openView = async (row: EmployeeLeaveBalanceItem) => {
    setViewBalance(row);
    setTxLoading(true);
    try {
      const res = await listLeaveBalanceTransactions({
        employeeLeaveBalanceId: row.id,
        page: 1,
        pageSize: 50,
      });
      setTransactions(res.items);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const phase = deriveDataTablePhase({ loading, error, rowCount: total });
  const refreshing = isDataTableRefreshing({ loading, rowCount: items.length });
  const safePage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / pageSize)));

  return (
    <>
      <div className="border-border flex flex-wrap items-center gap-2 border-b px-4 py-2 sm:px-5">
        <form
          className={CRM_HEADER_SEARCH_FORM_CLASS}
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchDraft.trim());
          }}
        >
          <InputGroup leading={<Search aria-hidden />} className="min-w-0 max-w-full">
            <Input
              className={cn(
                CRM_PIPELINE_SEARCH_INPUT_CLASS,
                inputGroupPaddingClass({ leading: true }),
              )}
              placeholder="Search employee or leave type"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </InputGroup>
        </form>
      </div>
      <div aria-hidden className="table-header-edge" />
      <DataTable
        frame="flush"
        headerVariant="plain"
        className="min-w-0 max-w-full gap-0"
        tableBodyClassName="[&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
        phase={phase}
        colSpan={7}
        skeletonColumns={SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead>Employee</TableHead>
            <TableHead>Leave type</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          title: 'No employee balances',
          description: 'Generate balances for the active year to see employee entitlements here.',
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={refreshing}
        footer={
          <TablePagination
            className="border-border border-t px-4 py-3 sm:px-5"
            page={safePage}
            pageSize={pageSize}
            total={total}
            loading={phase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      >
        {items.map((row) => (
          <TableRow key={row.id} className="border-0">
            <TableCell>
              <div className="font-medium">{row.employeeDisplayName || '—'}</div>
              <div className="text-muted-foreground text-xs">{row.employeeCode}</div>
            </TableCell>
            <TableCell>{row.leaveTypeName}</TableCell>
            <TableCell className="text-right tabular-nums">{row.allocatedDays}</TableCell>
            <TableCell className="text-right tabular-nums">{row.usedApprovedDays}</TableCell>
            <TableCell className="text-right tabular-nums">{row.reservedPendingDays}</TableCell>
            <TableCell className="text-right tabular-nums font-medium">{row.availableDays}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5">
                <TableIconButton label="View" onClick={() => void openView(row)}>
                  <Eye className="size-4" aria-hidden />
                </TableIconButton>
                <TableIconButton label="Adjust" tone="primary" onClick={() => setAdjustBalance(row)}>
                  <SquarePen className="size-4" aria-hidden />
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <LeaveBalanceAdjustDialog
        open={adjustBalance !== null}
        balance={adjustBalance}
        onOpenChange={(o) => !o && setAdjustBalance(null)}
        onSaved={() => load()}
      />

      <Dialog open={viewBalance !== null} onOpenChange={(o) => !o && setViewBalance(null)}>
        <DialogContent className={cn(CRM_PIPELINE_FORM_DIALOG_CLASS, 'sm:max-w-[560px]')}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Balance details</DialogTitle>
          </DialogHeader>
          {viewBalance ? (
            <div className="max-h-[60vh] overflow-y-auto px-6 pb-4 text-sm">
              <p className="font-medium">
                {viewBalance.employeeDisplayName} ({viewBalance.employeeCode})
              </p>
              <p className="text-muted-foreground">
                {viewBalance.leaveTypeName} · {viewBalance.calendarYear}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Allocated</dt>
                  <dd className="tabular-nums">{viewBalance.allocatedDays}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Carry forward</dt>
                  <dd className="tabular-nums">{viewBalance.carryForwardDays}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Used</dt>
                  <dd className="tabular-nums">{viewBalance.usedApprovedDays}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Pending</dt>
                  <dd className="tabular-nums">{viewBalance.reservedPendingDays}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground text-xs">Available</dt>
                  <dd className="text-lg font-semibold tabular-nums">{viewBalance.availableDays}</dd>
                </div>
              </dl>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Recent transactions
              </h3>
              {txLoading ? (
                <p className="text-muted-foreground py-2">Loading…</p>
              ) : transactions.length === 0 ? (
                <p className="text-muted-foreground py-2">No transactions yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="rounded-md border border-[#E8E8EF] px-2 py-1.5 text-xs">
                      <span className="font-medium">{tx.transactionType}</span> · {tx.days} day(s)
                      <div className="text-muted-foreground">{tx.reason}</div>
                      <div className="text-muted-foreground">{tx.createdAt}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
