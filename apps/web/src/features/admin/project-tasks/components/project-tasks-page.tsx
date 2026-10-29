'use client';

import { projectListQuerySchema } from '@techwin/validation';
import { ListFilter, Plus, Search, SignalHigh } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/shared/lib/utils';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { ProjectDeleteDialog } from '@/features/admin/projects/components/project-delete-dialog';
import { ProjectFormDialog } from '@/features/admin/projects/components/project-form-dialog';
import { useProjectListActions } from '@/features/admin/projects/hooks/use-project-list-actions';
import { PROJECT_FORM_PLACEHOLDERS } from '@/features/admin/projects/constants/form-placeholders';
import {
  labelProjectLifecycleTab,
  labelProjectPriority,
  labelProjectStatus,
} from '@/features/admin/projects/utils/labels';
import {
  DEFAULT_PROJECT_MANAGEMENT_VIEW,
  PROJECT_LIFECYCLE_TABS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type ProjectManagementViewMode,
} from '../constants';
import { listProjectTaskSummaries } from '../api/project-tasks';
import type {
  ProjectLifecycleTab,
  ProjectListQuery,
  ProjectPriority,
  ProjectStatus,
  ProjectTaskSummaryItem,
} from '../types';
import { ProjectGanttView } from './project-gantt-view';
import { ProjectGridView } from './project-grid-view';
import { ProjectListView } from './project-list-view';
import { ProjectViewSwitcher } from './project-view-switcher';

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 12;

const CONTROL_H = 'h-9';

