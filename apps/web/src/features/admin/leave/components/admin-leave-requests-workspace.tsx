'use client';

import type { LeaveRequestItem, LeaveRequestStatus } from '@techwin/contracts';
import { Check, Eye, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import {
  approveLeaveRequest,
  getLeaveRequest,
  listLeaveRequests,
  rejectLeaveRequest,
} from '@/features/leave/api/leave-api';
import { isAbortError } from '@/shared/lib/abort-error';
import { cn } from '@/shared/lib/utils';
import { Search } from 'lucide-react';

type StatusTab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const TAB_TRIGGER_CLASS =
  'h-8 rounded-md px-3 text-xs data-[state=active]:border data-[state=active]:border-[#E8E8EF] data-[state=active]:bg-white data-[state=active]:text-[#5B35B5] data-[state=active]:shadow-xs';

const TABLE_SKELETON = [
  { variant: 'textWide' as const },
  { variant: 'text' as const },
  { variant: 'text' as const },
  { variant: 'number' as const },
  { variant: 'badge' as const },
  { variant: 'actions' as const, headClassName: 'text-right w-[8rem]' },
];

function statusBadge(status: LeaveRequestStatus) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
          Rejected
        </Badge>
      );
    case 'CANCELLED':
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
          Pending
        </Badge>
      );
  }
}

function formatDateRange(row: LeaveRequestItem) {
  const dates = row.selectedDates?.length ? row.selectedDates : [row.startDate, row.endDate];
  const unique = [...new Set(dates)].sort();
  if (unique.length === 1) {
    return row.isHalfDay ? `${unique[0]} (half day)` : unique[0]!;
  }
  if (unique.length <= 4) {
    return unique.join(', ');
  }
  return `${unique[0]} … ${unique[unique.length - 1]} (${unique.length} days)`;
}

