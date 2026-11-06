'use client';

import { Flag, ListFilter, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TaskCalendarTaskDto } from '@techwin/contracts';
import type { CrmFilterOption } from '@/components/shared/crm-icon-filter-dropdown';
import { Button } from '@/components/ui/button';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { taskCalendarPageSearchSchema, type TaskCalendarPageSearch } from '../schemas/task-calendar.schema';
import { useCalendarFilters } from '../hooks/use-calendar-filters';
import { useCalendarNavigation } from '../hooks/use-calendar-navigation';
import { useCalendarTasks } from '../hooks/use-calendar-tasks';
import { TaskCalendarFilterMenu } from '../components/task-calendar-filter-menu';
import { TaskCalendarGrid } from '../components/task-calendar-grid';
import { TaskCalendarHeader } from '../components/task-calendar-header';
import { TaskCalendarStatusLegend } from '../components/task-calendar-status-legend';
import { TaskCalendarTaskDetailsModal } from '../components/task-calendar-task-details-modal';
import { TaskCalendarToolbar } from '../components/task-calendar-toolbar';
import { addMonths, parseMonthKey } from '../utils/calendar-date.utils';

const EMPTY_FILTERS: TaskCalendarPageSearch = {};

function parseFiltersFromSearch(searchParams: URLSearchParams): TaskCalendarPageSearch {
  const displayStatusRaw = searchParams.get('displayStatus') ?? undefined;
  const raw = {
    search: searchParams.get('search') ?? undefined,
    employeeId: searchParams.get('employeeId') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    source: searchParams.get('source') ?? undefined,
    priority: searchParams.get('priority') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    /** Overdue display filter removed from Task Calendar UI — ignore legacy `OVERDUE` in URL. */
    displayStatus: displayStatusRaw === 'OVERDUE' ? undefined : displayStatusRaw,
  };
  const parsed = taskCalendarPageSearchSchema.safeParse(raw);
  return parsed.success ? parsed.data : EMPTY_FILTERS;
}

type FilterParamKey =
  | 'search'
  | 'employeeId'
  | 'type'
  | 'source'
  | 'priority'
  | 'status'
  | 'displayStatus';

