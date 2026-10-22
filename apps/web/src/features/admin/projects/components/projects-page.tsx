'use client';

import { projectListQuerySchema } from '@techwin/validation';
import { Eye, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { cn } from '@/shared/lib/utils';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_PROJECTS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import {
  changeProjectStatus,
  deleteProject,
  getProject,
  listProjects,
} from '../api/projects';
import { PROJECT_LIFECYCLE_TABS, PROJECT_PRIORITIES, PROJECT_STATUSES } from '../constants';
import { PROJECT_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type {
  ProjectDetail,
  ProjectLifecycleTab,
  ProjectListItem,
  ProjectListQuery,
  ProjectListTabCounts,
  ProjectPriority,
  ProjectStatus,
} from '../types';
import { labelProjectLifecycleTab, labelProjectPriority, labelProjectStatus } from '../utils/labels';
import { ProjectProgressBar } from './project-progress-bar';
import { ProjectFormDialog } from './project-form-dialog';
import { ProjectPriorityBadge } from './project-priority-badge';
import { ProjectStatusBadge } from './project-status-badge';
import { ProjectViewDialog } from './project-view-dialog';

const SEARCH_DEBOUNCE_MS = 400;

const EMPTY_TAB_COUNTS: ProjectListTabCounts = {
  all: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
};

function normalizeTabCounts(counts: ProjectListTabCounts | undefined): ProjectListTabCounts {
  if (!counts) return EMPTY_TAB_COUNTS;
  return {
    all: counts.all ?? 0,
    upcoming: counts.upcoming ?? 0,
    ongoing: counts.ongoing ?? 0,
    completed: counts.completed ?? 0,
  };
}

export function ProjectsPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const [projects, setProjects] = useState<readonly ProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | ProjectPriority>('ALL');
  const [lifecycleTab, setLifecycleTab] = useState<ProjectLifecycleTab>('ALL');
  const [tabCounts, setTabCounts] = useState<ProjectListTabCounts>(EMPTY_TAB_COUNTS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewProject, setViewProject] = useState<ProjectDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useMemo((): ProjectListQuery => {
    const candidate: ProjectListQuery = {
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      lifecycleTab: lifecycleTab === 'ALL' ? undefined : lifecycleTab,
      page,
      pageSize,
    };
    const parsed = projectListQuerySchema.safeParse(candidate);
    return parsed.success ? parsed.data : { page: 1, pageSize: 10 };
  }, [search, statusFilter, priorityFilter, lifecycleTab, page, pageSize]);

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    lifecycleTab !== 'ALL';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProjects(query);
      setProjects(
        result.items.map((item) => ({
          ...item,
          phaseCount: item.phaseCount ?? 0,
          progressPercent: item.progressPercent ?? 0,
        })),
      );
      setTotal(result.total);
      setTabCounts(normalizeTabCounts(result.tabCounts));
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (searchDraft === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, lifecycleTab]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: projects.length,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: projects.length });

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setViewOpen(false);
    setFormOpen(true);
  };

  const openView = async (id: string) => {
    setViewOpen(true);
    setViewProject(null);
    setViewLoading(true);
    try {
      const project = await getProject(id);
      setViewProject(project);
    } catch (failure) {
      toast.error(describeCrmError(failure));
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const toggleActive = async (project: ProjectListItem) => {
    const nextStatus: ProjectStatus = project.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => changeProjectStatus(project.id, { status: nextStatus }));
      toast.success(
        nextStatus === 'ACTIVE' ? 'Project activated.' : 'Project marked inactive.',
      );
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteProject(target.id));
      toast.success(`Project "${target.projectNumber}" deleted.`);
      if (viewProject?.id === target.id) {
        setViewOpen(false);
        setViewProject(null);
      }
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setLifecycleTab('ALL');
    setPage(1);
  };

  const tabCountLabel = (tab: ProjectLifecycleTab) => {
    const counts = normalizeTabCounts(tabCounts);
    if (tab === 'ALL') return counts.all;
    if (tab === 'UPCOMING') return counts.upcoming;
    if (tab === 'ONGOING') return counts.ongoing;
    return counts.completed;
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Project Management' },
    { label: 'Projects' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Projects"
        description="Manage client projects and delivery phases."
        className="shadow-xs"
        toolbar={
          <>
            <form
              className={CRM_HEADER_SEARCH_FORM_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                <Input
                  className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                  placeholder={PROJECT_FORM_PLACEHOLDERS.searchProjects}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search projects"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'ALL' | ProjectStatus)}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 sm:w-[9.375rem] sm:max-w-[10rem]"
                aria-label="Filter by status"
              >
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
              onValueChange={(value) => setPriorityFilter(value as 'ALL' | ProjectPriority)}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 sm:w-[9.375rem] sm:max-w-[10rem]"
                aria-label="Filter by priority"
              >
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
            <Button type="button" size="sm" className="h-9 shrink-0" onClick={openCreate}>
              <Plus aria-hidden="true" />
              New Project
            </Button>
          </>
        }
      />

      {error && projects.length > 0 ? <CrmErrorAlert message={error} /> : null}

      <Tabs
        value={lifecycleTab}
        onValueChange={(value) => {
          setLifecycleTab(value as ProjectLifecycleTab);
          setPage(1);
        }}
      >
        <TabsList className="h-9 w-full justify-start overflow-x-auto">
          {PROJECT_LIFECYCLE_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs">
              {labelProjectLifecycleTab(tab)}
              <span className="text-muted-foreground ml-1.5 tabular-nums">({tabCountLabel(tab)})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable
        className="min-w-0 max-w-full"
        tableClassName="table-fixed min-w-[56rem]"
        phase={tablePhase}
        colSpan={8}
        skeletonColumns={CRM_PROJECTS_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[20%]">Project</TableHead>
            <TableHead className="w-[18%]">Client</TableHead>
            <TableHead className="w-[10%]">Phases</TableHead>
            <TableHead className="w-[10%]">Priority</TableHead>
            <TableHead className="w-[14%]">Progress</TableHead>
            <TableHead className="w-[11%]">Start date</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[11rem] min-w-[11rem] text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          title: filtersActive ? 'No results match your filters' : 'No projects yet',
          description: filtersActive
            ? 'Try different search terms, another tab, or clear filters to see projects.'
            : 'Create your first project to start managing delivery phases.',
          secondaryAction: filtersActive
            ? { label: 'Clear filters', onClick: clearFilters }
            : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="min-w-0">
              <div className="grid min-w-0">
                <span className="truncate font-medium">{project.name}</span>
                <span className="text-muted-foreground truncate text-xs">{project.projectNumber}</span>
              </div>
            </TableCell>
            <TableCell className="min-w-0">
              <div className="grid min-w-0">
                <span className="truncate">{project.clientName}</span>
                {project.companyName ? (
                  <span className="text-muted-foreground truncate text-xs">{project.companyName}</span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-normal">
                {project.phaseCount} {project.phaseCount === 1 ? 'phase' : 'phases'}
              </Badge>
            </TableCell>
            <TableCell>
              <ProjectPriorityBadge priority={project.priority} />
            </TableCell>
            <TableCell>
              <ProjectProgressBar percent={project.progressPercent} />
            </TableCell>
            <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
              {project.startDate ? formatDateOnly(project.startDate) : '—'}
            </TableCell>
            <TableCell className="align-middle">
              <ProjectStatusBadge status={project.status} />
            </TableCell>
            <TableCell className="w-[11rem] min-w-[11rem] align-middle text-right">
              <div className="flex shrink-0 items-center justify-end gap-3">
                <TableIconButton
                  className="size-8 shrink-0"
                  label="View project"
                  onClick={() => void openView(project.id)}
                >
                  <Eye className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  className="size-8 shrink-0"
                  label="Edit project"
                  onClick={() => openEdit(project.id)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  className="size-8 shrink-0"
                  label={project.status === 'ACTIVE' ? 'Deactivate project' : 'Activate project'}
                  disabled={pending}
                  onClick={() => void toggleActive(project)}
                >
                  <Power className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  className="size-8 shrink-0"
                  label="Delete project"
                  tone="danger"
                  onClick={() => setDeleteTarget(project)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <ProjectFormDialog
        open={formOpen}
        editingId={editingId}
        onOpenChange={setFormOpen}
        onSaved={load}
      />

      <ProjectViewDialog
        open={viewOpen}
        project={viewProject}
        loading={viewLoading}
        onOpenChange={setViewOpen}
        onEdit={openEdit}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This removes "${deleteTarget.name}" (${deleteTarget.projectNumber}) and its phase records. Related tasks or documents are not deleted because they are not part of this module yet.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