export function AdminLeaveRequestsWorkspace() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { dashboardBreadcrumb } = usePortalNavigation();

  const [statusTab, setStatusTab] = useState<StatusTab>('PENDING');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [items, setItems] = useState<readonly LeaveRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewTarget, setViewTarget] = useState<LeaveRequestItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState<LeaveRequestItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const result = await listLeaveRequests(
          {
            page,
            pageSize,
            status: statusTab === 'ALL' ? undefined : statusTab,
            search: search.trim() || undefined,
          },
          signal,
        );
        setItems(result.items);
        setTotal(result.total);
        setError(null);
      } catch (failure) {
        if (isAbortError(failure)) return;
        setError(describeCrmError(failure));
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, statusTab],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: total,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const openView = async (row: LeaveRequestItem) => {
    setViewTarget(row);
    setViewLoading(true);
    try {
      const detail = await getLeaveRequest(row.id);
      setViewTarget(detail);
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      setViewLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      await run(() => approveLeaveRequest(approveTarget.id));
      toast.success('Leave request approved.');
      setApproveTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      toast.error('Enter a rejection reason (at least 3 characters).');
      return;
    }
    try {
      await run(() => rejectLeaveRequest(rejectTarget.id, { rejectionReason: reason }));
      toast.success('Leave request rejected.');
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const breadcrumbs = [
    dashboardBreadcrumb,
    { label: 'Human Resources' },
    { label: 'Leave Management' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Leave requests"
            description="Review, approve, or reject employee leave applications."
            className="rounded-none border-0 bg-card shadow-none"
            titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
            toolbar={
              <>
                <Tabs
                  value={statusTab}
                  onValueChange={(v) => setStatusTab(v as StatusTab)}
                  className="shrink-0"
                >
                  <TabsList className="h-9 shrink-0 border border-[#E8E8EF] bg-[#F8F9FC] p-0.5">
                    <TabsTrigger value="PENDING" className={TAB_TRIGGER_CLASS}>
                      Pending
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED" className={TAB_TRIGGER_CLASS}>
                      Approved
                    </TabsTrigger>
                    <TabsTrigger value="REJECTED" className={TAB_TRIGGER_CLASS}>
                      Rejected
                    </TabsTrigger>
                    <TabsTrigger value="ALL" className={TAB_TRIGGER_CLASS}>
                      All
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <form
                  className={CRM_HEADER_SEARCH_FORM_CLASS}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSearch(searchDraft.trim());
                  }}
                >
                  <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                    <Input
                      className={cn(
                        CRM_PIPELINE_SEARCH_INPUT_CLASS,
                        inputGroupPaddingClass({ leading: true }),
                      )}
                      placeholder="Search employee or leave type"
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      aria-label="Search leave requests"
                    />
                  </InputGroup>
                </form>
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
            tableBodyClassName="[&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
            phase={tablePhase}
            colSpan={6}
            skeletonColumns={TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead>Employee</TableHead>
                <TableHead>Leave type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            }
            empty={{
              title: 'No leave requests',
              description:
                statusTab === 'PENDING'
                  ? 'There are no pending requests right now.'
                  : 'No requests match this filter.',
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
                  <div className="font-medium">{row.employeeDisplayName}</div>
                  <div className="text-muted-foreground text-xs">{row.employeeCode}</div>
                </TableCell>
                <TableCell>
                  <div>{row.leaveTypeName}</div>
                  <div className="text-muted-foreground text-xs">{row.leaveTypeCode}</div>
                </TableCell>
                <TableCell className="text-sm">{formatDateRange(row)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.totalDays}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-0.5">
                    <TableIconButton label="View request" onClick={() => void openView(row)}>
                      <Eye className="size-4" aria-hidden />
                    </TableIconButton>
                    {row.status === 'PENDING' ? (
                      <>
                        <TableIconButton
                          label="Approve"
                          tone="success"
                          onClick={() => setApproveTarget(row)}
                        >
                          <Check className="size-4" aria-hidden />
                        </TableIconButton>
                        <TableIconButton
                          label="Reject"
                          tone="danger"
                          onClick={() => {
                            setRejectTarget(row);
                            setRejectReason('');
                          }}
                        >
                          <X className="size-4" aria-hidden />
                        </TableIconButton>
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </div>
      </section>

      <Dialog open={viewTarget !== null} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave request</DialogTitle>
          </DialogHeader>
          {viewTarget ? (
            <div className="grid gap-3 text-sm">
              {viewLoading ? (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading…
                </p>
              ) : null}
              <dl className="grid gap-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Employee</dt>
                  <dd className="text-right font-medium">
                    {viewTarget.employeeDisplayName} ({viewTarget.employeeCode})
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Leave type</dt>
                  <dd className="text-right">{viewTarget.leaveTypeName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Dates</dt>
                  <dd className="text-right">{formatDateRange(viewTarget)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total days</dt>
                  <dd className="text-right tabular-nums">{viewTarget.totalDays}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{statusBadge(viewTarget.status)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1">Reason</dt>
                  <dd className="rounded-md bg-muted/40 p-2">{viewTarget.reason}</dd>
                </div>
                {viewTarget.notes ? (
                  <div>
                    <dt className="text-muted-foreground mb-1">Notes</dt>
                    <dd className="rounded-md bg-muted/40 p-2">{viewTarget.notes}</dd>
                  </div>
                ) : null}
                {viewTarget.rejectionReason ? (
                  <div>
                    <dt className="text-muted-foreground mb-1">Rejection reason</dt>
                    <dd className="rounded-md bg-red-50 p-2 text-red-900">{viewTarget.rejectionReason}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve leave request?</AlertDialogTitle>
            <AlertDialogDescription>
              {approveTarget
                ? `${approveTarget.employeeDisplayName} — ${formatDateRange(approveTarget)} (${approveTarget.totalDays} days)`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleApprove()} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject leave request</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason that the employee will see.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason"
            className="min-h-[5rem]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleReject();
              }}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