export function ProjectTasksPage() {
  const searchParams = useSearchParams();
  const { pending } = useAsyncAction();
  const [viewMode, setViewMode] = useState<ProjectManagementViewMode>(DEFAULT_PROJECT_MANAGEMENT_VIEW);
  const [items, setItems] = useState<readonly ProjectTaskSummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | ProjectPriority>('ALL');
  const [lifecycleTab, setLifecycleTab] = useState<ProjectLifecycleTab>('ALL');
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    notPlanned: 0,
    planned: 0,
    inProduction: 0,
    completed: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editQueryHandledRef = useRef(false);

  const query = useMemo((): ProjectListQuery => {
    const candidate: ProjectListQuery = {
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      lifecycleTab: lifecycleTab === 'ALL' ? undefined : lifecycleTab,
      page,
      pageSize,
    };
    return projectListQuerySchema.parse(candidate);
  }, [search, statusFilter, priorityFilter, lifecycleTab, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listProjectTaskSummaries(query);
      setItems(response.items);
      setTotal(response.total);
      setTabCounts(response.tabCounts);
    } catch {
      setError('Unable to load projects. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const {
    pending: actionPending,
    formOpen,
    setFormOpen,
    editingId,
    openCreate,
    openEdit,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    toggleActive,
  } = useProjectListActions(load);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    void load();
  }, [load]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft]);

  useEffect(() => {
    const editId = searchParams.get('edit')?.trim();
    if (!editId || editQueryHandledRef.current) return;
    editQueryHandledRef.current = true;
    openEdit(editId);
  }, [searchParams, openEdit]);

  const tabCountLabel = (tab: ProjectLifecycleTab) => {
    if (tab === 'ALL') return tabCounts.all;
    if (tab === 'NOT_PLANNED') return tabCounts.notPlanned;
    if (tab === 'PLANNED') return tabCounts.planned;
    if (tab === 'IN_PRODUCTION') return tabCounts.inProduction;
    return tabCounts.completed;
  };

  const statusFilterActive = statusFilter !== 'ALL';
  const priorityFilterActive = priorityFilter !== 'ALL';

  const filtersActive =
    search.trim().length > 0 ||
    statusFilterActive ||
    priorityFilterActive ||
    lifecycleTab !== 'ALL';

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setLifecycleTab('ALL');
    setPage(1);
  };

  const actionsBusy = pending || actionPending;

  const showInitialLoading = loading && items.length === 0;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Project Management' },
        ]}
        className="mb-0.5"
      />
      <section className="workspace-surface min-w-0">
        <div className="rounded-lg">
      <CrmToolbarHeader
        className="rounded-none border-0 bg-card shadow-none"
        title="Project Management"
        description="Manage projects, track delivery phases, and coordinate tasks."
        titleSectionClassName="min-w-0 shrink overflow-hidden sm:max-w-[13rem] lg:max-w-[15rem]"
        descriptionClassName="truncate"
        headerRowClassName="flex-nowrap items-center gap-3 min-w-0 overflow-hidden"
        toolbarRowClassName="ml-auto flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-2 overflow-x-auto"
        toolbar={
          <>
            <form
              className="w-[min(16.5rem,38vw)] shrink-0 sm:w-[16rem]"
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
                <Input
                  className={cn(
                    CRM_PIPELINE_SEARCH_INPUT_CLASS,
                    inputGroupPaddingClass({ leading: true }),
                  )}
                  placeholder={PROJECT_FORM_PLACEHOLDERS.searchProjects}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search projects"
                />
              </InputGroup>
            </form>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        CONTROL_H,
                        'size-9 shrink-0',
                        statusFilterActive && 'border-primary/40 bg-primary/5',
                      )}
                      aria-label="Filter projects by status"
                    >
                      <ListFilter aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Filter</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as typeof statusFilter);
                    setPage(1);
                  }}
                >
                  <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                  {PROJECT_STATUSES.map((status) => (
                    <DropdownMenuRadioItem key={status} value={status}>
                      {labelProjectStatus(status)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        CONTROL_H,
                        'size-9 shrink-0',
                        priorityFilterActive && 'border-primary/40 bg-primary/5',
                      )}
                      aria-label="Filter projects by priority"
                    >
                      <SignalHigh aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Priority</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={priorityFilter}
                  onValueChange={(value) => {
                    setPriorityFilter(value as typeof priorityFilter);
                    setPage(1);
                  }}
                >
                  <DropdownMenuRadioItem value="ALL">All priorities</DropdownMenuRadioItem>
                  {PROJECT_PRIORITIES.map((priority) => (
                    <DropdownMenuRadioItem key={priority} value={priority}>
                      {labelProjectPriority(priority)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <ProjectViewSwitcher value={viewMode} onChange={setViewMode} />
            <Button
              type="button"
              className={cn(
                CONTROL_H,
                'shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900',
              )}
              onClick={openCreate}
              disabled={actionsBusy}
            >
              <Plus aria-hidden="true" />
              New Project
            </Button>
          </>
        }
        bottomRow={
          <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={lifecycleTab}
              onValueChange={(value) => {
                setLifecycleTab(value as ProjectLifecycleTab);
                setPage(1);
              }}
              className="min-w-0 flex-1 gap-0"
            >
              <TabsList
                className={cn(
                  CONTROL_H,
                  'bg-muted w-full min-w-0 max-w-full justify-start gap-[3px] overflow-x-auto p-[3px] sm:overflow-x-visible',
                )}
              >
                {PROJECT_LIFECYCLE_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="min-w-[8.75rem] flex-1 px-2 text-xs whitespace-nowrap sm:min-w-0"
                  >
                    {labelProjectLifecycleTab(tab)}
                    <span className="text-muted-foreground ml-1 tabular-nums">
                      ({tabCountLabel(tab)})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        }
      />

      {error && items.length > 0 ? (
        <div className="border-border border-b px-4 sm:px-5">
          <CrmErrorAlert message={error} />
        </div>
      ) : null}

      <div aria-hidden className="table-header-edge" />

      {error && viewMode === 'grid' && items.length === 0 ? (
        <div className="grid min-w-0 gap-2 px-4 py-4 sm:px-5">
          <CrmErrorAlert message={error} />
          <Button type="button" variant="outline" className="w-fit" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : showInitialLoading && viewMode !== 'list' ? (
        <div className="px-4 py-4 sm:px-5">
          <CrmLoadingRows rows={6} />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="px-4 pb-4 sm:px-5">
          {items.length === 0 ? (
            <div className="text-muted-foreground min-w-0 rounded-lg border border-dashed p-10 text-center text-sm">
              No projects match your filters.
            </div>
          ) : (
            <ProjectGridView
              items={items}
              actionsDisabled={actionsBusy}
              onToggleActive={(target) => void toggleActive(target)}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onLifecycleChange={() => void load()}
              className={actionsBusy ? 'opacity-80' : undefined}
            />
          )}
        </div>
      ) : viewMode === 'list' ? (
        <ProjectListView
          items={items}
          loading={loading}
          error={error}
          filtersActive={filtersActive}
          actionsDisabled={actionsBusy}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onToggleActive={(target) => void toggleActive(target)}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onToggleActive={requestToggleActive}
          onRetry={() => void load()}
        />
      ) : (
        <div className="min-w-0 px-4 pb-4 sm:px-5">
          <ProjectGanttView items={items} className={actionsBusy ? 'opacity-80' : undefined} />
        </div>
      )}

      {viewMode !== 'list' ? (
        <TablePagination
          className="border-border border-t px-4 py-3 sm:px-5"
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
        </div>
      </section>

      <ProjectFormDialog
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={() => void load()}
      />

      <ProjectDeleteDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
