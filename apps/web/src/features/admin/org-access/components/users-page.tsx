'use client';

import { orgMemberListQuerySchema, updateMemberRequestSchema } from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { KeyRound, Pencil, Power, Search, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import type { DataTableSkeletonColumn } from '@/features/admin/components/data-table-skeleton';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CrmErrorAlert,
  CrmFormField,
} from '@/features/admin/crm/components/crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { formatDateTime } from '@/shared/lib/format';
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
import { CreateMemberAccountDialog } from './create-member-account-dialog';
import { ResetMemberPasswordDialog } from './reset-member-password-dialog';
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

const MEMBERS_TABLE_COLUMN_CLASS = {
  name: 'w-[20%] min-w-[11rem] overflow-hidden pr-4 align-middle',
  email: 'w-[26%] min-w-[13rem] overflow-hidden px-4 align-middle',
  role: 'w-[16%] min-w-[8.5rem] overflow-hidden px-4 align-middle',
  lastLogin: 'w-[16%] min-w-[9rem] overflow-hidden px-4 align-middle',
  actions: 'w-[24%] min-w-[15.5rem] px-4 align-middle',
} as const;

const MEMBERS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide', className: MEMBERS_TABLE_COLUMN_CLASS.name },
  { variant: 'textWide', className: MEMBERS_TABLE_COLUMN_CLASS.email },
  { variant: 'badge', className: MEMBERS_TABLE_COLUMN_CLASS.role },
  { variant: 'text', className: MEMBERS_TABLE_COLUMN_CLASS.lastLogin },
  {
    variant: 'actions',
    className: MEMBERS_TABLE_COLUMN_CLASS.actions,
    headClassName: `${MEMBERS_TABLE_COLUMN_CLASS.actions} text-right`,
  },
];

const PHONE_PLACEHOLDER = 'Not provided';

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

function formatPhoneNumber(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : PHONE_PLACEHOLDER;
}

