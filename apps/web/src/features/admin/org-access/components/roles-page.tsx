'use client';

import {
  CircleDot,
  Loader2,
  Plus,
  Search,
  Shield,
  SquarePen,
  Tags,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  ORG_ROLES_TABLE_COLUMN_CLASS,
  ORG_ROLES_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { cn } from '@/shared/lib/utils';
import {
  deleteOrgRole,
  getOrgRoleDeletionImpact,
  listOrgRoles,
  updateOrgRole,
} from '../api/org-access';
import { invalidateMyPermissionsCache } from '../my-permissions-cache';
import { DEFAULT_ORG_ROLE_PAGE_SIZE, ROLE_SEARCH_DEBOUNCE_MS } from '../constants';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { useMyPermissions } from '../hooks/use-my-permissions';
import type { OrganizationRoleStatus, OrgRoleListItem } from '../types';
import { describeOrgAccessError } from '../utils/errors';
import {
  describeRoleDeletionBlock,
  describeRoleDeactivateBlock,
  immutableRoleReason,
  isEditableOrgRole,
  isOwnerOrgRole,
  roleDeleteLabel,
  roleShowsDeleteButton,
  roleShowsStatusToggle,
  roleStatusToggleLabel,
} from '../utils/role-policy';
import { RoleFormDialog } from './role-form-dialog';

type RoleTypeFilter = 'ALL' | 'SYSTEM' | 'CUSTOM';
type RoleStatusFilter = 'ALL' | OrganizationRoleStatus;

function RoleTypeBadge({ isSystem }: { isSystem: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-normal',
        isSystem
          ? 'bg-neutral-500/10 text-neutral-700'
          : 'bg-sky-600/10 text-sky-800',
      )}
    >
      {isSystem ? 'System' : 'Custom'}
    </Badge>
  );
}

function RoleStatusBadge({ status }: { status: OrganizationRoleStatus }) {
  return status === 'ACTIVE' ? (
    <Badge className="border-transparent bg-emerald-600/10 font-normal text-emerald-700 hover:bg-emerald-600/10">
      Active
    </Badge>
  ) : (
    <Badge className="border-transparent bg-red-600/10 font-normal text-red-700 hover:bg-red-600/10">
      Inactive
    </Badge>
  );
}

