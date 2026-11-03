'use client';

import { orgMemberListQuerySchema } from '@techwin/validation';
import { focusFirstInvalidField } from '@/shared/form/form-control-state';
import { clearFormFieldError } from '@/shared/form/zod-field-error';
import {
  CircleDot,
  Loader2,
  Plus,
  KeyRound,
  Search,
  SquarePen,
  Tags,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/shared/lib/utils';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import {
  ORG_MEMBERS_TABLE_COLUMN_CLASS,
  ORG_MEMBERS_TABLE_SKELETON,
} from '@/features/admin/components/data-table-presets';
import type { DataTableEmptyStateContent } from '@/features/admin/components/data-table-states';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert } from '@/features/admin/crm/components/crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import {
  assignOrgMemberRoles,
  changeOrgMemberStatus,
  deleteOrgMember,
  listOrgMembers,
  listOrgRoles,
  provisionOrgMember,
  resetOrgMemberPassword,
  updateOrgMember,
} from '../api/org-access';
import { MemberFormDialog } from './member-form-dialog';
import { ResetMemberPasswordDialog } from './reset-member-password-dialog';
import { invalidateMyPermissionsCache } from '../my-permissions-cache';
import { DEFAULT_ORG_MEMBER_PAGE_SIZE, MEMBERSHIP_STATUSES } from '../constants';
import { useAuthenticatedAdmin } from '@/features/admin/auth/hooks/use-admin-session';
import { useMyPermissions } from '../hooks/use-my-permissions';
import type {
  OrgMemberListItem,
  OrgMemberListQuery,
  OrgRoleListItem,
  OrganizationMembershipStatus,
} from '../types';
import { isApiError } from '@/shared/api/api-error';
import { applyOrgAccessFieldErrors, describeOrgAccessError } from '../utils/errors';
import {
  isOrgAccessSchemaContractError,
  ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR,
} from '../utils/org-access-form-errors';
import { selectGrantableRoles } from '../utils/grantable-roles';
import { labelMembershipStatus } from '../utils/labels';

const SEARCH_DEBOUNCE_MS = 400;

function MembershipStatusBadge({ status }: { status: OrganizationMembershipStatus }) {
  return status === 'ACTIVE' ? (
    <Badge className="border-transparent bg-emerald-600/10 font-normal text-emerald-700 hover:bg-emerald-600/10">
      {labelMembershipStatus(status)}
    </Badge>
  ) : (
    <Badge className="border-transparent bg-red-600/10 font-normal text-red-700 hover:bg-red-600/10">
      {labelMembershipStatus(status)}
    </Badge>
  );
}

function TruncateWithTooltip({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('block min-w-0 truncate', className)}>{value}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm break-all">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}

function MemberRoleBadges({ roles }: { roles: OrgMemberListItem['roles'] }) {
  if (roles.length === 0) {
    return <span className="text-muted-foreground text-sm">No role assigned</span>;
  }
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role.id} variant="secondary" className="max-w-full truncate text-xs font-normal">
          {role.name}
        </Badge>
      ))}
    </div>
  );
}

