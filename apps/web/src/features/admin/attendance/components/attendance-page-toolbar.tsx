'use client';

import { CalendarDays, ChevronLeft, ChevronRight, ListFilter, Loader2, Search } from 'lucide-react';
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
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { CRM_HEADER_TOOLBAR_CONTROLS_CLASS } from '@/features/admin/crm/components/crm-toolbar-header';
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
import { AttendanceCalendarMonthNav } from './attendance-calendar-month-nav';
import { useAttendanceRecordsContext } from './attendance-records-context';

export function AttendancePageToolbar({
  tab,
  onTabChange,
  layout = 'default',
}: {
  tab: AttendanceWorkspaceTab;
  onTabChange: (tab: AttendanceWorkspaceTab) => void;
  /** `header` — employee self-service: month navigation only, no Records tab row. */
  layout?: 'default' | 'header';
}) {
  const records = useAttendanceRecordsContext();
  const showFilters = layout === 'header' || tab === 'records';
  const statusFilterActive = records.statusFilter !== 'ALL';
  const selfScope = records.scope === 'self';

  if (selfScope && layout === 'header') {
    return (
      <div
        className={cn(
          CRM_HEADER_TOOLBAR_CONTROLS_CLASS,
          'min-w-0 w-full max-w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end',
        )}
      >
        <AttendanceCalendarMonthNav
          visibleMonth={records.visibleMonth}
          onVisibleMonthChange={records.setVisibleMonth}
          loading={records.refreshing}
        />

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
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-w-0 w-full max-w-full flex-wrap items-center gap-2',
        'lg:flex-nowrap lg:gap-2.5',
      )}
    >
      <AttendanceWorkspaceTabs
        value={tab}
        onValueChange={onTabChange}
        showSettings={!selfScope}
        showRecords={!selfScope}
      />

      {showFilters ? (
        <>
          {!selfScope ? (
            <form
              className="min-w-0 w-full max-w-full flex-[1_1_100%] sm:flex-[1_1_42%] sm:max-w-[45%] lg:max-w-[42%]"
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
          ) : null}

          <div className="flex min-w-0 w-full shrink-0 items-center gap-1 sm:w-auto">
            {selfScope ? (
              <AttendanceCalendarMonthNav
                visibleMonth={records.visibleMonth}
                onVisibleMonthChange={records.setVisibleMonth}
                loading={records.refreshing}
              />
            ) : (
              <>
                <TableIconButton
                  label="Previous day"
                  className="size-9 shrink-0 border border-input bg-card shadow-xs hover:bg-muted/50"
                  disabled={!records.datePickerValue}
                  onClick={() => records.shiftDateByDays(-1)}
                >
                  <ChevronLeft className="size-4" />
                </TableIconButton>
                <InputGroup
                  leading={<CalendarDays className="size-4" aria-hidden="true" />}
                  className="min-w-0 w-full sm:w-[10.75rem]"
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
                <TableIconButton
                  label="Next day"
                  className="size-9 shrink-0 border border-input bg-card shadow-xs hover:bg-muted/50"
                  disabled={!records.datePickerValue}
                  onClick={() => records.shiftDateByDays(1)}
                >
                  <ChevronRight className="size-4" />
                </TableIconButton>
              </>
            )}
          </div>

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