export function RolesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { has, permissions } = useMyPermissions();
  const { admin } = useAuthenticatedAdmin();
  const grantablePermissions = useMemo(
    () => (admin.role === 'SUPER_ADMIN' ? undefined : new Set(permissions)),
    [admin.role, permissions],
  );

  const canRead = has('roles.read');
  const canCreate = has('roles.create');
  const canUpdate = has('roles.update');
  const canDelete = has('roles.delete');

  const [roles, setRoles] = useState<readonly OrgRoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RoleTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<RoleStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ORG_ROLE_PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [formRoleId, setFormRoleId] = useState<string | null>(null);
  const [formReadOnly, setFormReadOnly] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OrgRoleListItem | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<Awaited<
    ReturnType<typeof getOrgRoleDeletionImpact>
  > | null>(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [statusTarget, setStatusTarget] = useState<OrgRoleListItem | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDraft === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, ROLE_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search]);

  const load = useCallback(async (): Promise<readonly OrgRoleListItem[]> => {
    if (!canRead) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return [];
    }
    setLoading(true);
    setError(null);
    try {
      const rolesResponse = await listOrgRoles();
      setRoles(rolesResponse.items);
      return rolesResponse.items;
    } catch (failure) {
      setError(describeOrgAccessError(failure));
      return [];
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void load();
  }, [load]);

  const typeFilterActive = typeFilter !== 'ALL';
  const statusFilterActive = statusFilter !== 'ALL';
  const filtersActive =
    search.length > 0 || typeFilterActive || statusFilterActive;

  const filteredRoles = useMemo(() => {
    let list = roles;
    if (search) {
      const query = search.toLowerCase();
      list = list.filter(
        (role) =>
          role.name.toLowerCase().includes(query) || role.key.toLowerCase().includes(query),
      );
    }
    if (typeFilter === 'SYSTEM') list = list.filter((role) => role.isSystem);
    if (typeFilter === 'CUSTOM') list = list.filter((role) => !role.isSystem);
    if (statusFilter !== 'ALL') list = list.filter((role) => role.status === statusFilter);
    return list;
  }, [roles, search, statusFilter, typeFilter]);

  const totalFiltered = filteredRoles.length;
  const totalPages = totalFiltered === 0 ? 0 : Math.ceil(totalFiltered / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);

  const paginatedRoles = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, pageSize, safePage]);

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: paginatedRoles.length });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: roles.length });

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const openCreate = () => {
    setFormRoleId(null);
    setFormReadOnly(false);
    setFormOpen(true);
  };

  const openRoleForm = (role: OrgRoleListItem) => {
    setFormRoleId(role.id);
    setFormReadOnly(!canUpdate || !isEditableOrgRole(role));
    setFormOpen(true);
  };

  const openDeleteDialog = (role: OrgRoleListItem) => {
    setDeleteTarget(role);
    setDeleteImpact(null);
    setDeleteImpactLoading(true);
    void getOrgRoleDeletionImpact(role.id)
      .then((impact) => setDeleteImpact(impact))
      .catch((failure) => {
        toast.error(describeOrgAccessError(failure));
        setDeleteImpact({
          canDelete: false,
          canDeactivate: false,
          totalMemberAssignments: role.memberCount,
          activeMemberAssignments: role.memberCount,
          employeeLinkedAssignments: 0,
          pendingInvitationAssignments: role.pendingInvitationCount,
        });
      })
      .finally(() => setDeleteImpactLoading(false));
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteImpact?.canDelete === false) return;
    const deletedRoleId = deleteTarget.id;
    try {
      await run(() => deleteOrgRole(deletedRoleId));
      const items = await load();
      if (items.some((role) => role.id === deletedRoleId)) {
        toast.error(
          'The role was not removed. It may still be in use or was restored. Refresh and try again.',
        );
        return;
      }
      toast.success('Role permanently deleted.');
      setDeleteTarget(null);
      setDeleteImpact(null);
      invalidateMyPermissionsCache();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  const statusChangeIsDeactivate = statusTarget?.status === 'ACTIVE';

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const nextStatus: OrganizationRoleStatus =
      statusTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (
      nextStatus === 'INACTIVE' &&
      statusTarget.memberCount > 0
    ) {
      toast.error(describeRoleDeactivateBlock(statusTarget));
      setStatusTarget(null);
      return;
    }
    try {
      await run(() => updateOrgRole(statusTarget.id, { status: nextStatus }));
      toast.success(nextStatus === 'ACTIVE' ? 'Role activated.' : 'Role deactivated.');
      setStatusTarget(null);
      invalidateMyPermissionsCache();
      await load();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  const emptyTitle = filtersActive ? 'No roles match your filters' : 'No roles yet';
  const emptyDescription = filtersActive
    ? 'Try different search terms or clear filters.'
    : canCreate
      ? 'Create a custom role to tailor permissions for your team.'
      : 'Roles will appear here when they are configured.';

  const breadcrumbs = [
    { label: 'Home', href: '/admin/dashboard' },
    { label: 'Administration', href: '/admin/users' },
    { label: 'Roles & Permissions' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1 pb-8">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />

      {!canRead ? (
        <CrmErrorAlert message="You do not have permission to view roles." />
      ) : (
        <section aria-label="Roles and permissions" className="workspace-surface min-w-0">
          <div className="rounded-lg">
            <CrmToolbarHeader
              title="Roles & Permissions"
              description="Manage roles and control access across Techwin."
              className="rounded-none border-0 bg-card shadow-none"
              titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
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
                        className={cn(
                          CRM_PIPELINE_SEARCH_INPUT_CLASS,
                          inputGroupPaddingClass({ leading: true }),
                        )}
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                        placeholder="Search by role name or key"
                        aria-label="Search roles"
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
                            className={cn('shrink-0', typeFilterActive && 'border-primary/40 bg-primary/5')}
                            aria-label="Filter by role type"
                          >
                            <Tags aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Role type</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Type</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={typeFilter}
                        onValueChange={(value) => {
                          setTypeFilter(value as RoleTypeFilter);
                          setPage(1);
                        }}
                      >
                        <DropdownMenuRadioItem value="ALL">All types</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="SYSTEM">System</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="CUSTOM">Custom</DropdownMenuRadioItem>
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
                              'shrink-0',
                              statusFilterActive && 'border-primary/40 bg-primary/5',
                            )}
                            aria-label="Filter by status"
                          >
                            <CircleDot aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Status</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={statusFilter}
                        onValueChange={(value) => {
                          setStatusFilter(value as RoleStatusFilter);
                          setPage(1);
                        }}
                      >
                        <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="ACTIVE">Active</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="INACTIVE">Inactive</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {filtersActive ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={clearFilters}
                    >
                      Clear
                    </Button>
                  ) : null}
                  {canCreate ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                      onClick={openCreate}
                    >
                      <Plus aria-hidden="true" />
                      Create Role
                    </Button>
                  ) : null}
                </>
              }
            />

            {error && roles.length > 0 ? (
              <div className="border-border border-b px-4 sm:px-5">
                <CrmErrorAlert message={error} />
              </div>
            ) : null}

            <div aria-hidden className="table-header-edge" />

            <DataTable
              frame="flush"
              headerVariant="plain"
              className="min-w-0 max-w-full gap-0"
              tableClassName="table-fixed [&_[data-slot=table-head]]:h-auto [&_[data-slot=table-head]]:py-3 [&_[data-slot=table-cell]]:py-3"
              tableBodyClassName="[&_[data-slot=table-row]]:border-0 [&_[data-slot=table-row]:hover]:bg-[#f5f5f5]"
              phase={tablePhase}
              colSpan={7}
              skeletonColumns={ORG_ROLES_TABLE_SKELETON}
              header={
                <TableRow className="hover:bg-transparent">
                  <TableHead className={ORG_ROLES_TABLE_COLUMN_CLASS.name}>Role Name</TableHead>
                  <TableHead className={ORG_ROLES_TABLE_COLUMN_CLASS.key}>Role Key</TableHead>
                  <TableHead className={ORG_ROLES_TABLE_COLUMN_CLASS.type}>Type</TableHead>
                  <TableHead
                    className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.permissions, 'text-right whitespace-nowrap')}
                  >
                    Permissions
                  </TableHead>
                  <TableHead
                    className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.members, 'text-right whitespace-nowrap')}
                  >
                    Members
                  </TableHead>
                  <TableHead className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.status, 'whitespace-nowrap')}>
                    Status
                  </TableHead>
                  <TableHead
                    className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.actions, 'text-right')}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              }
              empty={{
                icon: Shield,
                title: emptyTitle,
                description: emptyDescription,
                secondaryAction: filtersActive
                  ? { label: 'Clear filters', onClick: clearFilters }
                  : undefined,
              }}
              errorMessage={error}
              onRetry={() => void load()}
              refreshing={tableRefreshing}
              footer={
                <TablePagination
                  className="border-border border-t px-4 py-3 sm:px-5"
                  page={safePage}
                  pageSize={pageSize}
                  total={totalFiltered}
                  loading={tablePhase === 'initial-loading'}
                  hideWhenEmpty={false}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setPageSize(next);
                    setPage(1);
                  }}
                />
              }
            >
              {paginatedRoles.map((role) => (
                <TableRow key={role.id} className="border-0">
                  <TableCell className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.name, 'min-w-0')}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-foreground flex min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold">
                          <span className="truncate">{role.name}</span>
                          {isOwnerOrgRole(role) ? (
                            <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                              Protected
                            </Badge>
                          ) : null}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{role.name}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.key, 'min-w-0')}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code className="text-muted-foreground block truncate text-xs">{role.key}</code>
                      </TooltipTrigger>
                      <TooltipContent side="top">{role.key}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className={ORG_ROLES_TABLE_COLUMN_CLASS.type}>
                    <RoleTypeBadge isSystem={role.isSystem} />
                  </TableCell>
                  <TableCell
                    className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.permissions, 'text-right tabular-nums')}
                  >
                    {role.permissionKeys.length}
                  </TableCell>
                  <TableCell
                    className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.members, 'text-right tabular-nums')}
                  >
                    {role.memberCount}
                  </TableCell>
                  <TableCell className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.status, 'text-left')}>
                    <RoleStatusBadge status={role.status} />
                  </TableCell>
                  <TableCell className={cn(ORG_ROLES_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
                    <div className="flex w-full shrink-0 items-center justify-end gap-1">
                      {roleShowsStatusToggle(role, canUpdate) ? (
                        <TableIconButton
                          label={roleStatusToggleLabel(role)}
                          tone="default"
                          className={
                            role.status === 'ACTIVE'
                              ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                              : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                          }
                          disabled={pending}
                          onClick={() => setStatusTarget(role)}
                        >
                          {role.status === 'ACTIVE' ? (
                            <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                          ) : (
                            <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                          )}
                        </TableIconButton>
                      ) : null}
                      <TableIconButton
                        label={
                          !isEditableOrgRole(role)
                            ? immutableRoleReason(role)
                            : canUpdate
                              ? `Edit ${role.name}`
                              : `View ${role.name}`
                        }
                        tone="default"
                        className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                        disabled={pending}
                        onClick={() => openRoleForm(role)}
                      >
                        <SquarePen className="size-4" aria-hidden="true" />
                      </TableIconButton>
                      {roleShowsDeleteButton(role, canDelete) ? (
                        <TableIconButton
                          label={roleDeleteLabel(role)}
                          tone="default"
                          className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
                          disabled={pending}
                          onClick={() => openDeleteDialog(role)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </TableIconButton>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
        </section>
      )}

      <RoleFormDialog
        open={formOpen}
        roleId={formRoleId}
        readOnly={formReadOnly}
        grantablePermissions={grantablePermissions}
        onOpenChange={setFormOpen}
        onSaved={() => void load()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteImpact(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteImpact?.canDelete === false
                ? 'Cannot delete this role'
                : 'Permanently delete this role?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm">
                {deleteImpactLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Checking assignments…
                  </span>
                ) : deleteImpact && deleteTarget && !deleteImpact.canDelete ? (
                  <>
                    <p>{describeRoleDeletionBlock(deleteImpact, deleteTarget.name)}</p>
                    <ul className="mt-3 list-disc space-y-1 pl-5">
                      <li>Total member assignments: {deleteImpact.totalMemberAssignments}</li>
                      <li>Active members: {deleteImpact.activeMemberAssignments}</li>
                      <li>Employee-linked assignments: {deleteImpact.employeeLinkedAssignments}</li>
                      <li>Pending invitations: {deleteImpact.pendingInvitationAssignments}</li>
                    </ul>
                  </>
                ) : (
                  <>
                    This permanently removes {deleteTarget?.name ?? 'this role'} and its permission
                    mappings. This action cannot be undone.
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            {deleteImpact?.canDelete !== false ? (
              <AlertDialogAction
                disabled={pending || deleteImpactLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault();
                  void confirmDelete();
                }}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Deleting…
                  </>
                ) : (
                  'Delete permanently'
                )}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate role?' : 'Activate role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? statusChangeIsDeactivate
                  ? `“${statusTarget.name}” will no longer be available for new assignments. Existing assignments are kept; inactive roles do not grant permissions until activated again.${
                      statusTarget.memberCount > 0
                        ? ` ${statusTarget.memberCount} member(s) currently have this role.`
                        : ''
                    }`
                  : `“${statusTarget.name}” will be available for new assignments again with its configured permissions.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!statusTarget || pending}
              className={
                statusChangeIsDeactivate ? 'bg-neutral-900 text-white hover:bg-neutral-800' : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                void confirmStatusChange();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {statusChangeIsDeactivate ? 'Deactivating…' : 'Activating…'}
                </>
              ) : statusChangeIsDeactivate ? (
                'Deactivate'
              ) : (
                'Activate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
