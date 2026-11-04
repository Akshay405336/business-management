'use client';

import { ChevronLeft, ChevronRight, ListFilter, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import {
  fetchDailyTaskWorkflowStages,
  listMyDailyTasks,
} from '@/features/admin/daily-tasks/api/daily-tasks';
import { listAllMyDailyTasksInRange } from '@/features/admin/daily-tasks/api/list-my-daily-tasks-in-range';
import { DailyTaskCalendarView } from '@/features/admin/daily-tasks/components/daily-task-calendar-view';
import { DailyTaskDetailDrawer } from '@/features/admin/daily-tasks/components/daily-task-detail-drawer';
import { DailyTaskKanbanBoard } from '@/features/admin/daily-tasks/components/daily-task-kanban-board';
import { DailyTaskListView } from '@/features/admin/daily-tasks/components/daily-task-list-view';
import {
  DailyTasksViewTabs,
  type DailyTasksWorkspaceView,
} from '@/features/admin/daily-tasks/components/daily-tasks-view-tabs';
import { useDailyTasksPolling } from '@/features/admin/daily-tasks/hooks/use-daily-tasks-polling';
import type {
  DailyTaskBoardResponse,
  DailyTaskListItem,
  DailyTaskWorkflowStage,
} from '@/features/admin/daily-tasks/types';
import { buildMyTaskBoard } from '@/features/admin/daily-tasks/utils/build-my-task-board';
import { addDaysToDateInput, localDateInputValue } from '@/features/admin/daily-tasks/utils/local-date';
import {
  filterTasksByStatusBucket,
  type TaskStatusBucket,
} from '@/features/admin/daily-tasks/utils/task-metrics';
import { usePortalNavigation } from '@/features/auth/portal/use-portal-navigation';
import { cn } from '@/shared/lib/utils';

const FILTER_SELECT_TRIGGER_CLASS =
  'h-9 min-w-0 shrink-0 gap-1.5 rounded-lg py-0 pl-2.5 sm:w-[9.375rem] sm:max-w-[10.5rem] [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:text-left';

const TOOLBAR_ROW_SCROLL_CLASS =
  'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export function EmployeeDailyTasksWorkspace() {
  const { dashboardBreadcrumb } = usePortalNavigation();
  const clientToday = useMemo(() => localDateInputValue(), []);
  const [view, setView] = useState<DailyTasksWorkspaceView>('kanban');
  const [assignDate, setAssignDate] = useState(clientToday);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GENERAL' | 'PROJECT'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('ALL');
  const [stageFilter, setStageFilter] = useState('');

  const [stages, setStages] = useState<readonly DailyTaskWorkflowStage[]>([]);

  const [board, setBoard] = useState<DailyTaskBoardResponse | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState(false);

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [listData, setListData] = useState<Awaited<ReturnType<typeof listMyDailyTasks>> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(false);

  const [calendarRawTasks, setCalendarRawTasks] = useState<readonly DailyTaskListItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarAnchor, setCalendarAnchor] = useState(assignDate);
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<
    'ALL' | TaskStatusBucket | 'COMPLETED' | 'OVERDUE'
  >('ALL');
  const [calendarPriorityFilter, setCalendarPriorityFilter] = useState<
    'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  >('ALL');
  const [calendarWorkflowStageId, setCalendarWorkflowStageId] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setCalendarAnchor(assignDate);
  }, [assignDate]);

  const filterQuery = useMemo(
    () => ({
      assignDate,
      clientToday,
      search: search.trim() || undefined,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      workflowStageId: stageFilter || undefined,
    }),
    [assignDate, clientToday, search, typeFilter, priorityFilter, stageFilter],
  );

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardError(false);
    try {
      const [stageResponse, taskResponse] = await Promise.all([
        stages.length > 0 ? Promise.resolve({ stages }) : fetchDailyTaskWorkflowStages(),
        listMyDailyTasks({
          ...filterQuery,
          page: 1,
          pageSize: 100,
          sortBy: 'priority',
          sortDir: 'desc',
        }),
      ]);
      if (stages.length === 0) setStages(stageResponse.stages);
      setBoard(
        buildMyTaskBoard({
          assignDate,
          stages: stageResponse.stages,
          tasks: taskResponse.items,
        }),
      );
    } catch {
      setBoardError(true);
      setBoard(null);
    } finally {
      setBoardLoading(false);
    }
  }, [assignDate, filterQuery, stages]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(false);
    try {
      const response = await listMyDailyTasks({
        ...filterQuery,
        page: listPage,
        pageSize: listPageSize,
        sortBy: 'updatedAt',
        sortDir: 'desc',
      });
      setListData(response);
    } catch {
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [filterQuery, listPage, listPageSize]);

  const loadCalendarMonth = useCallback(async () => {
    const anchor = new Date(`${calendarAnchor}T12:00:00`);
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const assignDateFrom = localDateInputValue(start);
    const assignDateTo = localDateInputValue(end);
    setCalendarLoading(true);
    try {
      const response = await listAllMyDailyTasksInRange({
        assignDateFrom,
        assignDateTo,
        clientToday,
        search: filterQuery.search,
        type: filterQuery.type,
        priority: calendarPriorityFilter === 'ALL' ? undefined : calendarPriorityFilter,
        workflowStageId: calendarWorkflowStageId || undefined,
      });
      setCalendarRawTasks(response.items);
    } catch {
      setCalendarRawTasks([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [
    calendarAnchor,
    calendarPriorityFilter,
    calendarWorkflowStageId,
    clientToday,
    filterQuery,
  ]);

  const calendarTasks = useMemo(() => {
    let items = [...calendarRawTasks];
    if (calendarStatusFilter === 'in_progress' || calendarStatusFilter === 'pending') {
      items = filterTasksByStatusBucket(items, calendarStatusFilter);
    } else if (
      calendarStatusFilter !== 'ALL' &&
      calendarStatusFilter !== 'COMPLETED' &&
      calendarStatusFilter !== 'OVERDUE'
    ) {
      items = filterTasksByStatusBucket(items, calendarStatusFilter);
    }
    if (calendarStatusFilter === 'COMPLETED') {
      items = items.filter((t) => t.completedAt);
    }
    if (calendarStatusFilter === 'OVERDUE') {
      items = items.filter((t) => t.isOverdue);
    }
    return items;
  }, [calendarRawTasks, calendarStatusFilter]);

  useEffect(() => {
    void fetchDailyTaskWorkflowStages().then((r) => setStages(r.stages));
  }, []);

  useEffect(() => {
    if (view === 'kanban') void loadBoard();
  }, [view, loadBoard]);

  useEffect(() => {
    if (view === 'list') void loadList();
  }, [view, loadList]);

  useEffect(() => {
    if (view === 'calendar') void loadCalendarMonth();
  }, [view, loadCalendarMonth]);

  useEffect(() => {
    setListPage(1);
  }, [filterQuery]);

  const refreshAll = async () => {
    await Promise.all([
      view === 'kanban' ? loadBoard() : Promise.resolve(),
      view === 'list' ? loadList() : Promise.resolve(),
      view === 'calendar' ? loadCalendarMonth() : Promise.resolve(),
    ]);
  };

  useDailyTasksPolling(refreshAll, true);

  const openTask = (task: DailyTaskListItem) => {
    setDetailId(task.id);
    setDetailOpen(true);
  };

  const openDailyTasksForDate = (date: string) => {
    setAssignDate(date);
    setCalendarAnchor(date);
    setView('kanban');
  };

  const filtersActive =
    search.trim().length > 0 ||
    typeFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    stageFilter.length > 0;

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setPriorityFilter('ALL');
    setStageFilter('');
  };

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-3 pb-8 pt-1">
      <AdminBreadcrumb
        breadcrumbs={[dashboardBreadcrumb, { label: 'My Daily Tasks' }]}
        className="mb-0.5"
      />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title="My Daily Tasks"
            description="View your assigned work and keep your progress updated."
            className="rounded-none border-0 bg-card shadow-none"
            headerRowClassName="flex-nowrap items-center gap-3 min-w-0 overflow-hidden"
            titleSectionClassName="min-w-0 shrink overflow-hidden sm:max-w-[13rem] lg:max-w-[15rem]"
            descriptionClassName="truncate"
            toolbarRowClassName={cn(
              'ml-auto flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2',
              TOOLBAR_ROW_SCROLL_CLASS,
            )}
            toolbar={
              <div className="flex w-max max-w-full flex-nowrap items-center justify-end gap-2 pl-1">
                <DailyTasksViewTabs value={view} onValueChange={setView} />
              </div>
            }
            bottomRow={
              <div
                className={cn(
                  'flex min-w-0 w-full flex-wrap items-center gap-2 lg:flex-nowrap',
                  TOOLBAR_ROW_SCROLL_CLASS,
                )}
              >
                {view !== 'calendar' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      aria-label="Previous day"
                      onClick={() => setAssignDate(addDaysToDateInput(assignDate, -1))}
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant={assignDate === clientToday ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 shrink-0 px-3"
                      onClick={() => setAssignDate(clientToday)}
                    >
                      Today
                    </Button>
                    <Input
                      type="date"
                      aria-label="Selected date"
                      className="h-9 w-[9.75rem] shrink-0 rounded-lg sm:w-[10.5rem]"
                      value={assignDate}
                      onChange={(e) => setAssignDate(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      aria-label="Next day"
                      onClick={() => setAssignDate(addDaysToDateInput(assignDate, 1))}
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
                <form
                  className="w-[11.5rem] shrink-0 sm:w-[13rem] md:min-w-[13rem] md:max-w-[20rem] md:flex-1"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
                    <Input
                      className={cn(
                        CRM_PIPELINE_SEARCH_INPUT_CLASS,
                        inputGroupPaddingClass({ leading: true }),
                        'h-9 w-full',
                      )}
                      placeholder="Search assigned tasks…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search assigned tasks"
                    />
                  </InputGroup>
                </form>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Task type">
                    <ListFilter className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="PROJECT">Project</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Priority">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stageFilter || '__all__'} onValueChange={(v) => setStageFilter(v === '__all__' ? '' : v)}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Workflow status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {stages
                      .filter((s) => s.isActive)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {view === 'calendar' ? (
                  <>
                    <Select
                      value={calendarStatusFilter}
                      onValueChange={(v) => {
                        setCalendarStatusFilter(v as typeof calendarStatusFilter);
                        setCalendarWorkflowStageId('');
                      }}
                    >
                      <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Task status">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={calendarPriorityFilter}
                      onValueChange={(v) => setCalendarPriorityFilter(v as typeof calendarPriorityFilter)}
                    >
                      <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Priority">
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All priorities</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={calendarWorkflowStageId || '__all__'}
                      onValueChange={(v) => {
                        setCalendarWorkflowStageId(v === '__all__' ? '' : v);
                        if (v !== '__all__') setCalendarStatusFilter('ALL');
                      }}
                    >
                      <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Workflow stage">
                        <SelectValue placeholder="All workflow stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All workflow stages</SelectItem>
                        {stages
                          .filter((s) => s.isActive)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : null}
                {filtersActive ? (
                  <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            }
          />

          {view === 'kanban' ? (
            boardLoading && !board ? (
              <p className="text-muted-foreground py-12 text-center text-sm">Loading board…</p>
            ) : boardError ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground mb-3 text-sm">Could not load your tasks.</p>
                <Button type="button" variant="outline" onClick={() => void loadBoard()}>
                  Retry
                </Button>
              </div>
            ) : board ? (
              <>
                <div aria-hidden className="table-header-edge" />
                <div className="min-w-0 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
                  <DailyTaskKanbanBoard
                    board={board}
                    employeeMode
                    onRefresh={refreshAll}
                    onOpenTask={openTask}
                    onEditTask={openTask}
                    onRescheduleTask={openTask}
                  />
                </div>
              </>
            ) : null
          ) : null}

          {view === 'list' ? (
            <div className="min-w-0 px-4 pb-4 sm:px-5">
              <DailyTaskListView
                employeeMode
                data={listData}
                loading={listLoading}
                error={listError}
                pageSize={listPageSize}
                onPageChange={setListPage}
                onPageSizeChange={(size) => {
                  setListPageSize(size);
                  setListPage(1);
                }}
                onRetry={() => void loadList()}
                onOpenTask={openTask}
              />
            </div>
          ) : null}

          {view === 'calendar' ? (
            <div className="flex min-h-[calc(100vh-14rem)] min-w-0 flex-col px-4 pb-4 sm:px-5">
              <DailyTaskCalendarView
                anchorDate={calendarAnchor}
                selectedDate={assignDate}
                tasks={calendarTasks}
                loading={calendarLoading}
                onAnchorChange={setCalendarAnchor}
                onSelectDate={openDailyTasksForDate}
              />
            </div>
          ) : null}
        </div>
      </section>

      <DailyTaskDetailDrawer
        taskId={detailId}
        open={detailOpen}
        stages={stages}
        employeeMode
        onOpenChange={setDetailOpen}
        onChanged={refreshAll}
      />
    </div>
  );
}
