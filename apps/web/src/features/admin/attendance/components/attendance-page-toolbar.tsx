'use client';

import { CalendarDays, ListFilter, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';
import {
  ATTENDANCE_STATUS_FILTER_OPTIONS,
  type AttendanceStatusFilter,
} from '../constants/attendance-status-filter-options';
import {
  AttendanceWorkspaceTabs,
  type AttendanceWorkspaceTab,
} from './attendance-workspace-tabs';
import { useAttendanceRecordsContext } from './attendance-records-context';

export function AttendancePageToolbar({
  tab,
  onTabChange,
}: {
  tab: AttendanceWorkspaceTab;
  onTabChange: (tab: AttendanceWorkspaceTab) => void;
}) {
  const records = useAttendanceRecordsContext();
  const showFilters = tab === 'records';
  const statusFilterActive = records.statusFilter !== 'ALL';

  return (
    <div
      className={cn(
        'flex min-w-0 w-full max-w-full flex-wrap items-center gap-2',
        'lg:flex-nowrap lg:gap-2.5',
      )}
    >
      <AttendanceWorkspaceTabs value={tab} onValueChange={onTabChange} />

      {showFilters ? (
        <>
          <form
            className="min-w-0 w-full flex-[1_1_14rem] lg:min-w-[10rem]"
            onSubmit={(event) => event.preventDefault()}
          >
            <InputGroup leading={<Search className="size-4" aria-hidden="true" />} className="min-w-0 w-full">
              <Input
                className={cn(
                  CRM_PIPELINE_SEARCH_INPUT_CLASS,
                  'h-9 w-full min-w-0',
                  inputGroupPaddingClass({ leading: true }),
                )}
                placeholder="Search by name, email or code"
                value={records.searchDraft}
                onChange={(event) => records.setSearchDraft(event.target.value)}
                aria-label="Search employees"
              />
            </InputGroup>
          </form>

          <InputGroup
            leading={<CalendarDays className="size-4" aria-hidden="true" />}
            className="w-full shrink-0 sm:w-[10.75rem]"
          >
            <Input
              type="date"
              value={records.datePickerValue}
              onChange={(event) => records.setDateFilter(event.target.value)}
              className={cn(
                CRM_PIPELINE_SEARCH_INPUT_CLASS,
                'h-9 w-full min-w-0 shadow-xs',
                inputGroupPaddingClass({ leading: true }),
              )}
              aria-label="Attendance date"
            />
          </InputGroup>

          <InputGroup
            leading={<ListFilter className="size-4 shrink-0" aria-hidden="true" />}
            className="w-full shrink-0 sm:w-[11.5rem]"
          >
            <Select
              value={records.statusFilter}
              onValueChange={(value) =>
                records.setStatusFilter(value as AttendanceStatusFilter)
              }
            >
              <SelectTrigger
                aria-label="Filter by attendance status"
                className={cn(
                  CRM_PIPELINE_SEARCH_INPUT_CLASS,
                  'h-9 w-full min-w-0 border-0 shadow-none focus:ring-1 focus:ring-sky-100',
                  inputGroupPaddingClass({ leading: true }),
                  statusFilterActive && 'bg-primary/5',
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ATTENDANCE_STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </InputGroup>

          {records.refreshing ? (
            <Loader2
              className="text-muted-foreground size-4 shrink-0 animate-spin"
              aria-label="Refreshing records"
            />
          ) : null}

          {records.filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-9 shrink-0 px-2"
              onClick={records.clearFilters}
            >
              Clear
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