function formatLastLoginAt(value: string | null | undefined): string {
  if (!value) return 'Never';
  return formatDateTime(value);
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

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileTarget, setEditProfileTarget] = useState<OrgMemberListItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProfileErrors, setEditProfileErrors] = useState<Record<string, string>>({});

  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [rolesTarget, setRolesTarget] = useState<OrgMemberListItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<readonly string[]>([]);

  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createAccountApiErrors, setCreateAccountApiErrors] = useState<Record<string, string>>({});
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

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setPage(1);
  };

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: total });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const saveProfile = async () => {
    if (!editProfileTarget) return;
    setEditProfileErrors({});
    const phoneTrimmed = editPhone.trim();
    const parsed = updateMemberRequestSchema.safeParse({
      displayName: editDisplayName.trim(),
      phone: phoneTrimmed ? phoneTrimmed : null,
    });
    if (!parsed.success) {
      setEditProfileErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      await run(() => updateOrgMember(editProfileTarget.membershipId, parsed.data));
      toast.success('Member profile updated.');
      setEditProfileOpen(false);
      setEditProfileTarget(null);
      await load();
    } catch (failure) {
      if (!applyOrgAccessFieldErrors(failure, setEditProfileErrors)) {
        toast.error(describeOrgAccessError(failure));
      }
    }
  };

  const saveRoles = async () => {
    if (!rolesTarget) return;
    try {
      await run(() =>
        assignOrgMemberRoles(rolesTarget.membershipId, { roleIds: [...selectedRoleIds] }),
      );
      toast.success('Member roles updated.');
      setRolesDialogOpen(false);
      setRolesTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  const toggleMemberStatus = async (member: OrgMemberListItem) => {
    if (member.status !== 'ACTIVE' && member.status !== 'SUSPENDED') return;
    const next: OrganizationMembershipStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await run(() => changeOrgMemberStatus(member.membershipId, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Member activated.' : 'Member suspended.');
      await load();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  const canDeleteMember = (member: OrgMemberListItem) =>
    canDeleteMembers && member.adminId !== admin.id && !member.isOwner;

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

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Users' }]} />

      {!canRead ? (
        <CrmErrorAlert message="You do not have permission to view organization members." />
      ) : (
        <section aria-label="Member directory" className="flex min-w-0 flex-col gap-4">
          <CrmToolbarHeader
            className="shadow-xs min-w-0"
            layout="stacked"
            title="Users"
            description="Search members, manage roles, and create accounts or invitations."
            toolbar={
              <>
                <form
                  className={CRM_HEADER_SEARCH_FORM_CLASS}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSearch(searchDraft.trim());
                    setPage(1);
                  }}
                >
                  <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
                    <Input
                      className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Search by name or email"
                      aria-label="Search members"
                    />
                  </InputGroup>
                </form>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
                >
                  <SelectTrigger className="h-9 w-full min-w-[9rem] sm:w-[9rem]" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {MEMBERSHIP_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {labelMembershipStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-full min-w-[9rem] sm:w-[10rem]" aria-label="Filter by role">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All roles</SelectItem>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canProvision ? (
                  <Button
                    type="button"
                    className="h-9 shrink-0"
                    onClick={() => {
                      setCreateAccountApiErrors({});
                      setCreateAccountOpen(true);
                    }}
                  >
                    <UserPlus aria-hidden="true" />
                    Create account
                  </Button>
                ) : null}
              </>
            }
          />

          {error && items.length > 0 ? <CrmErrorAlert message={error} /> : null}

          <DataTable
            className="min-w-0 max-w-full"
            tableClassName="table-fixed min-w-[60rem]"
            phase={tablePhase}
            colSpan={5}
            skeletonColumns={MEMBERS_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className={MEMBERS_TABLE_COLUMN_CLASS.name}>Name</TableHead>
                <TableHead className={MEMBERS_TABLE_COLUMN_CLASS.email}>Email</TableHead>
                <TableHead className={MEMBERS_TABLE_COLUMN_CLASS.role}>Role</TableHead>
                <TableHead className={cn(MEMBERS_TABLE_COLUMN_CLASS.lastLogin, 'whitespace-nowrap')}>
                  Last Login At
                </TableHead>
                <TableHead className={cn(MEMBERS_TABLE_COLUMN_CLASS.actions, 'text-right')}>
                  Actions
                </TableHead>
              </TableRow>
            }
            empty={{
              icon: Users,
              title: filtersActive ? 'No members match your filters' : 'No members yet',
              description: filtersActive
                ? 'Try different search terms or clear filters.'
                : canProvision
                  ? 'Create an account to add someone to your organization.'
                  : 'Members will appear here once they join.',
              secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
            }}
            errorMessage={error}
            onRetry={() => void load()}
            refreshing={tableRefreshing}
            footer={
              <TablePagination
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
              const phoneLabel = formatPhoneNumber(member.phoneNumber);
              return (
                <TableRow key={member.membershipId}>
                  <TableCell className={cn(MEMBERS_TABLE_COLUMN_CLASS.name, 'min-w-0 font-medium')}>
                    <TruncateWithTooltip value={member.displayName} />
                    {member.isOwner ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Owner
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={cn(MEMBERS_TABLE_COLUMN_CLASS.email, 'min-w-0 whitespace-normal')}
                  >
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <TruncateWithTooltip
                        value={member.email}
                        className="text-muted-foreground text-sm"
                      />
                      <TruncateWithTooltip
                        value={phoneLabel}
                        className={cn(
                          'text-[11px] tabular-nums',
                          phoneLabel === PHONE_PLACEHOLDER
                            ? 'text-muted-foreground'
                            : 'text-foreground',
                        )}
                      />
                    </div>
                  </TableCell>
                  <TableCell className={cn(MEMBERS_TABLE_COLUMN_CLASS.role, 'min-w-0 whitespace-normal')}>
                    <MemberRoleBadges roles={member.roles} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      MEMBERS_TABLE_COLUMN_CLASS.lastLogin,
                      'text-muted-foreground min-w-0 text-sm tabular-nums',
                    )}
                  >
                    <TruncateWithTooltip value={formatLastLoginAt(member.lastLoginAt)} />
                  </TableCell>
                  <TableCell className={cn(MEMBERS_TABLE_COLUMN_CLASS.actions, 'min-w-0 text-right')}>
                    <div className="flex w-full shrink-0 items-center justify-end gap-2.5">
                      {canResetPassword && !isSelf ? (
                        <TableIconButton
                          label={`Reset password for ${member.displayName}`}
                          tone="default"
                          disabled={pending}
                          onClick={() => {
                            setResetPasswordTarget(member);
                            setResetPasswordErrors({});
                            setResetPasswordOpen(true);
                          }}
                        >
                          <KeyRound className="size-4" aria-hidden="true" />
                        </TableIconButton>
                      ) : null}
                      {canUpdateProfile && !isSelf ? (
                        <TableIconButton
                          label={`Edit ${member.displayName}`}
                          tone="primary"
                          disabled={pending}
                          onClick={() => {
                            setEditProfileTarget(member);
                            setEditDisplayName(member.displayName);
                            setEditPhone(member.phoneNumber ?? '');
                            setEditProfileErrors({});
                            setEditProfileOpen(true);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </TableIconButton>
                      ) : null}
                      {canManageRoles && !isSelf ? (
                        <TableIconButton
                          label={`Manage roles for ${member.displayName}`}
                          tone="primary"
                          disabled={pending}
                          onClick={() => {
                            setRolesTarget(member);
                            setSelectedRoleIds(member.roles.map((role) => role.id));
                            setRolesDialogOpen(true);
                          }}
                        >
                          <Shield className="size-4" aria-hidden="true" />
                        </TableIconButton>
                      ) : null}
                      {canChangeStatus &&
                      !isSelf &&
                      !member.isOwner &&
                      (member.status === 'ACTIVE' || member.status === 'SUSPENDED') ? (
                        <TableIconButton
                          label={
                            member.status === 'ACTIVE'
                              ? `Deactivate ${member.displayName}`
                              : `Activate ${member.displayName}`
                          }
                          tone={member.status === 'ACTIVE' ? 'danger' : 'success'}
                          disabled={pending}
                          onClick={() => void toggleMemberStatus(member)}
                        >
                          <Power className="size-4" aria-hidden="true" />
                        </TableIconButton>
                      ) : null}
                      {canDeleteMember(member) ? (
                        <TableIconButton
                          label={`Delete ${member.displayName}`}
                          tone="danger"
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

      <Dialog
        open={editProfileOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditProfileOpen(false);
            setEditProfileTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update profile details for {editProfileTarget?.email}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <CrmFormField id="member-display-name" label="Full name" required error={editProfileErrors.displayName}>
              <Input
                id="member-display-name"
                value={editDisplayName}
                className={formControlStateClass(editProfileErrors.displayName ? 'invalid' : 'neutral')}
                onChange={(event) => {
                  clearFormFieldError(setEditProfileErrors, 'displayName');
                  setEditDisplayName(event.target.value);
                }}
              />
            </CrmFormField>
            <CrmFormField id="member-phone" label="Phone number" error={editProfileErrors.phone}>
              <Input
                id="member-phone"
                type="tel"
                value={editPhone}
                placeholder={PHONE_PLACEHOLDER}
                className={formControlStateClass(editProfileErrors.phone ? 'invalid' : 'neutral')}
                onChange={(event) => {
                  clearFormFieldError(setEditProfileErrors, 'phone');
                  setEditPhone(event.target.value);
                }}
              />
            </CrmFormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditProfileOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveProfile()} disabled={pending}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rolesDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRolesDialogOpen(false);
            setRolesTarget(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign roles</DialogTitle>
            <DialogDescription>
              Choose roles for {rolesTarget?.displayName ?? 'this member'}. Owner is the built-in
              role and is never assigned automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {grantableRoles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No assignable roles are available.</p>
            ) : (
              grantableRoles.map((role) => {
                const checked = selectedRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelectedRoleIds((previous) => {
                          if (value === true) return previous.includes(role.id) ? previous : [...previous, role.id];
                          return previous.filter((id) => id !== role.id);
                        });
                      }}
                      aria-label={role.name}
                    />
                    <span className="text-sm font-medium">{role.name}</span>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRolesDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveRoles()} disabled={pending}>
              Save roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateMemberAccountDialog
        open={createAccountOpen}
        onOpenChange={(open) => {
          setCreateAccountOpen(open);
          if (!open) {
            setCreateAccountApiErrors({});
            void load();
          }
        }}
        grantableRoles={grantableRoles}
        pending={pending}
        apiFieldErrors={createAccountApiErrors}
        onDismissApiFieldError={(key) => clearFormFieldError(setCreateAccountApiErrors, key)}
        onSchemaContractError={(message) => toast.error(message)}
        onSubmit={async (payload) => {
          setCreateAccountApiErrors({});
          try {
            await run(() => provisionOrgMember(payload));
            toast.success('Member account created.');
            await load();
          } catch (failure) {
            if (
              isApiError(failure) &&
              failure.details.some((detail) => isOrgAccessSchemaContractError(detail.message))
            ) {
              toast.error(ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR);
              throw failure;
            }
            if (applyOrgAccessFieldErrors(failure, setCreateAccountApiErrors)) {
              focusFirstInvalidField();
            } else {
              toast.error(describeOrgAccessError(failure));
            }
            throw failure;
          }
        }}
      />

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
