'use client';

import { Flag, Folder, GitBranch, ListFilter, Plus, UserRound, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CrmIconFilterDropdown, type CrmFilterOption } from '@/components/shared/crm-icon-filter-dropdown';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { useAdminAccess } from '@/features/admin/auth/components/admin-access-provider';
import { useAdminToast } from '@/features/admin/components/toast';
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
import { localDateInputValue } from '../utils/local-date';
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
import { DailyTaskDateNavigation } from './daily-task-date-navigation';
import { DailyTaskHeader } from './daily-task-header';
import {
  DailyTaskSort,
  type DailyTaskSortBy,
  type DailyTaskSortDir,
} from './daily-task-sort';
import { DailyTaskDetailDrawer } from './daily-task-detail-drawer';
import { DailyTaskKanbanBoard } from './daily-task-kanban-board';
import { DailyTaskListView } from './daily-task-list-view';
import { DailyTaskToolbar, DailyTaskToolbarSearch } from './daily-task-toolbar';
import { DailyTaskWorkflowDialog } from './daily-task-workflow-dialog';
import { MyDailyTasksPage } from './my-daily-tasks-page';
import {
  DailyTasksViewTabs,
  type DailyTasksWorkspaceView,
} from './daily-tasks-view-tabs';

type WorkspaceView = DailyTasksWorkspaceView;

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
  const toast = useAdminToast();
  const missingBoardTaskToast = useRef<string | null>(null);
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
    if (viewParam === 'kanban' || viewParam === 'list') return viewParam;
    return defaultView;
  });

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'kanban' || viewParam === 'list') {
      setView(viewParam);
    }
  }, [searchParams]);

  const setViewInUrl = useCallback(
    (next: WorkspaceView) => {
      setView(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GENERAL' | 'PROJECT'>('ALL');
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('ALL');
  const [sortBy, setSortBy] = useState<DailyTaskSortBy>('priority');
  const [sortDir, setSortDir] = useState<DailyTaskSortDir>('desc');

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
  useEffect(() => {
    setCalendarAnchor(assignDate);
  }, [assignDate]);

  const openDailyTasksForDate = useCallback(
    (date: string) => {
      setAssignDate(date);
      setCalendarAnchor(date);
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', date);
      params.set('view', 'kanban');
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const setAssignDateFromNav = useCallback(
    (next: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
      setAssignDate(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', next);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setAssignDate((prev) => (dateParam !== prev ? dateParam : prev));
    }
  }, [searchParams]);

  const [stages, setStages] = useState<readonly DailyTaskWorkflowStage[]>([]);
  const [employees, setEmployees] = useState<readonly { id: string; displayName: string }[]>([]);
  const [projects, setProjects] = useState<readonly { id: string; name: string }[]>([]);

  const typeMenuOptions = useMemo<CrmFilterOption[]>(
    () => [
      { value: 'GENERAL', label: 'General' },
      { value: 'PROJECT', label: 'Project' },
    ],
    [],
  );
  const employeeMenuOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.displayName })),
    [employees],
  );
  const projectMenuOptions = useMemo(
    () => projects.map((p) => ({ value: p.id, label: p.name })),
    [projects],
  );
  const priorityMenuOptions = useMemo<CrmFilterOption[]>(
    () => [
      { value: 'LOW', label: 'Low' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'HIGH', label: 'High' },
      { value: 'URGENT', label: 'Urgent' },
    ],
    [],
  );
  const calendarStatusMenuOptions = useMemo<CrmFilterOption[]>(
    () => [
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'pending', label: 'Pending' },
      { value: 'OVERDUE', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    [],
  );
  const calendarAssignmentMenuOptions = useMemo<CrmFilterOption[]>(
    () => [
      { value: 'ASSIGNED', label: 'Assigned only' },
      { value: 'UNASSIGNED', label: 'Unassigned only' },
    ],
    [],
  );
  const workflowStageMenuOptions = useMemo(
    () =>
      stages
        .filter((s) => s.isActive)
        .map((s) => ({ value: s.id, label: s.name })),
    [stages],
  );

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
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
    }),
    [assignDate, clientToday, search, typeFilter, employeeId, projectId, priorityFilter],
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
        sortBy,
        sortDir,
      });
      setListData(response);
    } catch {
      setListError(true);
    } finally {
      setListLoading(false);
    }
  }, [filterQuery, listPage, listPageSize, sortBy, sortDir]);

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
        priority:
          calendarPriorityFilter === 'ALL'
            ? filterQuery.priority
            : calendarPriorityFilter,
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
    filterQuery.priority,
    filterQuery.search,
    filterQuery.type,
    filterQuery.employeeId,
    filterQuery.projectId,
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete('focus');
    params.set('taskId', task.id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const highlightTaskId = useMemo(() => {
    if (searchParams.get('focus') !== 'board') return null;
    const tid = searchParams.get('taskId');
    if (!tid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tid)) {
      return null;
    }
    return tid;
  }, [searchParams]);

  useEffect(() => {
    const tid = searchParams.get('taskId');
    if (!tid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tid)) {
      return;
    }
    if (searchParams.get('focus') === 'board') return;
    setDetailId(tid);
    setDetailOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'board') return;
    const tid = searchParams.get('taskId');
    if (!tid || boardLoading || boardError || !board || board.assignDate !== assignDate) return;
    const found = board.columns.some((column) => column.tasks.some((task) => task.id === tid));
    if (found) return;
    if (missingBoardTaskToast.current === tid) return;
    missingBoardTaskToast.current = tid;
    toast.error('That task is not on the board for this date.');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('taskId');
    params.delete('focus');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [assignDate, board, boardError, boardLoading, pathname, router, searchParams, toast]);

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
          <div className="flex min-w-0 flex-col gap-3 border-b border-[#E8E8EF] px-4 py-3 sm:px-5">
            <DailyTaskHeader
              title={title}
              description={description}
              toolbar={
                <>
                  <DailyTasksViewTabs
                    value={view === 'calendar' ? 'kanban' : view}
                    onValueChange={setViewInUrl}
                    includeCalendar={false}
                  />
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
                </>
              }
            />
            <DailyTaskToolbar>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                {view !== 'calendar' ? (
                  <DailyTaskDateNavigation
                    assignDate={assignDate}
                    onAssignDateChange={setAssignDateFromNav}
                  />
                ) : null}
                <DailyTaskToolbarSearch
                  search={search}
                  onSearchChange={setSearch}
                  className="min-w-[11rem] flex-1"
                />
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <CrmIconFilterDropdown
                    icon={<ListFilter aria-hidden="true" />}
                    tooltip="Task Type"
                    label="Task type"
                    allLabel="All types"
                    value={typeFilter === 'ALL' ? 'all' : typeFilter}
                    options={typeMenuOptions}
                    onValueChange={(v) => setTypeFilter(v === 'all' ? 'ALL' : (v as typeof typeFilter))}
                  />
                  <CrmIconFilterDropdown
                    icon={<Users aria-hidden="true" />}
                    tooltip="Employee"
                    label="Employee"
                    allLabel="All employees"
                    value={employeeId || 'all'}
                    options={employeeMenuOptions}
                    onValueChange={(v) => setEmployeeId(v === 'all' ? '' : v)}
                  />
                  <CrmIconFilterDropdown
                    icon={<Folder aria-hidden="true" />}
                    tooltip="Project"
                    label="Project"
                    allLabel="All projects"
                    value={projectId || 'all'}
                    options={projectMenuOptions}
                    onValueChange={(v) => setProjectId(v === 'all' ? '' : v)}
                  />
                  {view === 'calendar' ? (
                    <CrmIconFilterDropdown
                      icon={<Flag aria-hidden="true" />}
                      tooltip="Priority"
                      label="Priority"
                      allLabel="All priorities"
                      value={calendarPriorityFilter === 'ALL' ? 'all' : calendarPriorityFilter}
                      options={priorityMenuOptions}
                      onValueChange={(v) =>
                        setCalendarPriorityFilter(v === 'all' ? 'ALL' : (v as typeof calendarPriorityFilter))
                      }
                    />
                  ) : (
                    <CrmIconFilterDropdown
                      icon={<Flag aria-hidden="true" />}
                      tooltip="Priority"
                      label="Priority"
                      allLabel="All priorities"
                      value={priorityFilter === 'ALL' ? 'all' : priorityFilter}
                      options={priorityMenuOptions}
                      onValueChange={(v) =>
                        setPriorityFilter(v === 'all' ? 'ALL' : (v as typeof priorityFilter))
                      }
                    />
                  )}
                  {view === 'calendar' ? (
                    <>
                      <CrmIconFilterDropdown
                        icon={<ListFilter aria-hidden="true" />}
                        tooltip="Status"
                        label="Status"
                        allLabel="All statuses"
                        value={calendarStatusFilter === 'ALL' ? 'all' : calendarStatusFilter}
                        options={calendarStatusMenuOptions}
                        onValueChange={(v) => {
                          setCalendarStatusFilter(v === 'all' ? 'ALL' : (v as typeof calendarStatusFilter));
                          setCalendarWorkflowStageId('');
                        }}
                      />
                      <CrmIconFilterDropdown
                        icon={<UserRound aria-hidden="true" />}
                        tooltip="Assignment"
                        label="Assignment"
                        allLabel="Assigned & unassigned"
                        value={calendarAssignmentFilter === 'ALL' ? 'all' : calendarAssignmentFilter}
                        options={calendarAssignmentMenuOptions}
                        onValueChange={(v) =>
                          setCalendarAssignmentFilter(
                            v === 'all' ? 'ALL' : (v as typeof calendarAssignmentFilter),
                          )
                        }
                      />
                      <CrmIconFilterDropdown
                        icon={<GitBranch aria-hidden="true" />}
                        tooltip="Workflow stage"
                        label="Workflow stage"
                        allLabel="All workflow stages"
                        value={calendarWorkflowStageId || 'all'}
                        options={workflowStageMenuOptions}
                        onValueChange={(v) => {
                          setCalendarWorkflowStageId(v === 'all' ? '' : v);
                          if (v !== 'all') setCalendarStatusFilter('ALL');
                        }}
                        contentClassName="w-56"
                      />
                    </>
                  ) : null}
                  <DailyTaskSort
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSortByChange={setSortBy}
                    onSortDirChange={setSortDir}
                  />
                </div>
              </div>
            </DailyTaskToolbar>
          </div>

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
                    highlightTaskId={highlightTaskId}
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
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('taskId');
            params.delete('focus');
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
          }
        }}
        onChanged={refreshAll}
        focusReschedule={detailRescheduleFocus}
      />
    </div>
  );
}
