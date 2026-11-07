'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { cn } from '@/shared/lib/utils';
import { EmployeeLeaveTypeCell } from '../components/employee-leave-type-cell';
import {
  EmployeeLeaveRecordsNoConfigurationEmptyState,
  EmployeeLeaveRecordsNoEmployeesEmptyState,
} from '../components/employee-leave-records-empty-state';
import { useActiveLeaveBalances } from '../hooks/use-active-leave-balances';
import { useEmployeeLeaveRecords } from '../hooks/use-employee-leave-records';
import {
  EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN,
  employeeLeaveRecordsTableMinWidth,
} from '../utils/table-columns';

const SEARCH_DEBOUNCE_MS = 350;

export function EmployeeLeaveRecordsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dashboardBreadcrumb } = usePortalNavigation();

  const configurationIdParam = searchParams.get('configurationId') ?? '';
  const searchParam = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '25') || 25));

  const [searchDraft, setSearchDraft] = useState(searchParam);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { configurations, loading: configsLoading, error: configsError } = useActiveLeaveBalances();

  const selectedConfiguration = useMemo(() => {
    const fromParam = configurations.find((row) => row.id === configurationIdParam);
    if (fromParam) return fromParam;
    return configurations[0] ?? null;
  }, [configurations, configurationIdParam]);

  const selectedConfigurationId = selectedConfiguration?.id ?? null;

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/admin/employee-leave-records?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (configsLoading) return;
    if (!selectedConfiguration) {
      if (configurationIdParam) updateParams({ configurationId: null, page: '1' });
      return;
    }
    if (configurationIdParam !== selectedConfiguration.id) {
      updateParams({ configurationId: selectedConfiguration.id, page: '1' });
    }
  }, [configsLoading, selectedConfiguration, configurationIdParam, updateParams]);

  useEffect(() => {
    setSearchDraft(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const trimmedDraft = searchDraft.trim();
    if (trimmedDraft === searchParam.trim()) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      updateParams({ search: trimmedDraft || null, page: '1' });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, searchParam, updateParams]);

  const recordsQuery = useMemo(
    () => ({
      page,
      pageSize,
      ...(searchParam.trim() ? { search: searchParam.trim() } : {}),
    }),
    [page, pageSize, searchParam],
  );

  const {
    data: recordsData,
    loading: recordsLoading,
    error: recordsError,
  } = useEmployeeLeaveRecords(selectedConfigurationId, recordsQuery);

  const leaveTypeColumns = recordsData?.leaveTypeColumns ?? selectedConfiguration?.allocations ?? [];
  const rows = recordsData?.items ?? [];
  const total = recordsData?.total ?? 0;

  const tablePhase = deriveDataTablePhase({
    loading: configsLoading || (Boolean(selectedConfigurationId) && recordsLoading && !recordsData),
    error: configsError ?? recordsError,
    rowCount: configurations.length === 0 ? 0 : total,
  });
  const tableRefreshing = isDataTableRefreshing({
    loading: recordsLoading,
    rowCount: total,
  });

  const colSpan = 1 + leaveTypeColumns.length + 3;
  const skeletonColumnCount = Math.min(colSpan, 8);
  const tableMinWidth = employeeLeaveRecordsTableMinWidth(leaveTypeColumns.length);

  const breadcrumbs = [
    dashboardBreadcrumb,
    { label: 'Human Resources' },
    { label: 'Employee Leave Records' },
  ] as const;

  const showNoConfig = !configsLoading && configurations.length === 0;
  const showNoEmployees =
    !showNoConfig && selectedConfigurationId && !recordsLoading && total === 0 && !searchParam.trim();

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="Employee Leave Records"
            description="View employee-wise leave entitlements, consumed days and available balances."
            className="rounded-none border-0 bg-card shadow-none"
            titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
            toolbar={
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="min-w-[10rem] w-[min(100%,14rem)] max-w-[14rem] shrink-0">
                      <Select
                        value={selectedConfigurationId ?? undefined}
                        onValueChange={(nextId) =>
                          updateParams({ configurationId: nextId, page: '1' })
                        }
                        disabled={configsLoading || configurations.length === 0}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-9 w-full min-w-0 rounded-lg py-0',
                            '[&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:text-left',
                          )}
                          aria-label="Leave balance configuration"
                          title={selectedConfiguration?.name}
                        >
                          <SelectValue placeholder="Select configuration" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(100vw-2rem,20rem)]">
                          {configurations.map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              {config.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  {selectedConfiguration ? (
                    <TooltipContent side="bottom">{selectedConfiguration.name}</TooltipContent>
                  ) : null}
                </Tooltip>
                <Input
                  className={cn(CRM_PIPELINE_SEARCH_INPUT_CLASS, 'h-9 w-[min(100%,14rem)]')}
                  placeholder="Search employees…"
                  value={searchDraft}
                  disabled={!selectedConfigurationId}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
              </div>
            }
          />

          {selectedConfigurationId && leaveTypeColumns.length > 0 ? (
            <p className="text-muted-foreground border-border border-b px-4 py-2 text-xs sm:px-5">
              Leave type cells: <span className="text-foreground font-medium">Allocated / Used / Available</span>
            </p>
          ) : null}

          {(configsError || recordsError) && !showNoConfig ? (
            <div className="border-border border-b px-4 sm:px-5">
              <CrmErrorAlert message={configsError ?? recordsError ?? ''} />
            </div>
          ) : null}

          <div aria-hidden className="table-header-edge" />

          {showNoConfig ? (
            <EmployeeLeaveRecordsNoConfigurationEmptyState />
          ) : (
              <DataTable
                frame="flush"
                frameClassName="min-h-0 min-w-0"
                headerVariant="plain"
                className="min-w-0 max-w-full gap-0"
                tableContainerClassName="min-w-0 max-w-full"
                tableStyle={{ minWidth: tableMinWidth }}
                tableClassName={cn(
                  'table-fixed w-full bg-card',
                  '[&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:bg-card [&_[data-slot=table-head]]:py-3',
                  '[&_[data-slot=table-cell]]:bg-card [&_[data-slot=table-cell]]:py-3',
                )}
                tableBodyClassName="bg-card [&_[data-slot=table-row]]:border-b [&_[data-slot=table-row]]:border-border [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
                phase={tablePhase}
                colSpan={colSpan}
                skeletonColumns={Array.from({ length: skeletonColumnCount }, () => ({
                  variant: 'text' as const,
                }))}
                header={
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead
                      className={cn(EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.employee, 'align-middle')}
                    >
                      Employee
                    </TableHead>
                    {leaveTypeColumns.map((column) => (
                      <TableHead
                        key={column.leaveTypeId}
                        className={cn(
                          EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.leaveType,
                          'align-middle whitespace-normal text-left',
                        )}
                      >
                        {column.leaveTypeName}
                      </TableHead>
                    ))}
                    <TableHead
                      className={cn(
                        EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.total,
                        'text-right align-middle whitespace-nowrap',
                      )}
                    >
                      Total Allocated
                    </TableHead>
                    <TableHead
                      className={cn(
                        EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.total,
                        'text-right align-middle whitespace-nowrap',
                      )}
                    >
                      Total Used
                    </TableHead>
                    <TableHead
                      className={cn(
                        EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.total,
                        'text-right align-middle whitespace-nowrap',
                      )}
                    >
                      Total Available
                    </TableHead>
                  </TableRow>
                }
                empty={{
                  title: searchParam.trim() ? 'No employees match your search' : 'No employee records',
                  description: searchParam.trim()
                    ? 'Try a different name or employee code.'
                    : 'Allocations appear when eligible employees are linked to this configuration.',
                }}
                errorMessage={recordsError}
                refreshing={tableRefreshing}
                footer={
                  <TablePagination
                    className="border-border border-t px-4 py-3 sm:px-5"
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    loading={tablePhase === 'initial-loading'}
                    hideWhenEmpty={false}
                    onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
                    onPageSizeChange={(nextSize) =>
                      updateParams({ pageSize: String(nextSize), page: '1' })
                    }
                  />
                }
              >
                {showNoEmployees ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="p-0">
                      <EmployeeLeaveRecordsNoEmployeesEmptyState />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell
                        className={cn(
                          EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.employee,
                          'align-middle whitespace-normal',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <EmployeeAvatar
                            displayName={row.employeeDisplayName}
                            profileImageUrl={row.profileImageUrl}
                          />
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-[13px] font-semibold">
                              {row.employeeDisplayName}
                            </p>
                            <p className="text-muted-foreground truncate font-mono text-[10px]">
                              {row.employeeCode}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      {leaveTypeColumns.map((column) => {
                        const balance = row.leaveTypes.find(
                          (entry) => entry.leaveTypeId === column.leaveTypeId,
                        );
                        return (
                          <TableCell
                            key={column.leaveTypeId}
                            className={cn(
                              EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.leaveType,
                              'text-foreground align-middle tabular-nums text-[13px]',
                            )}
                          >
                            <EmployeeLeaveTypeCell
                              allocatedDays={balance?.allocatedDays ?? '0'}
                              usedDays={balance?.usedDays ?? '0'}
                              availableDays={balance?.availableDays ?? '0'}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell
                        className={cn(
                          EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.total,
                          'text-right align-middle tabular-nums',
                        )}
                      >
                        {row.totalAllocatedDays}
                      </TableCell>
                      <TableCell
                        className={cn(
                          EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.total,
                          'text-right align-middle tabular-nums',
                        )}
                      >
                        {row.totalUsedDays}
                      </TableCell>
                      <TableCell
                        className={cn(
                          EMPLOYEE_LEAVE_RECORDS_TABLE_COLUMN.total,
                          'text-right align-middle tabular-nums',
                        )}
                      >
                        {row.totalAvailableDays}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </DataTable>
          )}

          {!showNoConfig && configurations.length === 0 ? null : (
            <p className="text-muted-foreground px-4 py-3 text-xs sm:px-5">
              Manage entitlements in{' '}
              <Link href="/admin/leave-balances" className="text-primary font-medium hover:underline">
                Leave Balances
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
