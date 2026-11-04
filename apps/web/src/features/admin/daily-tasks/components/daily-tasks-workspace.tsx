'use client';

import { ChevronLeft, ChevronRight, Folder, ListFilter, Plus, Search, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { listAssignableEmployees } from '@/features/admin/employees/api/employees';
import { listProjects } from '@/features/admin/projects/api/projects';
import { listAllDailyTasksInRange } from '../api/list-all-daily-tasks';
import {
  fetchDailyTaskBoard,
  fetchDailyTaskWorkflowStages,
  listDailyTasks,
} from '../api/daily-tasks';
import type { OrgCalendarMonthDay } from '@techwin/contracts';
import type {
  DailyTaskBoardResponse,
  DailyTaskListItem,
  DailyTaskWorkflowStage,
} from '../types';
import { useDailyTasksPolling } from '../hooks/use-daily-tasks-polling';
import { addDaysToDateInput, localDateInputValue } from '../utils/local-date';
import {
  filterTasksByAssignment,
  filterTasksByStatusBucket,
  type TaskStatusBucket,
} from '../utils/task-metrics';
import { useAttendanceOrgTimeZone } from '@/features/admin/attendance/hooks/use-attendance-org-timezone';
import { todayKeyInTimeZone } from '@/features/admin/attendance/utils/calendar-month';
import { useOrgCalendarMonth } from '@/features/admin/org-calendar/hooks/use-org-calendar-month';
import { DailyTaskAssignDialog } from './daily-task-assign-dialog';
import { DailyTaskCalendarView } from './daily-task-calendar-view';
import { DailyTaskOrgDayBadge } from './daily-task-org-day-badge';
import { DailyTaskDetailDrawer } from './daily-task-detail-drawer';
import { DailyTaskKanbanBoard } from './daily-task-kanban-board';
import { DailyTaskListView } from './daily-task-list-view';
import { DailyTaskWorkflowDialog } from './daily-task-workflow-dialog';
import { MyDailyTasksPage } from './my-daily-tasks-page';
import {
  DailyTasksViewTabs,
  type DailyTasksWorkspaceView,
} from './daily-tasks-view-tabs';

type WorkspaceView = DailyTasksWorkspaceView;

const FILTER_SELECT_TRIGGER_CLASS =
  'h-9 min-w-0 shrink-0 gap-1.5 rounded-lg py-0 pl-2.5 sm:w-[9.375rem] sm:max-w-[10.5rem] [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:text-left';

const TOOLBAR_ROW_SCROLL_CLASS =
  'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export function DailyTasksWorkspace({
  title = 'Daily Task Management',
  description = 'Create, assign and monitor daily work across your organization.',
  defaultView = 'kanban',
}: {
  title?: string;
  description?: string;
  defaultView?: WorkspaceView;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { has } = useAdminAccess();
  const canAssignTasks = has('tasks.create') && has('tasks.assign');
  const canManageWorkflow = has('tasks.update') || has('daily_tasks.manage_workflow');
  const workspaceMode = searchParams.get('workspace') === 'my' ? 'my' : 'team';
  const clientToday = useMemo(() => localDateInputValue(), []);
  const [assignDate, setAssignDate] = useState(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
    return clientToday;
  });
  const [view, setView] = useState<WorkspaceView>(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'kanban' || viewParam === 'list' || viewParam === 'calendar') return viewParam;
    return defaultView;
  });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GENERAL' | 'PROJECT'>('ALL');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');

  const [board, setBoard] = useState<DailyTaskBoardResponse | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState(false);

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [listData, setListData] = useState<Awaited<ReturnType<typeof listDailyTasks>> | null>(null);
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
  const [calendarAssignmentFilter, setCalendarAssignmentFilter] = useState<
    'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  >('ALL');
  const [calendarWorkflowStageId, setCalendarWorkflowStageId] = useState('');

  const orgTimeZone = useAttendanceOrgTimeZone();
  const orgTodayKey = useMemo(() => todayKeyInTimeZone(orgTimeZone), [orgTimeZone]);

  const orgMonthAnchor = view === 'calendar' ? calendarAnchor : assignDate;
  const orgMonthParts = useMemo(() => {
    const d = new Date(`${orgMonthAnchor}T12:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [orgMonthAnchor]);
  const { data: orgCalendarMonth, loading: orgCalendarLoading } = useOrgCalendarMonth({
    year: orgMonthParts.year,
    month: orgMonthParts.month,
    enabled: view !== 'list',
  });
  const orgDaysByDate = useMemo(() => {
    const map = new Map<string, OrgCalendarMonthDay>();
    for (const day of orgCalendarMonth?.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [orgCalendarMonth]);
  const orgDayForAssignDate = orgDaysByDate.get(assignDate);

  useEffect(() => {
    setCalendarAnchor(assignDate);
  }, [assignDate]);

  const openDailyTasksForDate = useCallback(
    (date: string) => {
      setAssignDate(date);
      setCalendarAnchor(date);
      setView('kanban');
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', date);
      params.set('view', 'kanban');
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const [stages, setStages] = useState<readonly DailyTaskWorkflowStage[]>([]);
  const [employees, setEmployees] = useState<readonly { id: string; displayName: string }[]>([]);
  const [projects, setProjects] = useState<readonly { id: string; name: string }[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPrefillDate, setAssignPrefillDate] = useState(assignDate);
  const [assignPrefillStageId, setAssignPrefillStageId] = useState<string | undefined>(undefined);
  const [editTask, setEditTask] = useState<DailyTaskListItem | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRescheduleFocus, setDetailRescheduleFocus] = useState(false);

  const filterQuery = useMemo(
    () => ({
      assignDate,
      clientToday,
      search: search.trim() || undefined,
      type: typeFilter === 'ALL' ? undefined : typeFilter,
      employeeId: employeeId || undefined,
      projectId: projectId || undefined,
    }),
    [assignDate, clientToday, search, typeFilter, employeeId, projectId],
  );

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    setBoardError(false);
    try {
      const response = await fetchDailyTaskBoard(filterQuery);
      setBoard(response);
      setStages(response.stages);
    } catch {
      setBoardError(true);
    } finally {
      setBoardLoading(false);
    }
  }, [filterQuery]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(false);
    try {
      const response = await listDailyTasks({
        ...filterQuery,
        page: listPage,
        pageSize: listPageSize,
        sortBy: 'priority',
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
      const response = await listAllDailyTasksInRange({
        assignDateFrom,
        assignDateTo,
        clientToday,
        search: filterQuery.search,
        type: filterQuery.type,
        employeeId: filterQuery.employeeId,
        projectId: filterQuery.projectId,
        priority: calendarPriorityFilter === 'ALL' ? undefined : calendarPriorityFilter,
        workflowStageId: calendarWorkflowStageId || undefined,
        completedOnly: calendarStatusFilter === 'COMPLETED' ? true : undefined,
        overdueOnly: calendarStatusFilter === 'OVERDUE' ? true : undefined,
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
    calendarStatusFilter,
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
    items = filterTasksByAssignment(items, calendarAssignmentFilter);
    return items;
  }, [calendarRawTasks, calendarStatusFilter, calendarAssignmentFilter]);

  useEffect(() => {
    void fetchDailyTaskWorkflowStages().then((r) => setStages(r.stages));
    void listAssignableEmployees().then((r) =>
      setEmployees(r.items.map((e) => ({ id: e.id, displayName: e.displayName }))),
    );
    void listProjects({ pageSize: 100, status: 'ACTIVE' }).then((r) =>
      setProjects(r.items.map((p) => ({ id: p.id, name: p.name }))),
    );
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

  useDailyTasksPolling(refreshAll, workspaceMode === 'team');

  const openAssign = (options?: { date?: string; workflowStageId?: string }) => {
    if (!canAssignTasks) return;
    setEditTask(null);
    setAssignPrefillDate(options?.date ?? assignDate);
    setAssignPrefillStageId(options?.workflowStageId);
    setAssignOpen(true);
  };

  const openEdit = (task: DailyTaskListItem) => {
    setEditTask(task);
    setAssignPrefillStageId(undefined);
    setAssignOpen(true);
  };

  const openTask = (task: DailyTaskListItem, options?: { focusReschedule?: boolean }) => {
    setDetailId(task.id);
    setDetailRescheduleFocus(Boolean(options?.focusReschedule));
    setDetailOpen(true);
  };

  if (workspaceMode === 'my') {
    return <MyDailyTasksPage />;
  }

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-3 pb-8 pt-1">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Tasks' },
          { label: title },
        ]}
        className="mb-0.5"
      />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
          <CrmToolbarHeader
            title={title}
            description={description}
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
                {canAssignTasks ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                    onClick={() => openAssign({})}
                  >
                    <Plus aria-hidden="true" />
                    Assign Task
                  </Button>
                ) : null}
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
                    <DailyTaskOrgDayBadge
                      dateKey={assignDate}
                      day={orgDayForAssignDate}
                      orgTodayKey={orgTodayKey}
                    />
                  </>
                ) : null}
                <div className="min-w-0 flex-1 basis-[10rem]">
                  <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
                    <Input
                      className={cn(
                        CRM_PIPELINE_SEARCH_INPUT_CLASS,
                        inputGroupPaddingClass({ leading: true }),
                        'h-9',
                      )}
                      placeholder="Search tasks…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search tasks"
                    />
                  </InputGroup>
                </div>
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
                <Select
                  value={employeeId || '__all__'}
                  onValueChange={(v) => setEmployeeId(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Employee">
                    <Users className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All employees</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={projectId || '__all__'} onValueChange={(v) => setProjectId(v === '__all__' ? '' : v)}>
                  <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Project">
                    <Folder className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
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
                      value={calendarAssignmentFilter}
                      onValueChange={(v) => setCalendarAssignmentFilter(v as typeof calendarAssignmentFilter)}
                    >
                      <SelectTrigger className={FILTER_SELECT_TRIGGER_CLASS} aria-label="Assignment">
                        <SelectValue placeholder="All assignments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Assigned & unassigned</SelectItem>
                        <SelectItem value="ASSIGNED">Assigned only</SelectItem>
                        <SelectItem value="UNASSIGNED">Unassigned only</SelectItem>
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
              </div>
            }
          />

          {view === 'kanban' ? (
            boardLoading && !board ? (
              <p className="text-muted-foreground py-12 text-center text-sm">Loading board…</p>
            ) : boardError ? (
              <div className="py-12 text-center">
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
                    onRefresh={refreshAll}
                    onOpenTask={(task) => openTask(task)}
                    onEditTask={openEdit}
                    onRescheduleTask={(task) => openTask(task, { focusReschedule: true })}
                    onAssignTask={
                      canAssignTasks ? (workflowStageId) => openAssign({ workflowStageId }) : undefined
                    }
                    onManageWorkflow={canManageWorkflow ? () => setWorkflowOpen(true) : undefined}
                  />
                </div>
              </>
            ) : null
          ) : null}

          {view === 'list' ? (
            <div className="min-w-0 px-4 pb-4 sm:px-5">
              <DailyTaskListView
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
                onOpenTask={(task) => openTask(task)}
              />
            </div>
          ) : null}

          {view === 'calendar' ? (
            <div className="flex min-h-[calc(100vh-14rem)] min-w-0 flex-col px-4 pb-4 sm:px-5">
              <DailyTaskCalendarView
                anchorDate={calendarAnchor}
                selectedDate={assignDate}
                tasks={calendarTasks}
                orgDaysByDate={orgDaysByDate}
                orgTodayKey={orgTodayKey}
                loading={calendarLoading || orgCalendarLoading}
                onAnchorChange={setCalendarAnchor}
                onSelectDate={openDailyTasksForDate}
              />
            </div>
          ) : null}
        </div>
      </section>

      <DailyTaskAssignDialog
        open={assignOpen}
        assignDate={assignPrefillDate}
        prefillWorkflowStageId={assignPrefillStageId}
        editTask={editTask}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) {
            setAssignPrefillStageId(undefined);
            setEditTask(null);
          }
        }}
        onCreated={refreshAll}
      />
      <DailyTaskWorkflowDialog open={workflowOpen} onOpenChange={setWorkflowOpen} onSaved={refreshAll} />
      <DailyTaskDetailDrawer
        taskId={detailId}
        open={detailOpen}
        stages={stages}
        onOpenChange={setDetailOpen}
        onChanged={refreshAll}
        focusReschedule={detailRescheduleFocus}
      />
    </div>
  );
}
