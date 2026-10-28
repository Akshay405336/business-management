'use client';

import { SYSTEM_ROLE_KEYS } from '@techwin/contracts';
import { orgMemberListQuerySchema, updateMemberRequestSchema } from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { KeyRound, Pencil, Power, Search, Shield, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { labelMembershipStatus } from '../utils/labels';

const SEARCH_DEBOUNCE_MS = 400;

const MEMBERS_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'actions', headClassName: 'w-[8rem] text-right' },
];

const PHONE_PLACEHOLDER = 'Not provided';

function TruncateWithTitle({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('block min-w-0 truncate', className)} title={value}>
      {value}
    </span>
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
    return <span className="text-muted-foreground text-sm">—</span>;
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
  const { has, hasAll } = useMyPermissions();

  const canRead = has('users.read');
  const canProvision = hasAll('users.create', 'memberships.manage');
  const canUpdateProfile = has('users.update');
  const canManageRoles = has('users.manage_roles');
  const canResetPassword = has('users.reset_password');
  const canChangeStatus = hasAll('users.deactivate', 'memberships.manage');

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

  const grantableRoles = useMemo(() => {
    const isPlatformSuperAdmin = admin.role === 'SUPER_ADMIN';
    return roleOptions.filter(
      (role) => isPlatformSuperAdmin || role.key !== SYSTEM_ROLE_KEYS.owner,
    );
  }, [admin.role, roleOptions]);

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
            tableClassName="table-fixed"
            phase={tablePhase}
            colSpan={6}
            skeletonColumns={MEMBERS_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[18%]">Name</TableHead>
                <TableHead className="w-[22%]">Email</TableHead>
                <TableHead className="w-[14%]">Phone Number</TableHead>
                <TableHead className="w-[18%]">Role</TableHead>
                <TableHead className="w-[16%]">Last Login At</TableHead>
                <TableHead className="w-[12%] text-right">Actions</TableHead>
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
                  <TableCell className="min-w-0 font-medium">
                    <TruncateWithTitle value={member.displayName} />
                    {member.isOwner ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Owner
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground min-w-0">
                    <TruncateWithTitle value={member.email} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      'min-w-0 text-sm',
                      phoneLabel === PHONE_PLACEHOLDER ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    <TruncateWithTitle value={phoneLabel} />
                  </TableCell>
                  <TableCell className="min-w-0">
                    <MemberRoleBadges roles={member.roles} />
                  </TableCell>
                  <TableCell className="text-muted-foreground min-w-0 text-sm tabular-nums">
                    <TruncateWithTitle value={formatLastLoginAt(member.lastLoginAt)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
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
            <DialogDescription>Choose roles for {rolesTarget?.displayName ?? 'this member'}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {grantableRoles.map((role) => {
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
            })}
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
    </div>
  );
}