export function UsersPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { admin } = useAuthenticatedAdmin();
  const { has, hasAll, permissions } = useMyPermissions();

  const canRead = has('users.read');
  const canProvision = hasAll('users.create', 'memberships.manage');
  const canUpdateProfile = has('users.update');
  const canManageRoles = has('users.manage_roles');
  const canResetPassword = has('users.reset_password');
  const canChangeStatus = hasAll('users.deactivate', 'memberships.manage');
  const canDeleteMembers = hasAll('users.deactivate', 'memberships.manage');

  const [items, setItems] = useState<readonly OrgMemberListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ORG_MEMBER_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrganizationMembershipStatus>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [roleOptions, setRoleOptions] = useState<readonly OrgRoleListItem[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<OrgMemberListItem | null>(null);
  const [resetPasswordErrors, setResetPasswordErrors] = useState<Record<string, string>>({});

  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberFormMode, setMemberFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [memberFormTarget, setMemberFormTarget] = useState<OrgMemberListItem | null>(null);
  const [memberFormApiErrors, setMemberFormApiErrors] = useState<Record<string, string>>({});

  const [statusTarget, setStatusTarget] = useState<OrgMemberListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgMemberListItem | null>(null);

  const grantableRoles = useMemo(
    () =>
      selectGrantableRoles(roleOptions, {
        isPlatformSuperAdmin: admin.role === 'SUPER_ADMIN',
        permissions: new Set(permissions),
      }),
    [admin.role, roleOptions, permissions],
  );

  const query = useMemo((): OrgMemberListQuery => {
    return orgMemberListQuerySchema.parse({
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      roleId: roleFilter === 'ALL' ? undefined : roleFilter,
      page,
      pageSize,
      sortBy: 'displayName',
      sortDir: 'asc',
    });
  }, [search, statusFilter, roleFilter, page, pageSize]);

  const load = useCallback(async () => {
    if (!canRead) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await listOrgMembers(query);
      setItems(response.items);
      setTotal(response.total);
    } catch (failure) {
      setError(describeOrgAccessError(failure));
    } finally {
      setLoading(false);
    }
  }, [canRead, query]);

  useEffect(() => {
    if (!canRead) return;
    const controller = new AbortController();
    void listOrgRoles(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setRoleOptions(response.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRoleOptions([]);
      });
    return () => controller.abort();
  }, [canRead]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters change
    setPage(1);
  }, [statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp page when result set shrinks
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filtersActive =
    search.trim().length > 0 || statusFilter !== 'ALL' || roleFilter !== 'ALL';

  const clearFilters = useCallback(() => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setPage(1);
  }, []);

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: total });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const openMemberForm = (mode: 'create' | 'edit' | 'view', member: OrgMemberListItem | null = null) => {
    setMemberFormMode(mode);
    setMemberFormTarget(member);
    setMemberFormApiErrors({});
    setMemberFormOpen(true);
  };

  const refreshRoleOptions = async () => {
    const rolesResponse = await listOrgRoles();
    setRoleOptions(rolesResponse.items);
  };

  const handleEditSubmit = async (payload: {
    displayName: string;
    phone: string | null;
    roleIds: string[];
    status?: OrganizationMembershipStatus;
  }) => {
    if (!memberFormTarget) return;
    try {
      await run(() =>
        updateOrgMember(memberFormTarget.membershipId, {
          displayName: payload.displayName,
          phone: payload.phone,
        }),
      );
      if (canManageRoles) {
        await run(() =>
          assignOrgMemberRoles(memberFormTarget.membershipId, { roleIds: payload.roleIds }),
        );
        invalidateMyPermissionsCache();
      }
      if (
        canChangeStatus &&
        payload.status &&
        payload.status !== memberFormTarget.status &&
        (payload.status === 'ACTIVE' || payload.status === 'SUSPENDED')
      ) {
        await run(() =>
          changeOrgMemberStatus(memberFormTarget.membershipId, { status: payload.status! }),
        );
      }
      toast.success('Member updated.');
      await load();
      await refreshRoleOptions();
    } catch (failure) {
      if (!applyOrgAccessFieldErrors(failure, setMemberFormApiErrors)) {
        toast.error(describeOrgAccessError(failure));
      }
      throw failure;
    }
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    if (statusTarget.status !== 'ACTIVE' && statusTarget.status !== 'SUSPENDED') return;
    const next: OrganizationMembershipStatus =
      statusTarget.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await run(() => changeOrgMemberStatus(statusTarget.membershipId, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Member activated.' : 'Member suspended.');
      setStatusTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  const canDeleteMember = (member: OrgMemberListItem) =>
    canDeleteMembers && member.adminId !== admin.id && !member.isOwner;

  const statusFilterActive = statusFilter !== 'ALL';
  const roleFilterActive = roleFilter !== 'ALL';

  const emptyTableContent = useMemo((): DataTableEmptyStateContent => {
    if (search.trim()) {
      return {
        icon: Users,
        title: 'No matching users',
        description: 'Try different search terms or clear filters.',
        secondaryAction: { label: 'Clear search', onClick: clearFilters },
      };
    }
    if (roleFilterActive || statusFilterActive) {
      return {
        icon: Users,
        title: 'No users match these filters',
        description: 'Try different filters or clear them to see all members.',
        secondaryAction: { label: 'Clear filters', onClick: clearFilters },
      };
    }
    return {
      icon: Users,
      title: 'No users yet',
      description: 'Create an account or invite a team member to get started.',
      action: canProvision
        ? { label: 'Create Account', onClick: () => openMemberForm('create') }
        : undefined,
    };
  }, [canProvision, clearFilters, roleFilterActive, search, statusFilterActive]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await run(() => deleteOrgMember(deleteTarget.membershipId));
      toast.success(`${deleteTarget.displayName} was permanently deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  const statusChangeIsDeactivate = statusTarget?.status === 'ACTIVE';

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 pt-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Users' }]} className="mb-0.5" />

      {!canRead ? (
        <CrmErrorAlert message="You do not have permission to view organization members." />
      ) : (
        <section aria-label="Member directory" className="workspace-surface min-w-0">
          <div className="rounded-lg">
            <CrmToolbarHeader
              title="Users"
              description="Manage members, access roles, and create accounts or invitations."
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
                        placeholder="Search by name or email"
                        aria-label="Search members"
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
                            className={cn('shrink-0', statusFilterActive && 'border-primary/40 bg-primary/5')}
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
                        onValueChange={(value) =>
                          setStatusFilter(value as typeof statusFilter)
                        }
                      >
                        <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
                        {MEMBERSHIP_STATUSES.map((status) => (
                          <DropdownMenuRadioItem key={status} value={status}>
                            {labelMembershipStatus(status)}
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
                            className={cn('shrink-0', roleFilterActive && 'border-primary/40 bg-primary/5')}
                            aria-label="Filter by role"
                          >
                            <Tags aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Role</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Role</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={roleFilter} onValueChange={setRoleFilter}>
                        <DropdownMenuRadioItem value="ALL">All roles</DropdownMenuRadioItem>
                        {roleOptions.map((role) => (
                          <DropdownMenuRadioItem key={role.id} value={role.id}>
                            {role.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {filtersActive ? (
                    <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0" onClick={clearFilters}>
                      Clear
                    </Button>
                  ) : null}
                  {canProvision ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900"
                      onClick={() => openMemberForm('create')}
                    >
                      <Plus aria-hidden="true" />
                      Create Account
                    </Button>
                  ) : null}
                </>
              }
            />

            {error && items.length > 0 ? (
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
              colSpan={5}
              skeletonColumns={ORG_MEMBERS_TABLE_SKELETON}
              header={
                <TableRow className="hover:bg-transparent">
                  <TableHead className={ORG_MEMBERS_TABLE_COLUMN_CLASS.name}>Name</TableHead>
                  <TableHead className={ORG_MEMBERS_TABLE_COLUMN_CLASS.email}>Email</TableHead>
                  <TableHead className={ORG_MEMBERS_TABLE_COLUMN_CLASS.role}>Role</TableHead>
                  <TableHead className={ORG_MEMBERS_TABLE_COLUMN_CLASS.status}>Status</TableHead>
                  <TableHead className={cn(ORG_MEMBERS_TABLE_COLUMN_CLASS.actions, 'text-right')}>
                    Actions
                  </TableHead>
                </TableRow>
              }
              empty={emptyTableContent}
            errorMessage={error}
            onRetry={() => void load()}
            refreshing={tableRefreshing}
              footer={
                <TablePagination
                  className="border-border border-t px-4 py-3 sm:px-5"
                  page={safePage}
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
              {items.map((member) => {
                const isSelf = member.adminId === admin.id;
                const canEditMember =
                  !isSelf && (canUpdateProfile || canManageRoles || canRead);
                const showStatusToggle =
                  canChangeStatus &&
                  !isSelf &&
                  !member.isOwner &&
                  (member.status === 'ACTIVE' || member.status === 'SUSPENDED');
                return (
                  <TableRow key={member.membershipId} className="border-0">
                    <TableCell className={cn(ORG_MEMBERS_TABLE_COLUMN_CLASS.name, 'min-w-0')}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-foreground block truncate text-[13px] font-semibold">
                            {member.displayName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">{member.displayName}</TooltipContent>
                      </Tooltip>
                      {member.isOwner ? (
                        <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                          Owner
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className={cn(ORG_MEMBERS_TABLE_COLUMN_CLASS.email, 'min-w-0')}>
                      <TruncateWithTooltip
                        value={member.email}
                        className="text-muted-foreground text-sm"
                      />
                    </TableCell>
                    <TableCell className={cn(ORG_MEMBERS_TABLE_COLUMN_CLASS.role, 'min-w-0')}>
                      <MemberRoleBadges roles={member.roles} />
                    </TableCell>
                    <TableCell className={cn(ORG_MEMBERS_TABLE_COLUMN_CLASS.status, 'text-left')}>
                      <MembershipStatusBadge status={member.status} />
                    </TableCell>
                    <TableCell className={cn(ORG_MEMBERS_TABLE_COLUMN_CLASS.actions, 'min-w-0 pl-4')}>
                      <div className="flex w-full shrink-0 items-center justify-end gap-1">
                        {showStatusToggle ? (
                          <TableIconButton
                            label={
                              member.status === 'ACTIVE'
                                ? `Deactivate ${member.displayName}`
                                : `Activate ${member.displayName}`
                            }
                            tone="default"
                            className={
                              member.status === 'ACTIVE'
                                ? 'text-red-800 hover:bg-red-800/10 hover:text-red-900'
                                : 'text-emerald-800 hover:bg-emerald-800/10 hover:text-emerald-900'
                            }
                            disabled={pending}
                            onClick={() => setStatusTarget(member)}
                          >
                            {member.status === 'ACTIVE' ? (
                              <ToggleRight className="size-4 stroke-[2]" aria-hidden="true" />
                            ) : (
                              <ToggleLeft className="size-4 stroke-[2]" aria-hidden="true" />
                            )}
                          </TableIconButton>
                        ) : null}
                        {canResetPassword && !isSelf ? (
                          <TableIconButton
                            label={`Reset password for ${member.displayName}`}
                            tone="default"
                            className="text-blue-800 hover:bg-blue-800/10 hover:text-blue-900"
                            disabled={pending}
                            onClick={() => {
                              setResetPasswordTarget(member);
                              setResetPasswordOpen(true);
                            }}
                          >
                            <KeyRound className="size-4" aria-hidden="true" />
                          </TableIconButton>
                        ) : null}
                        {canEditMember ? (
                          <TableIconButton
                            label={
                              canUpdateProfile || canManageRoles
                                ? `Edit ${member.displayName}`
                                : `View ${member.displayName}`
                            }
                            tone="default"
                            className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                            disabled={pending}
                            onClick={() =>
                              openMemberForm(
                                canUpdateProfile || canManageRoles ? 'edit' : 'view',
                                member,
                              )
                            }
                          >
                            <SquarePen className="size-4" aria-hidden="true" />
                          </TableIconButton>
                        ) : null}
                        {canDeleteMember(member) ? (
                          <TableIconButton
                            label={`Permanently delete ${member.displayName}`}
                            tone="default"
                            className="text-neutral-900 hover:bg-neutral-900/10 hover:text-black"
                            disabled={pending}
                            onClick={() => setDeleteTarget(member)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </TableIconButton>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </DataTable>
          </div>
        </section>
      )}

      <ResetMemberPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={(open) => {
          setResetPasswordOpen(open);
          if (!open) setResetPasswordTarget(null);
        }}
        member={resetPasswordTarget}
        pending={pending}
        apiFieldErrors={resetPasswordErrors}
        onDismissApiFieldError={(key) => clearFormFieldError(setResetPasswordErrors, key)}
        onSubmit={async (payload) => {
          if (!resetPasswordTarget) return;
          setResetPasswordErrors({});
          try {
            await run(() => resetOrgMemberPassword(resetPasswordTarget.membershipId, payload));
            toast.success(`Password reset for ${resetPasswordTarget.displayName}.`);
          } catch (failure) {
            if (applyOrgAccessFieldErrors(failure, setResetPasswordErrors)) {
              focusFirstInvalidField();
            } else {
              toast.error(describeOrgAccessError(failure));
            }
            throw failure;
          }
        }}
      />

      <MemberFormDialog
        mode={memberFormMode}
        open={memberFormOpen}
        member={memberFormTarget}
        grantableRoles={grantableRoles}
        allRoles={roleOptions}
        pending={pending}
        readOnly={
          memberFormMode === 'view' ||
          (memberFormMode === 'edit' && !canUpdateProfile && !canManageRoles)
        }
        canManageRoles={canManageRoles}
        canChangeStatus={canChangeStatus}
        apiFieldErrors={memberFormApiErrors}
        onDismissApiFieldError={(key) => clearFormFieldError(setMemberFormApiErrors, key)}
        onOpenChange={(open) => {
          setMemberFormOpen(open);
          if (!open) {
            setMemberFormTarget(null);
            setMemberFormApiErrors({});
            void load();
          }
        }}
        onSchemaContractError={(message) => toast.error(message)}
        onCreateSubmit={async (payload) => {
          setMemberFormApiErrors({});
          try {
            await run(() => provisionOrgMember(payload));
            toast.success('Member account created.');
            await load();
            await refreshRoleOptions();
          } catch (failure) {
            if (
              isApiError(failure) &&
              failure.details.some((detail) => isOrgAccessSchemaContractError(detail.message))
            ) {
              toast.error(ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR);
              throw failure;
            }
            if (applyOrgAccessFieldErrors(failure, setMemberFormApiErrors)) {
              focusFirstInvalidField();
            } else {
              toast.error(describeOrgAccessError(failure));
            }
            throw failure;
          }
        }}
        onEditSubmit={handleEditSubmit}
      />

      <AlertDialog open={statusTarget !== null} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusChangeIsDeactivate ? 'Deactivate member?' : 'Activate member?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget
                ? statusChangeIsDeactivate
                  ? `“${statusTarget.displayName}” will be suspended and cannot sign in until reactivated.`
                  : `“${statusTarget.displayName}” will be activated and can sign in again.`
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.displayName ?? 'this member'} permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the sign-in account, membership, role assignments, and
              sessions. Employee records and other organization data are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void confirmDelete()}>
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