export function TaskCalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { monthKey, setMonthKey } = useCalendarNavigation();
  const { filters: filterOptions, loading: filtersLoading } = useCalendarFilters();

  const filters = useMemo(() => parseFiltersFromSearch(searchParams), [searchParams]);
  const urlSearch = searchParams.get('search') ?? '';

  const {
    data,
    daysByDate,
    isSearching,
    isFiltering,
    showGridSkeleton,
    error,
    retry,
    searchDraft,
    setSearchDraft,
    clientToday,
  } = useCalendarTasks(monthKey, filters);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<TaskCalendarTaskDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const taskTypeOptions = useMemo<CrmFilterOption[]>(
    () => (filterOptions?.taskTypes ?? []).map((t) => ({ value: t.value, label: t.label })),
    [filterOptions],
  );
  const employeeOptions = useMemo<CrmFilterOption[]>(
    () => (filterOptions?.employees ?? []).map((e) => ({ value: e.id, label: e.label })),
    [filterOptions],
  );
  const priorityOptions = useMemo<CrmFilterOption[]>(
    () => (filterOptions?.priorities ?? []).map((p) => ({ value: p.value, label: p.label })),
    [filterOptions],
  );

  const replaceQuery = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      mutate(p);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchDraft(urlSearch);
  }, [urlSearch, setSearchDraft]);

  useEffect(() => {
    if (!searchParams.get('projectId')) return;
    replaceQuery((p) => {
      p.delete('projectId');
    });
  }, [searchParams, replaceQuery]);

  useEffect(() => {
    const parsed = parseMonthKey(monthKey);
    if (!parsed) return;
    const first = `${monthKey}-01`;
    const monthPrefix = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`;
    const inMonth = clientToday.startsWith(monthPrefix);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep selected date within the viewed month
    setSelectedDate((prev) => {
      if (prev && prev.startsWith(monthPrefix)) return prev;
      return inMonth ? clientToday : first;
    });
  }, [monthKey, clientToday]);

  useEffect(() => {
    if (searchParams.get('displayStatus') !== 'OVERDUE') return;
    replaceQuery((p) => {
      p.delete('displayStatus');
    });
  }, [searchParams, replaceQuery]);

  useEffect(() => {
    const id = setTimeout(() => {
      const trimmed = searchDraft.trim();
      if (trimmed === urlSearch) return;
      replaceQuery((p) => {
        if (trimmed) p.set('search', trimmed);
        else p.delete('search');
      });
    }, 400);
    return () => clearTimeout(id);
  }, [searchDraft, urlSearch, replaceQuery]);

  const filterSelect = useCallback(
    (key: FilterParamKey, value: string) => {
      replaceQuery((p) => {
        const v = value === 'all' ? undefined : value;
        if (v) p.set(key, v);
        else p.delete(key);
      });
    },
    [replaceQuery],
  );

  const navigateToDailyKanban = useCallback(
    (date: string) => {
      router.push(`/admin/daily-tasks?date=${encodeURIComponent(date)}&view=kanban`);
    },
    [router],
  );

  const openDetail = (task: TaskCalendarTaskDto) => {
    setDetailTask(task);
    setDetailOpen(true);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-3 pb-10 pt-1">
      <AdminBreadcrumb
        className="px-3 sm:px-5"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Tasks' },
          { label: 'Task Calendar' },
        ]}
      />
      <section className="workspace-surface min-w-0 overflow-hidden rounded-lg">
        <TaskCalendarHeader
          toolbar={
            <TaskCalendarToolbar
              monthKey={monthKey}
              search={searchDraft}
              searchInFlight={isSearching}
              onSearchChange={setSearchDraft}
              onPrevMonth={() => setMonthKey(addMonths(monthKey, -1))}
              onNextMonth={() => setMonthKey(addMonths(monthKey, 1))}
              onMonthKeyChange={setMonthKey}
              filtersBusy={isFiltering}
              filters={
                <>
                  <TaskCalendarFilterMenu
                    icon={<ListFilter aria-hidden="true" />}
                    tooltip="Filter"
                    label="Task type"
                    allLabel="All types"
                    value={filters.type ?? 'all'}
                    options={taskTypeOptions}
                    onValueChange={(v) => filterSelect('type', v)}
                    disabled={filtersLoading}
                  />
                  <TaskCalendarFilterMenu
                    icon={<Users aria-hidden="true" />}
                    tooltip="Employee"
                    label="Employee"
                    allLabel="All employees"
                    value={filters.employeeId ?? 'all'}
                    options={employeeOptions}
                    onValueChange={(v) => filterSelect('employeeId', v)}
                    disabled={filtersLoading}
                  />
                  <TaskCalendarFilterMenu
                    icon={<Flag aria-hidden="true" />}
                    tooltip="Priority"
                    label="Priority"
                    allLabel="All priorities"
                    value={filters.priority ?? 'all'}
                    options={priorityOptions}
                    onValueChange={(v) => filterSelect('priority', v)}
                    disabled={filtersLoading}
                  />
                </>
              }
            />
          }
        />

        <div className="min-w-0 px-3 py-3 sm:px-5">
          {error ? (
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-destructive text-sm">Unable to load the task calendar.</p>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </div>
          ) : null}
          <TaskCalendarGrid
            monthKey={monthKey}
            clientToday={clientToday}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            daysByDate={daysByDate}
            cellContentLoading={showGridSkeleton}
            onOpenTask={openDetail}
            onNavigateToDailyKanban={navigateToDailyKanban}
          />
          <TaskCalendarStatusLegend />
          {data ? (
            data.tasks.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-[11px]">
                No tasks scheduled this month for the selected filters.
              </p>
            ) : (
              <p className="text-muted-foreground mt-2 text-[11px]">
                Showing {data.tasks.length} task{data.tasks.length === 1 ? '' : 's'} in range {data.startDate} —{' '}
                {data.endDate}.
              </p>
            )
          ) : null}
        </div>
      </section>

      <TaskCalendarTaskDetailsModal task={detailTask} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
