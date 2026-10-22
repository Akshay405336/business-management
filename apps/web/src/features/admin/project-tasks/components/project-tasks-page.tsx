'use client';

import { projectListQuerySchema } from '@techwin/validation';
import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/shared/lib/utils';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_HEADER_SEARCH_FORM_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
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

const CONTROL_H = 'h-11';

const FILTER_TRIGGER_CLASS = cn(
  CONTROL_H,
  'w-full min-w-[9.375rem] shrink-0 sm:w-[9.375rem] sm:max-w-[10rem]',
);

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
  const [tabCounts, setTabCounts] = useState({ all: 0, upcoming: 0, ongoing: 0, completed: 0 });
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
    if (tab === 'UPCOMING') return tabCounts.upcoming;
    if (tab === 'ONGOING') return tabCounts.ongoing;
    return tabCounts.completed;
  };

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
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
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Project Management' },
        ]}
        className="mb-0.5"
      />
      <CrmToolbarHeader
        className="shadow-xs"
        title="Project Management"
        description="Manage projects, track delivery phases, and coordinate tasks."
        toolbar={
          <>
            <form
              className={cn(
                CRM_HEADER_SEARCH_FORM_CLASS,
                'min-w-[12rem] flex-[1_1_14rem] sm:max-w-[280px] md:flex-1 md:max-w-[min(100%,20rem)]',
              )}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
                <Input
                  className={cn(CONTROL_H, inputGroupPaddingClass({ leading: true }))}
                  placeholder={PROJECT_FORM_PLACEHOLDERS.searchProjects}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search projects"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as typeof statusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className={FILTER_TRIGGER_CLASS} aria-label="Filter by status">
                <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {labelProjectStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value as typeof priorityFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className={FILTER_TRIGGER_CLASS} aria-label="Filter by priority">
                <SelectValue placeholder={PROJECT_FORM_PLACEHOLDERS.filterPriority} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                {PROJECT_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {labelProjectPriority(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProjectViewSwitcher value={viewMode} onChange={setViewMode} className="hidden md:inline-flex" />
            <Button
              type="button"
              className={cn(CONTROL_H, 'shrink-0')}
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
            <ProjectViewSwitcher value={viewMode} onChange={setViewMode} className="md:hidden" />
          </div>
        }
      />

      {error && viewMode === 'grid' ? (
        <div className="grid min-w-0 gap-2">
          <CrmErrorAlert message={error} />
          <Button type="button" variant="outline" className="w-fit" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      {showInitialLoading ? (
        <CrmLoadingRows rows={viewMode === 'list' ? 8 : 6} />
      ) : viewMode === 'grid' ? (
        items.length === 0 ? (
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
            className={actionsBusy ? 'opacity-80' : undefined}
          />
        )
      ) : viewMode === 'list' ? (
        <ProjectListView
          items={items}
          loading={loading}
          error={error}
          filtersActive={filtersActive}
          actionsDisabled={actionsBusy}
          onToggleActive={(target) => void toggleActive(target)}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onClearFilters={clearFilters}
          onRetry={() => void load()}
        />
      ) : (
        <ProjectGanttView items={items} className={actionsBusy ? 'opacity-80' : undefined} />
      )}

      <div className="min-w-0 max-w-full">
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

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
